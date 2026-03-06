from fastapi import APIRouter, Response, Request
import datetime
import os
import json
import google.generativeai as genai
import uuid
from .models import (
    AdminApprovalRequest, EmployeeUpdate, HolidayRequest, 
    AdminCopilotRequest, PayslipReleaseRequest, AnnouncementRequest,
    OfferLetterRequest, TemplateUploadRequest, LeaveStatusUpdate,
    TemplateSaveRequest
)
from .utils import (
    parse_base64, generate_offer_letter_pdf, 
    generate_html_pdf, analyze_and_convert_template,
    _calculate_employee_salary, get_attendance_calendar
)
from database.mongo_client import mongo_db
from database.s3_client import s3_db
from database.vector_client import vector_db

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/photos/{photo_key:path}")
def get_admin_photo(photo_key: str):
    image_bytes = s3_db.get_image(photo_key)
    if not image_bytes: return Response(status_code=404)
    return Response(content=image_bytes, media_type="image/jpeg")

@router.get("/auth/pending")
def get_pending_employees():
    if mongo_db.users is None: return {"employees": []}
    return {"employees": list(mongo_db.users.find({"status": "pending_approval"}, {"_id": 0, "password": 0}))}

@router.get("/auth/employees")
def get_approved_employees():
    if mongo_db.users is None: return {"employees": []}
    return {"employees": list(mongo_db.users.find({"status": "approved"}, {"_id": 0, "password": 0}))}

@router.post("/auth/approve")
def admin_approve_employee(request: AdminApprovalRequest):
    if mongo_db.users is None: return {"error": "Database unavailable"}
    update_fields = {"status": "rejected"}
    if request.action == "approve":
        update_fields = {
            "status": "approved",
            "employment_type": request.employment_type,
            "position": request.position,
            "monthly_salary": request.monthly_salary,
            "privilege_leave_rate": request.privilege_leave_rate,
            "sick_leave_rate": request.sick_leave_rate,
            "casual_leave_rate": request.casual_leave_rate,
            "joining_date": datetime.datetime.utcnow().isoformat()
        }
    mongo_db.users.update_one({"employee_id": request.employee_id}, {"$set": update_fields})
    return {"message": f"Employee {request.employee_id} updated."}

@router.patch("/employee/{employee_id}")
def update_employee_details(employee_id: str, update: EmployeeUpdate):
    if mongo_db.users is None: return {"error": "Database error"}
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data: return {"message": "No changes provided"}
    result = mongo_db.users.update_one({"employee_id": employee_id}, {"$set": update_data})
    return {"message": "Employee updated"}

@router.get("/reports")
def get_reports_summary():
    today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    total = mongo_db.users.count_documents({"status": "approved"})
    present = mongo_db.attendance.count_documents({"timestamp": {"$regex": f"^{today}"}, "action": "sign_in"})
    on_leave = mongo_db.leaves.count_documents({"status": {"$regex": "Approved"}, "start_date": {"$lte": today}, "end_date": {"$gte": today}})
    return {"total_employees": total, "present_today": present, "on_leave": on_leave, "open_tickets": 12, "average_engagement_score": 88}

@router.post("/holidays")
def add_holiday(request: HolidayRequest):
    record = request.dict(); record["id"] = uuid.uuid4().hex[:8]
    mongo_db.holidays.insert_one(record)
    return {"message": "Holiday added"}

@router.get("/holidays")
def get_holidays():
    return {"holidays": list(mongo_db.holidays.find({}, {"_id": 0}))}

@router.put("/holidays/{old_date}")
def update_holiday(old_date: str, request: HolidayRequest):
    mongo_db.holidays.update_one({"date": old_date}, {"$set": {"date": request.date, "name": request.name, "type": request.type}})
    return {"message": "Updated"}

@router.delete("/holidays/{date}")
def delete_holiday(date: str):
    mongo_db.holidays.delete_one({"date": date})
    return {"message": "Deleted"}

@router.get("/leaves")
def get_all_leaves():
    return {"leaves": list(mongo_db.leaves.find({}, {"_id": 0}))}

@router.put("/leaves/{leave_id}/status")
def update_leave(leave_id: str, update: LeaveStatusUpdate):
    mongo_db.leaves.update_one({"id": leave_id}, {"$set": {"status": update.status}})
    return {"message": "Leave updated"}

@router.post("/announcement")
def update_announcement(request: AnnouncementRequest):
    record = {"title": request.title, "content": request.content, "updated_at": datetime.datetime.utcnow().isoformat()}
    mongo_db.db.announcements.insert_one(record)
    return {"message": "Updated"}

@router.get("/notifications")
def get_admin_notifications():
    return {"notifications": list(mongo_db.db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(20))}

@router.post("/copilot")
def admin_ai_copilot(request: AdminCopilotRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return {"answer": "AI not configured."}
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    context = ""
    try:
        search_results = vector_db.search(query_texts=[request.query], top_k=2)
        for res in search_results: context += f"\nPolicy: {res.get('document', '')}"
    except: pass

    query_lower = request.query.lower()
    if "bank" in query_lower or "salary" in query_lower:
        emps = list(mongo_db.users.find({"status": "approved"}, {"_id":0, "password":0}))
        for emp in emps:
            if emp['name'].lower() in query_lower or emp['employee_id'].lower() in query_lower:
                sal = _calculate_employee_salary(emp['employee_id'])
                context += f"\n- {emp['name']}: Bank: {emp.get('bank_details')}, Salary: {sal}"

    try:
        res = model.generate_content(f"Context: {context}\nAdmin Query: {request.query}")
        return {"answer": res.text}
    except: return {"answer": "AI error."}

@router.get("/attendance")
def get_all_attendance_logs():
    return {"logs": list(mongo_db.attendance.find({}, {"_id": 0}).sort("timestamp", -1).limit(100))}

@router.get("/payslips/preview-list/{month_year}")
def get_payslip_preview_list_v1(month_year: str):
    # Backward compatibility or different view
    employees = list(mongo_db.users.find({"status": "approved"}, {"_id": 0, "password": 0}))
    return {"preview": employees}


@router.post("/payslips/release")
def release_payslip(request: PayslipReleaseRequest):
    mongo_db.payslip_releases.update_one({"month_year": request.month_year}, {"$set": {"released": request.release, "updated_at": datetime.datetime.utcnow().isoformat()}}, upsert=True)
    return {"message": "Status updated"}

@router.post("/payslips/analyze")
def admin_analyze_payslip(request: TemplateUploadRequest):
    analysis = analyze_and_convert_template(request.content_base64, request.file_type, request.employment_type)
    if not analysis: return {"error": "Analysis failed"}
    return {"analysis": analysis}

@router.post("/payslips/template/save")
def admin_save_payslip_template(request: TemplateSaveRequest):
    request.document_type = "Payslip"
    mongo_db.db.templates.update_one(
        {
            "employment_type": request.employment_type,
            "document_type": "Payslip"
        },
        {"$set": {
            "html_template": request.html_template,
            "placeholders": request.placeholders,
            "roi_fields": getattr(request, 'roi_fields', []),
            "updated_at": datetime.datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    return {"message": "Payslip template saved successfully"}

@router.get("/payslips/preview")
def get_payslip_pdf_preview(type: str = "Full-Time"):
    # Dummy data for preview
    dummy_emp = {"name": "Sample Employee", "employee_id": "EMP-DEBUG"}
    dummy_sal = {"gross_salary": 75000, "net_salary": 68000, "deductions": 7000, "tax": 5000, "lop_days": 0}
    
    # Check if a custom template exists
    tpl = mongo_db.db.templates.find_one({"employment_type": type, "document_type": "Payslip"})
    if tpl:
        params = {**dummy_emp, **dummy_sal, "Month_Year": "March 2026"}
        pdf_content = generate_html_pdf(tpl['html_template'], params)
        return Response(content=pdf_content, media_type="application/pdf")
    else:
        # Fallback to legacy PDF generator if available
        from .utils import generate_payslip_pdf
        pdf_content = generate_payslip_pdf(dummy_emp, dummy_sal, "March 2026", {})
        # Starlette Response requires bytes for content
        if isinstance(pdf_content, (bytearray, memoryview)):
            pdf_content = bytes(pdf_content)
        return Response(content=pdf_content, media_type="application/pdf")

@router.get("/payslips/release-preview")
def get_payslip_release_preview_data(month_year: str):
    # Requirement: Interns receive payslips only after 3 months of joining

    employees = list(mongo_db.users.find({"status": "approved"}, {"_id":0, "password":0}))
    release_date = datetime.datetime.strptime(month_year, "%B %Y")
    
    eligible = []
    for emp in employees:
        join_date = datetime.datetime.fromisoformat(emp.get('joining_date'))
        months_since = (release_date.year - join_date.year) * 12 + (release_date.month - join_date.month)
        
        is_eligible = True
        if emp.get('employment_type') == 'Intern' and months_since < 3:
            is_eligible = False
            
        if is_eligible:
            sal = _calculate_employee_salary(emp['employee_id'])
            eligible.append({
                "employee_id": emp['employee_id'],
                "name": emp['name'],
                "employment_type": emp['employment_type'],
                "designation": emp['position'],
                "gross_salary": emp['monthly_salary'],
                "net_salary": sal
            })
    return eligible

@router.post("/templates/upload")
def admin_analyze_template(request: TemplateUploadRequest):
    analysis = analyze_and_convert_template(request.content_base64, request.file_type, request.employment_type)
    if not analysis: return {"error": "Analysis failed"}
    return analysis

@router.post("/templates/save")
def admin_save_template(request: TemplateSaveRequest):
    mongo_db.db.templates.update_one(
        {
            "employment_type": request.employment_type,
            "document_type": request.document_type
        },
        {"$set": {
            "html_template": request.html_template,
            "placeholders": request.placeholders,
            "company_details": request.company_details,
            "updated_at": datetime.datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    return {"message": "Template saved successfully"}

@router.get("/templates")
def admin_get_templates(document_type: str = "Offer Letter"):
    return list(mongo_db.db.templates.find({"document_type": document_type}, {"_id": 0}))

@router.delete("/templates/{type}")
def admin_delete_template(type: str, document_type: str = "Offer Letter"):
    mongo_db.db.templates.delete_one({"employment_type": type, "document_type": document_type})
    return {"message": "Template deleted"}

@router.post("/interns/generate-offer-letter")
def admin_generate_offer_letter(request: OfferLetterRequest):
    # Check if custom template exists
    tpl = mongo_db.db.templates.find_one({"employment_type": request.employment_type})
    
    params = request.dict()
    params["name"] = mongo_db.users.find_one({"employee_id": request.employee_id}).get('name')
    
    # Merge static company details if custom template is used
    if request.template_type == "Custom" and tpl:
        static_details = tpl.get('company_details', {})
        params.update(static_details)
        pdf_content = generate_html_pdf(tpl['html_template'], params)
    else:
        pdf_content = generate_offer_letter_pdf(params)
        
    s3_key = f"offer_letters/{request.employee_id}_draft.pdf"
    s3_db.upload_image(pdf_content, s3_key)
    
    mongo_db.users.update_one({"employee_id": request.employee_id}, {"$set": {"offer_letter_status": "draft", "offer_letter_key": s3_key}})
    return {"message": "Draft generated"}

@router.get("/interns/offer-letter-preview/{emp_id}")
def preview_offer_letter(emp_id: str):
    emp = mongo_db.users.find_one({"employee_id": emp_id})
    if not emp or not emp.get('offer_letter_key'): return Response(status_code=404)
    content = s3_db.get_image(emp['offer_letter_key'])
    return Response(content=content, media_type="application/pdf")

@router.post("/interns/send-offer-letter/{emp_id}")
def send_offer_letter(emp_id: str):
    mongo_db.users.update_one({"employee_id": emp_id}, {"$set": {"offer_letter_status": "sent"}})
    return {"message": "Sent"}

@router.get("/payslips/status")
def get_payslip_release_status():
    return {"releases": list(mongo_db.payslip_releases.find({}, {"_id": 0}))}
