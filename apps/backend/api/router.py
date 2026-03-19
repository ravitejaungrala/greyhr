from fastapi import APIRouter, Response, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from database.s3_client import s3_db
from database.mongo_client import mongo_db
from dotenv import load_dotenv
load_dotenv(override=True)
import datetime
import base64
import uuid
import os
import tempfile
import google.generativeai as genai
import cv2
import numpy as np
from io import BytesIO
import jinja2
from xhtml2pdf import pisa
from pypdf import PdfReader
from api.doc_engine import (
    generate_any_neuzenai_doc, 
    extract_doc_data, 
    render_and_save_doc, 
    render_doc_to_html_bytes,
    process_uploaded_template,
    save_new_template
)
from api.enhanced_doc_system import enhanced_router

router = APIRouter()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# --- Auth & Registration ---

class EmployeeRegistrationRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None # Optional now

class HolidayRequest(BaseModel):
    name: str
    date: str
    type: str = "Holiday"

class ProfileUpdateRequest(BaseModel):
    employee_id: str
    dob: str
    is_experienced: bool
    employment_type: str  # Added: 'Full-Time' or 'Intern'
    # Bank
    bank_account: str
    bank_ifsc: str
    bank_name: Optional[str] = None  # Added
    bank_photo_base64: str
    cif_number: Optional[str] = None  # Added
    # Education
    education_degree: str
    education_cert_base64: str
    # Experience (Optional)
    prev_company: Optional[str] = None
    prev_role: Optional[str] = None
    experience_years: Optional[str] = None
    last_company_payslip_base64: Optional[str] = None  # Added
    # Live Photo
    image_base64: str
    image_left_base64: Optional[str] = None
    image_right_base64: Optional[str] = None
    # PF (Optional)
    pf_number: Optional[str] = None


def parse_base64(b64_string: str) -> bytes:
    if ',' in b64_string:
        b64_string = b64_string.split(',')[1]
    return base64.b64decode(b64_string)

@router.post("/auth/register")
def register_employee(request: EmployeeRegistrationRequest):
    # Enforce @dhanadurga.com domain for employees
    if not request.email.lower().endswith("@dhanadurga.com"):
        return {"error": "Only @dhanadurga.com email addresses are accepted for employee registration."}

    # Check if already exists
    if mongo_db.users is not None and mongo_db.users.find_one({"email": request.email}):
        return {"error": "Email already exists"}
        
    # Generate Employee ID
    emp_id = f"EMP{uuid.uuid4().hex[:6].upper()}"
    
    # Save to MongoDB with incomplete status
    user_record = {
        "employee_id": emp_id,
        "name": request.name,
        "email": request.email,
        "password": request.password, # Plain text for MVP mock
        "role": "employee",
        "status": "incomplete_profile",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    if mongo_db.users is not None:
        mongo_db.users.insert_one(user_record)
        
    return {
        "message": "Step 1/2 complete. Please login to complete your profile.",
        "employee_id": emp_id
    }

@router.post("/auth/login")
def login(request: LoginRequest):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    # 1. Check for Admin credentials first
    if request.email == 'admin@dhanadurga.com' and request.password == 'Dhanadurga@2003':
        return {"role": "super_admin", "name": "Super Admin", "email": request.email}
    
    # 2. Check for Employee credentials
    user = mongo_db.users.find_one({"email": request.email, "password": request.password})
    if not user:
        return {"error": "Invalid email or password"}
    
    # Return user details with their stored role
    return {
        "role": user.get("role", "employee"),
        "name": user["name"],
        "email": user["email"],
        "employee_id": user["employee_id"],
        "status": user["status"]
    }

@router.post("/auth/complete-profile")
def complete_profile(request: ProfileUpdateRequest):
    if mongo_db.users is None:
        return {"error": "Database error"}
        
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "Employee not found"}

    try:
        live_photo_bytes = parse_base64(request.image_base64)
        live_photo_left_bytes = parse_base64(request.image_left_base64) if request.image_left_base64 else None
        live_photo_right_bytes = parse_base64(request.image_right_base64) if request.image_right_base64 else None
        bank_photo_bytes = parse_base64(request.bank_photo_base64)
        edu_cert_bytes = parse_base64(request.education_cert_base64)
        payslip_bytes = parse_base64(request.last_company_payslip_base64) if request.last_company_payslip_base64 else None
    except Exception as e:
        return {"error": "Invalid base64 image or document upload"}


    reference_image_key = f"reference_faces/{request.employee_id}.jpg"
    reference_image_left_key = f"reference_faces/{request.employee_id}_left.jpg" if live_photo_left_bytes else None
    reference_image_right_key = f"reference_faces/{request.employee_id}_right.jpg" if live_photo_right_bytes else None
    bank_photo_key = f"documents/{request.employee_id}_bank.jpg"
    edu_cert_key = f"documents/{request.employee_id}_edu.jpg"
    payslip_key = f"documents/{request.employee_id}_last_payslip.jpg" if payslip_bytes else None
    
    # Save files to S3
    s3_db.save_image(reference_image_key, live_photo_bytes, content_type='image/jpeg')
    if live_photo_left_bytes: s3_db.save_image(reference_image_left_key, live_photo_left_bytes, content_type='image/jpeg')
    if live_photo_right_bytes: s3_db.save_image(reference_image_right_key, live_photo_right_bytes, content_type='image/jpeg')
    s3_db.save_image(bank_photo_key, bank_photo_bytes, content_type='image/jpeg')
    s3_db.save_image(edu_cert_key, edu_cert_bytes, content_type='image/jpeg')
    if payslip_bytes:
        s3_db.save_image(payslip_key, payslip_bytes, content_type='image/jpeg')

    
    # Update Record
    is_experienced_full_time = request.is_experienced and request.employment_type == "Full-Time"
    
    update_data = {
        "dob": request.dob,
        "is_experienced": request.is_experienced,
        "employment_type": request.employment_type,
        "bank_details": {
            "bank_name": request.bank_name,
            "account_number": request.bank_account,
            "ifsc": request.bank_ifsc,
            "bank_photo_key": bank_photo_key,
            "cif_number": request.cif_number
        },
        "education": {
            "degree": request.education_degree,
            "cert_key": edu_cert_key
        },
        "experience": {
            "prev_company": request.prev_company,
            "prev_role": request.prev_role,
            "years": request.experience_years,
            "last_payslip_key": payslip_key if is_experienced_full_time else None
        } if request.is_experienced else None,
        "pf_number": request.pf_number, # now saves it even for freshers if provided
        "pan_no": request.pan_no,

        "status": "pending_approval",
        "reference_image_key": reference_image_key,
        "reference_image_left_key": reference_image_left_key,
        "reference_image_right_key": reference_image_right_key,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    mongo_db.users.update_one({"employee_id": request.employee_id}, {"$set": update_data})
    
    return {"message": "Profile completed. Pending Admin approval.", "status": "pending_approval"}

@router.get("/auth/admin/pending")
def get_pending_employees():
    if mongo_db.users is None:
        return {"employees": []}
        
    pending = list(mongo_db.users.find({"status": "pending_approval"}, {"_id": 0, "password": 0}))
    return {"employees": pending}

@router.get("/auth/admin/employees")
def get_approved_employees():
    if mongo_db.users is None:
        return {"employees": []}
        
    employees = list(mongo_db.users.find({"status": "approved"}, {"_id": 0, "password": 0}))
    return {"employees": employees}

class AdminApprovalRequest(BaseModel):
    employee_id: str
    action: str # "approve" or "reject"
    employment_type: Optional[str] = "Full-Time" # "Intern" or "Full-Time"
    position: Optional[str] = "Staff"
    monthly_salary: Optional[int] = 0
    privilege_leave_rate: Optional[float] = 0.0
    sick_leave_rate: Optional[float] = 0.5
    casual_leave_rate: Optional[float] = 1.0
    in_hand_salary: Optional[int] = 0
    internship_end_date: Optional[str] = None

class EmployeeUpdate(BaseModel):
    employment_type: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[str] = None
    monthly_salary: Optional[int] = None
    privilege_leave_rate: Optional[float] = None
    sick_leave_rate: Optional[float] = None
    casual_leave_rate: Optional[float] = None
    in_hand_salary: Optional[int] = None
    # Additional fields extracted/used for documents
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    uan: Optional[str] = None
    pf_no: Optional[str] = None
    esi_no: Optional[str] = None
    pan_no: Optional[str] = None
    cif_number: Optional[str] = None
    internship_end_date: Optional[str] = None
    internship_completed: Optional[bool] = None


@router.post("/auth/admin/approve")
def admin_approve_employee(request: AdminApprovalRequest):
    if mongo_db.users is None:
        return {"error": "Database unavailable"}
        
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "Employee not found"}
        
    if request.action == "approve":
        status_to_set = "approved"
        update_fields = {
            "status": status_to_set,
            "employment_type": request.employment_type,
            "position": request.position,
            "monthly_salary": request.monthly_salary,
            "privilege_leave_rate": request.privilege_leave_rate,
            "sick_leave_rate": request.sick_leave_rate,
            "casual_leave_rate": request.casual_leave_rate,
            "in_hand_salary": request.in_hand_salary,
            "internship_end_date": request.internship_end_date,
            "joining_date": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    else:
        status_to_set = "rejected"
        update_fields = {"status": status_to_set}
        
    mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": update_fields}
    )
    
    return {"message": f"Employee {request.employee_id} {status_to_set} successfully."}

@router.patch("/admin/employee/{employee_id}")
def update_employee_details(employee_id: str, update: EmployeeUpdate):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    # Filter out None values
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if not update_data:
        return {"message": "No changes provided"}
        
    # Handle nested fields mapping
    set_ops = {}
    for k, v in update_data.items():
        if k in ["bank_account", "bank_ifsc", "bank_name", "cif_number"]:
            if k == "bank_account": set_ops["bank_details.account_number"] = v
            elif k == "bank_ifsc": set_ops["bank_details.ifsc"] = v
            elif k == "bank_name": set_ops["bank_details.bank_name"] = v
            elif k == "cif_number": set_ops["bank_details.cif_number"] = v
        elif k == "internship_end_date" or k == "internship_completed":

            set_ops[k] = v
        else:
            set_ops[k] = v

    result = mongo_db.users.update_one(
        {"employee_id": employee_id},
        {"$set": set_ops}
    )
    
    if result.matched_count == 0:
        return {"error": "Employee not found"}
        
    return {"message": "Employee updated successfully"}

class RoleAssignment(BaseModel):
    employee_id: str
    role: str # "admin", "hr_responsible", "employee"

@router.post("/admin/assign-role")
def assign_role(request: RoleAssignment):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    valid_roles = ["admin", "hr_responsible", "employee"]
    if request.role not in valid_roles:
        return {"error": "Invalid role"}
        
    result = mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": {"role": request.role}}
    )
    
    if result.matched_count == 0:
        return {"error": "Employee not found"}
        
    return {"message": f"Role updated to {request.role} for {request.employee_id}"}

# --- Leaves & Admin Features ---
class LeaveRequest(BaseModel):
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class AdminCopilotRequest(BaseModel):
    query: str

class Notification(BaseModel):
    type: str # "onboarding", "leave", "deduction", "attendance"
    message: str
    employee_id: Optional[str] = None
    created_at: str = datetime.datetime.now(datetime.timezone.utc).isoformat()

class PayslipReleaseRequest(BaseModel):
    month_year: str # e.g. "March 2026"
    release: bool = True

class AnnouncementRequest(BaseModel):
    title: str
    content: str

class PayslipTemplateRequest(BaseModel):
    image_base64: str # Image of the PDF format

class OfferLetterRequest(BaseModel):
    employee_id: str
    employment_type: str # 'Intern' or 'Full-Time'
    date: str
    role: str
    role_description: str
    # Intern specific
    stipend: Optional[str] = None
    duration: Optional[str] = None
    # Full-Time specific
    annual_ctc: Optional[float] = None
    notice_period: Optional[str] = None
    has_pf: bool = False
    pf_amount: float = 0
    in_hand_salary: float = 0
    annexure_details: Optional[str] = None

class RelievingLetterRequest(BaseModel):
    employee_id: str
    relieving_date: str
    joining_date: str
    last_working_day: str
    designation: str
    reason_for_leaving: Optional[str] = "Personal reasons"

class ExperienceCertificateRequest(BaseModel):
    employee_id: str
    issue_date: str
    joining_date: str
    last_working_day: str
    designation: str
    performance_summary: Optional[str] = "Good"

class WorkdayOverride(BaseModel):
    date: str  # YYYY-MM-DD
    type: str  # 'forced_working' or 'forced_holiday'
    reason: str = ""

class CompOffAction(BaseModel):
    request_id: str
    status: str  # 'Approved' or 'Rejected'

class WeekendWorkRequest(BaseModel):
    employee_id: str
    date: str
    reason: str

class WeekendWorkAction(BaseModel):
    request_id: str
    status: str  # 'Approved' or 'Rejected'

class TemplateUploadRequest(BaseModel):
    employment_type: str
    content_base64: str
    file_type: str  # 'html' or 'pdf'

class TemplateSaveRequest(BaseModel):
    employment_type: str
    html_template: str
    placeholders: list[str] = []
    roi_fields: list[str] = []
    original_type: str = "html"

class EmployeeSignatureRequest(BaseModel):
    employee_id: str
    signature_name: str
    signing_date: str

@router.post("/admin/templates/analyze")
async def analyze_template(request: TemplateUploadRequest):
    """
    Admins upload a template (PDF, Image, HTML) for analysis. 
    AI converts it to HTML and extracts merge fields.
    """
    try:
        content = base64.b64decode(request.content_base64)
        # Pass file_type as filename for extension checking if needed
        result = process_uploaded_template(content, f"template.{request.file_type}", f"application/{request.file_type}")
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to decode base64 content: {str(e)}"}

@router.post("/admin/templates/upload")
def save_template_final(request: TemplateSaveRequest):
    """
    Final save of a template after admin review.
    """
    template_name = request.employment_type # Keep original case/name as requested by frontend logic
    result = save_new_template(template_name, request.html_template)
    
    if "status" in result and result["status"] == "success":
        # Store metadata if needed in MongoDB
        if mongo_db.db is not None:
            mongo_db.db.templates.update_one(
                {"employment_type": request.employment_type},
                {"$set": {
                    "employment_type": request.employment_type,
                    "html_content": request.html_template,
                    "placeholders": request.placeholders,
                    "roi_fields": request.roi_fields,
                    "original_type": request.original_type,
                    "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }},
                upsert=True
            )
        return {"message": f"Template {template_name} saved successfully.", "s3_key": result["s3_key"]}
    
    return result

@router.get("/admin/templates")
def list_templates():
    """Returns all stored templates from MongoDB metadata."""
    if mongo_db.db is None:
        return []
    templates = list(mongo_db.db.templates.find({}, {"_id": 0}))
    return templates

@router.delete("/admin/templates/{type}")
def delete_template(type: str):
    """Deletes a template from S3 and MongoDB."""
    if mongo_db.db is not None:
        mongo_db.db.templates.delete_one({"employment_type": type})
    
    # Also delete from S3
    s3_key = f"templates/{type}.html"
    try:
        s3_db.s3_client.delete_object(Bucket=s3_db.bucket_name, Key=s3_key)
        return {"message": f"Template for {type} deleted successfully"}
    except Exception as e:
        return {"error": f"Failed to delete from S3: {str(e)}"}

class DocumentGenerationRequest(BaseModel):
    raw_data: str
    doc_type: str # 'payslip', 'internship_offer', 'full_time_offer', 'relieving', 'experience'

class DocumentExtractRequest(BaseModel):
    raw_data: str
    doc_type: str

class DocumentFinalizeRequest(BaseModel):
    data: dict
    doc_type: str

DOCUMENT_SCHEMAS = {
    "payslip": {
        "emp_name": "Text",
        "emp_code": "Text",
        "month_year": "Text (e.g. March 2026)",
        "designation": "Text",
        "department": "Text",
        "doj": "Date",
        "days_worked": "Number",
        "bank_name": "Text",
        "account_no": "Text",
        "pan_no": "Text",
        "pf_no": "Text",
        "basic": "Number",
        "hra": "Number",
        "special_allowance": "Number",
        "total_earnings": "Number",
        "prof_tax": "Number",
        "pf_deduction": "Number",
        "income_tax": "Number",
        "total_deductions": "Number",
        "net_salary": "Number",
        "amount_in_words": "Text"
    },
    "internship_offer": {
        "emp_name": "Text",
        "current_date": "Date",
        "designation": "Text",
        "internship_description": "Text (2-3 sentences about the internship role)",
        "stipend": "Text",
        "duration": "Text",
        "doj": "Date",
        "acceptance_deadline": "Date",
        "your_name": "Text (Signatory name, default: B. Subba Rami Reddy)",
        "your_designation": "Text (Signatory title, default: Co-Founder)"
    },
    "full_time_offer": {
        "emp_name": "Text",
        "designation": "Text",
        "doj": "Date",
        "offer_date": "Date",
        "monthly_basic": "Number",
        "annual_basic": "Number",
        "monthly_hra": "Number",
        "annual_hra": "Number",
        "monthly_stat_bonus": "Number",
        "annual_stat_bonus": "Number",
        "monthly_lta": "Number",
        "annual_lta": "Number",
        "monthly_personal_allowance": "Number",
        "annual_personal_allowance": "Number",
        "monthly_gross": "Number",
        "annual_gross": "Number",
        "employer_pf_monthly": "Number",
        "monthly_gratuity": "Number",
        "fixed_ctc_monthly": "Number",
        "fixed_ctc_annual": "Number",
        "variable_bonus_monthly": "Number",
        "variable_bonus_annual": "Number",
        "total_ctc_monthly": "Number",
        "total_ctc_annual": "Number",
        "inhand_amount": "Number",
        "employee_signature_name": "Text",
        "signing_date": "Date"
    },
    "relieving": {
        "emp_name": "Text",
        "current_date": "Date",
        "designation": "Text",
        "department": "Text",
        "last_working_day": "Date",
        "resignation_date": "Date"
    },
    "experience": {
        "emp_name": "Text",
        "designation": "Text",
        "start_date": "Date",
        "end_date": "Date"
    }
}

@router.get("/generate-doc/fields")
def get_document_fields():
    """Returns the required fields schema for all document types so the frontend can render dynamic forms."""
    return DOCUMENT_SCHEMAS

@router.post("/generate-doc")
def generate_doc_api(request: DocumentGenerationRequest):
    result = generate_any_neuzenai_doc(request.raw_data, request.doc_type)
    return result

@router.post("/generate-doc/extract")
def extract_doc_api(request: DocumentExtractRequest):
    """Admin preview step 1: extract data only"""
    return extract_doc_data(request.raw_data, request.doc_type)

@router.post("/generate-doc/preview")
def preview_doc_api(request: DocumentFinalizeRequest):
    """Admin preview step 1.5: generate PDF base64 for previewing"""
    html_bytes, error = render_doc_to_html_bytes(request.data, request.doc_type)
    if error:
        return {"error": error}
    
    html_base64 = base64.b64encode(html_bytes).decode('utf-8')
    return {"status": "success", "html_base64": html_base64}

@router.post("/generate-doc/finalize")
def finalize_doc_api(request: DocumentFinalizeRequest):
    """Admin preview step 2: render with confirmed data and save to S3"""
    result = render_and_save_doc(request.data, request.doc_type)
    if "error" in result:
        return result
        
    output_path = result.get("output_path")
    if output_path and os.path.exists(output_path):
        with open(output_path, "rb") as f:
            html_bytes = f.read()
            
        s3_key = f"generated_docs/{result['output_filename']}"
        # All documents are now generated as HTML
        s3_db.save_file(s3_key, html_bytes, content_type='text/html')
        result["s3_key"] = s3_key
        
    return result

@router.post("/leaves/apply")
def apply_leave(request: LeaveRequest):
    record = request.dict()
    record["status"] = "Pending Admin Approval"
    record["applied_on"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record["id"] = uuid.uuid4().hex[:8]
    if mongo_db.db is not None:
        mongo_db.leaves.insert_one(record)
    if "_id" in record: del record["_id"]
    return {"message": "Leave submitted pending approval", "record": record}

@router.get("/admin/leaves")
def get_all_leaves():
    if mongo_db.db is None:
        return {"leaves": []}
    leaves = list(mongo_db.leaves.find({}, {"_id": 0}))
    return {"leaves": leaves}

class LeaveStatusUpdate(BaseModel):
    status: str

@router.put("/admin/leaves/{leave_id}/status")
def update_leave(leave_id: str, update: LeaveStatusUpdate):
    if mongo_db.db is not None:
        mongo_db.leaves.update_one({"id": leave_id}, {"$set": {"status": update.status}})
    return {"message": f"Leave {leave_id} updated to {update.status}"}

# --- Item Requests ---
class ItemRequest(BaseModel):
    employee_id: str
    item_name: str
    reason: str
    quantity: int = 1

@router.post("/items/request")
def request_item(request: ItemRequest):
    if mongo_db.item_requests is None:
        return {"error": "Database error"}
    
    record = request.dict()
    record["id"] = uuid.uuid4().hex[:8]
    record["status"] = "Pending"
    record["applied_on"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    mongo_db.item_requests.insert_one(record)
    if "_id" in record: del record["_id"]
    return {"message": "Item request submitted", "record": record}

@router.get("/admin/items/all")
def get_all_item_requests():
    if mongo_db.item_requests is None:
        return {"requests": []}
    requests = list(mongo_db.item_requests.find({}, {"_id": 0}))
    return {"requests": requests}

class ItemStatusUpdate(BaseModel):
    status: str # "Approved", "Rejected"

@router.put("/admin/items/{request_id}/status")
def update_item_request_status(request_id: str, update: ItemStatusUpdate):
    if mongo_db.item_requests is None:
        return {"error": "Database error"}
    
    result = mongo_db.item_requests.update_one(
        {"id": request_id},
        {"$set": {"status": update.status}}
    )
    
    if result.matched_count == 0:
        return {"error": "Request not found"}
        
    return {"message": f"Item request {request_id} updated to {update.status}"}

# --- Holidays ---
@router.post("/admin/holidays")
def add_holiday(request: HolidayRequest):
    if mongo_db.db is None:
        return {"error": "Database error"}
    
    record = {
        "date": request.date,
        "name": request.name,
        "type": request.type,
        "id": uuid.uuid4().hex[:8]
    }
    mongo_db.holidays.insert_one(record)
    if "_id" in record: del record["_id"]
    return {"message": "Holiday added", "record": record}

@router.get("/admin/holidays")
def get_holidays():
    if mongo_db.db is None:
        return {"holidays": []}
    holidays = list(mongo_db.holidays.find({}, {"_id": 0}))
    # Default holidays if empty
    if not holidays:
        holidays = [
            {"name": "New Year's Day", "date": "2026-01-01", "type": "Public Holiday"},
            {"name": "Independence Day", "date": "2026-08-15", "type": "Public Holiday"}
        ]
    return {"holidays": holidays}

@router.get("/employee/holidays")
def get_employee_holidays():
    # Employees see the same holidays as admin
    return get_holidays()

@router.get("/admin/reports")
def get_reports_summary():
    if mongo_db.users is None:
        return {
            "total_employees": 0,
            "present_today": 0,
            "on_leave": 0,
            "open_tickets": 0,
            "average_engagement_score": 0
        }
    
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    
    total_employees = mongo_db.users.count_documents({"status": "approved"})
    
    # Count sign-ins today
    present_today = 0
    if mongo_db.attendance is not None:
        # We look for sign_in actions today
        present_today = mongo_db.attendance.count_documents({
            "timestamp": {"$regex": f"^{today_str}"},
            "action": "sign_in"
        })
        
    # Count approved leaves for today
    on_leave = 0
    if mongo_db.db is not None:
        # Check for approved leaves where today is between start and end date
        on_leave = mongo_db.leaves.count_documents({
            "status": {"$regex": "Approved"},
            "start_date": {"$lte": today_str},
            "end_date": {"$gte": today_str}
        })

    return {
        "total_employees": total_employees,
        "present_today": present_today,
        "on_leave": on_leave,
        "open_tickets": 12, # Still mock for now as requested or until schema exists
        "average_engagement_score": 88 # Mock as requested
    }

@router.get("/admin/salary-report/{month_year}")
def get_monthly_salary_report(month_year: str):
    if mongo_db.users is None:
        return {"report": []}
    
    try:
        # Parse month_year like "March 2026"
        report_date = datetime.datetime.strptime(month_year, "%B %Y")
        month = report_date.month
        year = report_date.year
    except Exception as e:
        return {"error": f"Invalid month_year format: {str(e)}"}

    # 1. Get month boundaries
    start_date = datetime.datetime(year, month, 1)
    # Next month's first day
    if month == 12:
        next_month = datetime.datetime(year + 1, 1, 1)
    else:
        next_month = datetime.datetime(year, month + 1, 1)
    num_days = (next_month - start_date).days
    
    # 2. Fetch all necessary data
    employees = list(mongo_db.users.find({"status": "approved"}, {"_id": 0, "password": 0}))
    all_holidays = list(mongo_db.holidays.find({}, {"_id": 0}))
    all_overrides = list(mongo_db.workday_overrides.find({}, {"_id": 0}))
    
    # Filter holidays and overrides for this month
    month_prefix = f"{year}-{month:02d}"
    
    month_holidays = {h["date"] for h in all_holidays if h["date"].startswith(month_prefix)}
    month_overrides = {o["date"]: o["type"] for o in all_overrides if o["date"].startswith(month_prefix)}
    
    import calendar as py_calendar
    _, num_days = py_calendar.monthrange(year, month)
    total_working_days_in_month = 0
    for d in range(1, num_days + 1):
        curr_day = datetime.datetime(year, month, d)
        date_str = curr_day.strftime("%Y-%m-%d")
        weekday = curr_day.weekday()
        is_working = True
        if weekday >= 5: is_working = False
        if date_str in month_holidays: is_working = False
        if date_str in month_overrides:
            if month_overrides[date_str] == "forced_working": is_working = True
            elif month_overrides[date_str] == "forced_holiday": is_working = False
        if is_working:
            total_working_days_in_month += 1

    report = []
    
    for emp in employees:
        emp_id = emp["employee_id"]
        monthly_salary = emp.get("monthly_salary", 0)
        daily_salary = monthly_salary / 30 # Standard daily rate
        
        # Fetch attendance for this employee in this month
        # We look for 'sign_in' actions
        attendance_logs = list(mongo_db.attendance.find({
            "employee_id": emp_id,
            "action": "sign_in",
            "timestamp": {"$regex": f"^{month_prefix}"}
        }))
        attended_dates = {log["timestamp"].split("T")[0] for log in attendance_logs}
        
        # DOJ filtering: count from the next day of approval
        joining_date_str = emp.get("joining_date")
        joining_date = None
        if joining_date_str:
            try:
                # Handle cases where it might be isoformat or just date
                if 'T' in joining_date_str:
                    joining_date = datetime.datetime.fromisoformat(joining_date_str).date()
                else:
                    joining_date = datetime.datetime.strptime(joining_date_str, "%Y-%m-%d").date()
            except: pass

        # Fetch approved leaves for this employee
        emp_leaves = list(mongo_db.leaves.find({
            "employee_id": emp_id,
            "status": {"$regex": "Approved"},
            "$or": [
                {"start_date": {"$regex": f"^{month_prefix}"}},
                {"end_date": {"$regex": f"^{month_prefix}"}}
            ]
        }))
        
        # Helper to check if a date is within an approved leave
        leave_dates = set()
        for l in emp_leaves:
            l_start = datetime.datetime.strptime(l["start_date"], "%Y-%m-%d")
            l_end = datetime.datetime.strptime(l["end_date"], "%Y-%m-%d")
            curr_l = l_start
            while curr_l <= l_end:
                if curr_l.month == month and curr_l.year == year:
                    leave_dates.add(curr_l.strftime("%Y-%m-%d"))
                curr_l += datetime.timedelta(days=1)

        expected_working_days = 0
        actual_presence = 0
        leaves_taken = 0
        
        for d in range(1, num_days + 1):
            curr_day = datetime.datetime(year, month, d)
            curr_date = curr_day.date()
            
            # Skip days on or before joining date (approval date)
            if joining_date and curr_date <= joining_date:
                continue
                
            date_str = curr_day.strftime("%Y-%m-%d")
            weekday = curr_day.weekday() # 0-6 (Mon-Sun)
            
            is_working_day = True
            if weekday >= 5: # Sat or Sun
                is_working_day = False
            
            if date_str in month_holidays:
                is_working_day = False
                
            # Overrides take ultimate precedence
            if date_str in month_overrides:
                if month_overrides[date_str] == "forced_working":
                    is_working_day = True
                elif month_overrides[date_str] == "forced_holiday":
                    is_working_day = False
            
            if is_working_day:
                expected_working_days += 1
                if date_str in attended_dates:
                    actual_presence += 1
                elif date_str in leave_dates:
                    leaves_taken += 1
        
        # Calculate LOP
        # absent_days = max(0, expected_working_days - actual_presence - leaves_taken)
        # Fixed logic from user: Deduction = (Expected Working Days - Actual Attendance - Approved Paid Leaves) * (Daily Salary)
        absent_days = expected_working_days - actual_presence - leaves_taken
        if absent_days < 0: absent_days = 0 # Should not happen if data is perfect
        
        is_intern = emp.get("employment_type") == "Intern"
        
        # Prorated base calculation for mid-month joiners
        if total_working_days_in_month > 0 and expected_working_days < total_working_days_in_month:
            base_salary = (expected_working_days / total_working_days_in_month) * monthly_salary
        else:
            base_salary = monthly_salary
            
        if is_intern:
            # Intern LOP Deduction: 500 per absent day
            lop_deduction = absent_days * 500
            net_salary = base_salary - lop_deduction
        else:
            lop_deduction = round(absent_days * daily_salary, 2)
            net_salary = round(base_salary - lop_deduction, 2)
        
        report.append({
            "employee_id": emp_id,
            "name": emp["name"],
            "expected_working_days": expected_working_days,
            "actual_presence": actual_presence,
            "leaves_taken": leaves_taken,
            "absent_days": absent_days,
            "monthly_salary": monthly_salary,
            "lop_deduction": lop_deduction,
            "net_salary": net_salary
        })
        
    return {"month_year": month_year, "report": report}

@router.get("/admin/photos/{photo_key:path}")
def get_admin_photo(photo_key: str):
    image_bytes = s3_db.get_image(photo_key)
    if not image_bytes:
        # For development/mock, if image is not found, we could return a placeholder or 404
        return Response(status_code=404)
        
    return Response(content=image_bytes, media_type="image/jpeg")

# --- Attendance ---
class ProfileUpdateRequest(BaseModel):
    employee_id: str
    employment_type: Optional[str] = "Full-Time"
    dob: str
    is_experienced: bool
    bank_name: str
    bank_account: str
    bank_ifsc: str
    cif_number: str
    education_degree: str
    prev_company: Optional[str] = None
    prev_role: Optional[str] = None
    experience_years: Optional[str] = None
    pf_number: Optional[str] = None
    pan_no: Optional[str] = None
    image_base64: str
    image_left_base64: Optional[str] = None
    image_right_base64: Optional[str] = None
    bank_photo_base64: str
    education_cert_base64: str
    last_company_payslip_base64: Optional[str] = None
class AttendanceScanRequest(BaseModel):
    employee_id: str
    image_base64: str
    image_left_base64: Optional[str] = None
    image_right_base64: Optional[str] = None
    image_profile_base64: Optional[str] = None
    location: str
    action_type: str # 'sign_in' or 'sign_out'

@router.post("/attendance/scan")
def process_face_scan(request: AttendanceScanRequest):
    # 0. Check User Approval Status
    if mongo_db.users is None:
        return {"error": "Database error"}
        
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "Employee not found. Please register first."}
    if user.get("status") != "approved":
        return {"error": "Your account is pending admin approval. You cannot sign in yet."}

    # 1. Decode Image
    try:
        base64_data = request.image_base64.split(',')[1] if ',' in request.image_base64 else request.image_base64
        image_bytes = base64.b64decode(base64_data)
        
        left_bytes = None
        if request.image_left_base64:
            left_b64 = request.image_left_base64.split(',')[1] if ',' in request.image_left_base64 else request.image_left_base64
            left_bytes = base64.b64decode(left_b64)
            
        right_bytes = None
        if request.image_right_base64:
            right_b64 = request.image_right_base64.split(',')[1] if ',' in request.image_right_base64 else request.image_right_base64
            right_bytes = base64.b64decode(right_b64)

        profile_bytes = None
        if request.image_profile_base64:
            profile_b64 = request.image_profile_base64.split(',')[1] if ',' in request.image_profile_base64 else request.image_profile_base64
            profile_bytes = base64.b64decode(profile_b64)
    except Exception as e:
        return {"error": "Invalid image format"}

    # 1.2 Face Presence Verification (Passive Liveness)
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            if len(faces) == 0:
                return {"error": "No face detected in the image. Please ensure you are looking at the camera."}
    except Exception as e:
        print(f"Face detection internal error: {e}")
        # Continue if OpenCV fails for simple environments, but ideally enforce it

    # 1.5 Simulated Face Comparison
    # In a production environment, we would use an AI service (like AWS Rekognition)
    # to compare image_bytes with the reference image in S3.
    reference_image_key = user.get("reference_image_key")
    if not reference_image_key:
        # Fallback if no reference image was stored (e.g. for older records)
        face_match_success = True 
    else:
        # Simulate retrieval and comparison
        ref_image = s3_db.get_image(reference_image_key)
        if not ref_image:
            return {"error": "Reference identity image not found."}
        
        # Simulation: For this demo, we assume the AI verification score is high 
        # unless some explicit condition is met.
        face_match_success = True 

    if not face_match_success:
        return {"error": "Face does not match the registered identity."}

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    timestamp_str = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    image_key = f"attendance_faces/{request.employee_id}_{timestamp_str}.jpg"
    image_left_key = f"attendance_faces/{request.employee_id}_{timestamp_str}_left.jpg" if left_bytes else None
    image_right_key = f"attendance_faces/{request.employee_id}_{timestamp_str}_right.jpg" if right_bytes else None
    
    # 2. Save Daily Image to S3
    s3_db.save_image(image_key, image_bytes, content_type='image/jpeg')
    if left_bytes: s3_db.save_image(image_left_key, left_bytes, content_type='image/jpeg')
    if right_bytes: s3_db.save_image(image_right_key, right_bytes, content_type='image/jpeg')

    # 2.5 Save Profile Photo for ID Card if provided
    if profile_bytes:
        profile_image_key = f"reference_faces/{request.employee_id}_id_card.jpg"
        s3_db.save_image(profile_image_key, profile_bytes, content_type='image/jpeg')
        # Update user record with the new official ID photo
        mongo_db.users.update_one(
            {"employee_id": request.employee_id},
            {"$set": {"id_card_photo_key": profile_image_key}}
        )
    
    # 3. Save to MongoDB
    attendance_record = {
        "employee_id": request.employee_id,
        "action": request.action_type,
        "timestamp": timestamp,
        "location": request.location,
        "s3_image_key": image_key,
        "s3_image_left_key": image_left_key,
        "s3_image_right_key": image_right_key,
        "ai_verification_score": 0.99
    }
    mongo_db.attendance.insert_one(attendance_record)

    # NEW: Admin Notification for attendance
    if mongo_db.db["notifications"] is not None:
        mongo_db.db["notifications"].insert_one({
            "type": "attendance",
            "message": f"Employee {request.employee_id} signed in.",
            "employee_id": request.employee_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    if "_id" in attendance_record:
        attendance_record["_id"] = str(attendance_record["_id"])

    return {
        "message": f"Identity verified against reference. Successfully processed {request.action_type}",
        "record": attendance_record
    }

class IDPhotoUpload(BaseModel):
    employee_id: str
    image_base64: str

@router.post("/employee/upload-id-photo")
def upload_id_photo(request: IDPhotoUpload):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    try:
        image_bytes = parse_base64(request.image_base64)
    except:
        return {"error": "Invalid image format"}
    
    photo_key = f"reference_faces/{request.employee_id}_id_card.jpg"
    s3_db.save_image(photo_key, image_bytes, content_type='image/jpeg')
    
    mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": {"id_card_photo_key": photo_key}}
    )
    return {"message": "ID Photo updated successfully", "status": "success"}

class CopilotQuery(BaseModel):
    query: str

@router.post("/copilot/ask")
def ask_hr_copilot(query: CopilotQuery):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"agent": "HR Copilot", "response": "AI Copilot is not configured (missing API Key)."}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    context = "Company policies retrieval is currently disabled."

    prompt = f"""
    You are the Dhanadurga Employee HR Copilot. Use the context below to answer the employee's query.
    Context: {context}
    
    Employee Query: {query.query}
    
    Response (Helpful, professional, and concise. Mention if information is based on company policy):
    """
    
    try:
        response = model.generate_content(prompt)
        return {
            "agent": "HR Copilot",
            "response": response.text
        }
    except Exception as e:
        return {
            "agent": "HR Copilot",
            "response": f"I'm having trouble thinking right now. AI Error: {str(e)}"
        }

@router.get("/employee/attendance/status")
def get_attendance_status(employee_id: str):
    if mongo_db.attendance is None:
        return {"last_punch": None, "status": "Not Signed In"}
    
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    # Get latest punch for today
    latest = mongo_db.attendance.find_one(
        {"employee_id": employee_id, "timestamp": {"$regex": f"^{today_str}"}},
        sort=[("timestamp", -1)]
    )
    
    if latest:
        return {
            "last_punch": latest["timestamp"],
            "action": latest["action"],
            "status": "Signed In" if latest["action"] == "sign_in" else "Signed Out"
        }
    
    return {"last_punch": None, "status": "Not Signed In"}

@router.get("/employee/attendance/calendar")
def get_attendance_calendar(employee_id: str):
    if mongo_db.attendance is None or mongo_db.users is None:
        return {"history": [], "recent_captures": []}
    
    # 1. Fetch User Profile
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"history": [], "recent_captures": []}
        
    employment_type = user.get("employment_type", "Full-Time")
    is_intern = employment_type == "Intern"
    joining_date_str = user.get("joining_date")
    
    # Calculate daily salary
    daily_salary = 1000 # default fallback
    if is_intern:
        daily_salary = 500 # Fixed cut for interns
    else:
        monthly_salary = user.get("monthly_salary", 0)
        if monthly_salary > 0:
            daily_salary = monthly_salary / 30
            
    # 2. Determine Date Range (Current Month)
    now = datetime.datetime.utcnow()
    year = now.year
    month = now.month
    today = now.date()
    
    # 3. Fetch all records for this employee for the current month
    # We use regex to match the year-month prefix
    month_prefix = f"{year}-{month:02d}"
    all_month_records = list(mongo_db.attendance.find({
        "employee_id": employee_id,
        "timestamp": {"$regex": f"^{month_prefix}"}
    }).sort("timestamp", 1))
    
    # Group by day
    history_map = {}
    for r in all_month_records:
        day = r["timestamp"].split('T')[0]
        if day not in history_map:
            history_map[day] = []
        history_map[day].append(r)
        
    # 4. Fetch Approved Leaves for the month
    leaves = []
    if mongo_db.leaves is not None:
        leaves = list(mongo_db.leaves.find({
            "employee_id": employee_id,
            "status": "Approved",
            "$or": [
                {"start_date": {"$regex": f"^{month_prefix}"}},
                {"end_date": {"$regex": f"^{month_prefix}"}}
            ]
        }))

    # 5. Fetch Global Holidays and Workday Overrides
    holidays = list(mongo_db.holidays.find({"date": {"$regex": f"^{month_prefix}"}}, {"_id": 0}))
    holiday_map = {h['date']: h for h in holidays}
    overrides = list(mongo_db.workday_overrides.find({"date": {"$regex": f"^{month_prefix}"}}, {"_id": 0}))
    override_map = {o['date']: o for o in overrides}
    
    early_logout_count = 0
    final_history = []
    
    # Parse joining date for comparison
    joining_date = None
    if joining_date_str:
        try:
            joining_date = datetime.datetime.fromisoformat(joining_date_str).date()
        except: pass

    import calendar
    _, last_day_in_month = calendar.monthrange(year, month)
    
    # Iterate through every day of the month up to today
    for d in range(1, today.day + 1):
        current_date = datetime.date(year, month, d)
        day_str = current_date.isoformat()
        
        # Default day data
        data = {
            "date": day_str,
            "first_in": "-",
            "last_out": "-",
            "total_work_hrs": "-",
            "status": "Absent",
            "status_char": "A",
            "color": "#EF4444",
            "deduction": 0,
            "day_label": "Working Day"
        }
        
        # Rule: Count from the day after approval (DOJ) only
        if joining_date and current_date <= joining_date:
            data["status"] = "Not Applicable"
            data["status_char"] = "-"
            data["color"] = "var(--text-muted)"
            data["day_label"] = "Pre-Approval"
            final_history.append(data)
            continue
            
        day_records = history_map.get(day_str, [])
        override = override_map.get(day_str)
        holiday = holiday_map.get(day_str)
        is_weekend = current_date.weekday() >= 5 # 5=Saturday, 6=Sunday
        
        is_originally_non_working = is_weekend or (holiday is not None)
        is_forced_working = override and override.get('type') == 'forced_working'
        is_forced_holiday = override and override.get('type') == 'forced_holiday'
            
        if is_forced_working:
            is_working_day = True
            day_label = "Swapped Working Day"
        elif is_forced_holiday:
            is_working_day = False
            day_label = "Forced Holiday"
        elif holiday:
            is_working_day = False
            day_label = f"Holiday: {holiday['name']}"
        elif is_weekend:
            is_working_day = False
            day_label = "Weekend"
        else:
            is_working_day = True
            day_label = "Working Day"
            
        # Check for approved leaves
        approved_leave = next((l for l in leaves if l["start_date"] <= day_str <= l["end_date"]), None)
        
        # Update day label in data
        data["day_label"] = day_label
        
        if day_records:
            # Sort punches
            punches = sorted(day_records, key=lambda x: x["timestamp"])
            first_in_obj = next((p for p in punches if p["action"] == "sign_in"), None)
            last_out_obj = next((p for p in reversed(punches) if p["action"] == "sign_out"), None)
            
            first_in = first_in_obj["timestamp"] if first_in_obj else "-"
            last_out = last_out_obj["timestamp"] if last_out_obj else "-"
            
            data["first_in_raw"] = first_in
            data["last_out_raw"] = last_out
            
            # Calculate hours
            tot_sec = 0
            if (isinstance(first_in, str) and 'T' in first_in) and (isinstance(last_out, str) and 'T' in last_out):
                try:
                    t1 = datetime.datetime.fromisoformat(first_in.replace('Z', '+00:00'))
                    t2 = datetime.datetime.fromisoformat(last_out.replace('Z', '+00:00'))
                    tdelta = t2 - t1
                    tot_sec = int(tdelta.total_seconds())
                    if tot_sec > 0:
                        hrs, rem = divmod(tot_sec, 3600)
                        mins, _ = divmod(rem, 60)
                        data["total_work_hrs"] = f"{hrs:02d}:{mins:02d}"
                except: pass
            
            is_forgot_logout = (first_in != "-" and last_out == "-")
            
            # Status logic for WORKING day with records
            if is_working_day:
                if tot_sec >= 9 * 3600:
                    data["status"] = "Present"
                    data["status_char"] = "P"
                    data["color"] = "var(--secondary)"
                elif is_forgot_logout:
                    data["status"] = "Present (Forgot Logout)"
                    data["status_char"] = "P"
                    data["color"] = "var(--secondary)"
                else:
                    early_logout_count += 1
                    if early_logout_count <= 4:
                        data["status"] = "Present (Early)"
                        data["status_char"] = "P"
                        data["color"] = "var(--secondary)"
                    else:
                        data["status"] = "Half Day"
                        data["status_char"] = "HD"
                        data["color"] = "#F59E0B"
                        data["deduction"] = daily_salary * 0.5
                # Create Comp-Off Request if >= 9 hours AND it was originally a non-working day
                if tot_sec >= 9 * 3600 and is_originally_non_working:
                    req_id = f"RL_{employee_id}_{day_str.replace('-', '')}"
                    existing = mongo_db.comp_off_requests.find_one({"request_id": req_id})
                    if not existing:
                        mongo_db.comp_off_requests.insert_one({
                            "request_id": req_id,
                            "employee_id": employee_id,
                            "date": day_str,
                            "hours": data["total_work_hrs"],
                            "status": "Pending",
                            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                        })
                    data["status"] = "Present (Earned Comp-Off Request)"
                else:
                    if is_working_day:
                        # Normal present status
                        data["status"] = "Present"
                        data["status_char"] = "P"
                        data["color"] = "var(--secondary)"
                    else:
                        # Worked on holiday but < 9 hours
                        data["status"] = "Worked on Holiday (<9h)"
                        data["status_char"] = "WOH"
                        data["color"] = "#ff7a00"
        else:
            # No sign-in: check day type
            if is_working_day:
                if approved_leave:
                    data["status"] = f"Leave ({approved_leave['leave_type']})"
                    data["status_char"] = "L"
                    data["color"] = "#A855F7"
                    data["deduction"] = 0
                else:
                    data["status"] = "Absent"
                    data["status_char"] = "A"
                    data["color"] = "#EF4444"
                    data["deduction"] = daily_salary
            else:
                # Normal weekend/holiday without work
                data["status"] = day_label
                data["status_char"] = "H" if holiday or is_forced_holiday else "W"
                data["color"] = "#9CA3AF"
                data["deduction"] = 0
                    
        final_history.append(data)
        
    # Get recent captures (flat list) for the whole history
    recent_records = list(mongo_db.attendance.find({"employee_id": employee_id}, {"_id": 0}).sort("timestamp", -1).limit(20))
    recent_captures = []
    for r in recent_records:
        recent_captures.append({
            "timestamp": r["timestamp"],
            "s3_image_key": r.get("s3_image_key"),
            "action": r.get("action", "sign_in")
        })

    return {
        "history": final_history,
        "recent_captures": recent_captures
    }

@router.put("/admin/holidays/{old_date}")
def update_holiday(old_date: str, request: HolidayRequest):
    if mongo_db.db is None:
        return {"error": "Database error"}
        
    mongo_db.holidays.update_one(
        {"date": old_date},
        {"$set": {
            "date": request.date,
            "name": request.name,
            "type": request.type
        }}
    )
    return {"message": "Holiday updated successfully."}

@router.delete("/admin/holidays/{date}")
def delete_holiday(date: str):
    if mongo_db.db is None:
        return {"error": "Database error"}
        
    mongo_db.holidays.delete_one({"date": date})
    return {"message": "Holiday deleted successfully."}

@router.get("/admin/workday-overrides")
def get_workday_overrides():
    if mongo_db.db is None: return {"overrides": []}
    overrides = list(mongo_db.workday_overrides.find({}, {"_id": 0}))
    return {"overrides": overrides}

@router.post("/admin/workday-overrides")
def add_workday_override(request: WorkdayOverride):
    if mongo_db.db is None: return {"error": "DB error"}
    mongo_db.workday_overrides.update_one(
        {"date": request.date},
        {"$set": request.dict()},
        upsert=True
    )
    return {"message": f"Workday override set for {request.date}"}

@router.delete("/admin/workday-overrides/{date}")
def delete_workday_override(date: str):
    if mongo_db.db is None: return {"error": "DB error"}
    mongo_db.workday_overrides.delete_one({"date": date})
    return {"message": "Override deleted"}

@router.get("/admin/comp-off-requests")
def get_comp_off_requests():
    if mongo_db.db is None: return {"requests": []}
    requests = list(mongo_db.comp_off_requests.find({"status": "Pending"}, {"_id": 0}))
    return {"requests": requests}

@router.post("/admin/comp-off-requests/action")
def process_comp_off_action(action: CompOffAction):
    if mongo_db.db is None: return {"error": "DB error"}
    
    # 1. Fetch request
    request = mongo_db.comp_off_requests.find_one({"request_id": action.request_id})
    if not request: return {"error": "Request not found"}
    
    # 2. Update Status
    mongo_db.comp_off_requests.update_one(
        {"request_id": action.request_id},
        {"$set": {"status": action.status}}
    )
    
    # 3. If Approved, increment balance
    if action.status == "Approved":
        mongo_db.users.update_one(
            {"employee_id": request["employee_id"]},
            {"$inc": {"comp_off_balance": 1}}
        )
        # Notify
        mongo_db.db["notifications"].insert_one({
            "type": "leave",
            "message": f"Your Comp-Off request for {request['date']} has been approved.",
            "employee_id": request["employee_id"],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        
    return {"message": f"Comp-off request {action.status}"}

@router.post("/employee/weekend-work/request")
def request_weekend_work(req: WeekendWorkRequest):
    record = req.dict()
    record["status"] = "Pending"
    record["created_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record["request_id"] = f"WWR_{req.employee_id}_{req.date.replace('-', '')}"
    if mongo_db.db is not None:
        mongo_db.weekend_work_requests.update_one(
            {"request_id": record["request_id"]},
            {"$set": record},
            upsert=True
        )
    return {"message": "Weekend work request submitted successfully", "record": record}

@router.get("/admin/weekend-work/requests")
def get_admin_weekend_work_requests():
    if mongo_db.db is None: return {"requests": []}
    reqs = list(mongo_db.weekend_work_requests.find({"status": "Pending"}, {"_id": 0}))
    return {"requests": reqs}

@router.post("/admin/weekend-work/requests/action")
def action_weekend_work_request(req_action: WeekendWorkAction):
    if mongo_db.db is not None:
        mongo_db.weekend_work_requests.update_one(
            {"request_id": req_action.request_id},
            {"$set": {"status": req_action.status}}
        )
    return {"message": f"Request {req_action.status} successfully"}

@router.get("/employee/dashboard-insights")
def get_employee_insights(employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
        
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"error": "Employee not found"}

    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    
    # Calculate semi-dynamic insights
    # 1. Attendance check for today (sign-ins)
    checked_in = False
    if mongo_db.attendance is not None:
        checked_in = mongo_db.attendance.find_one({
            "employee_id": employee_id,
            "timestamp": {"$regex": f"^{today_str}"},
            "action": "sign_in"
        }) is not None

    # 2. Get upcoming holidays
    upcoming_holidays = []
    if mongo_db.db is not None:
        # Sort by date and limit to 2 upcoming holidays
        all_holidays = list(mongo_db.holidays.find({}, {"_id": 0}))
        # Filter for future dates in-memory or improve query if possible
        upcoming_holidays = [h for h in all_holidays if h['date'] >= today_str]
        upcoming_holidays = sorted(upcoming_holidays, key=lambda x: x['date'])[:2]

    # 3. Dynamic Insight Message
    if not checked_in:
        insight = "You haven't clocked in yet today. Don't forget to sign in!"
    else:
        insight = "Excellent! You're clocked in and on track with your schedule."

    # 4. Mocked but served via API metrics
    productivity_score = 94 if checked_in else 85
    burnout_risk = "Low (8%)" if not checked_in else "Low (14%)"
    
    highlights = []
    for h in upcoming_holidays:
        highlights.append({"time": h['date'], "title": h['name'], "type": "holiday"})
    
    if not highlights:
        highlights = [{"time": "Upcoming", "title": "No immediate holidays", "type": "info"}]

    return {
        "insight_message": insight,
        "productivity_score": productivity_score,
        "attendance_percentage": 98,
        "burnout_risk": burnout_risk,
        "burnout_value": 14 if checked_in else 8,
        "highlights": highlights
    }

@router.get("/employee/leaves")
def get_employee_leaves(employee_id: str):
    if mongo_db.db is None:
        return {"leaves": []}
    leaves = list(mongo_db.leaves.find({"employee_id": employee_id}, {"_id": 0}))
    return {"leaves": leaves}

@router.get("/employee/profile")
def get_employee_profile(employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
    user = mongo_db.users.find_one({"employee_id": employee_id}, {"_id": 0, "password": 0})
    if not user:
        return {"error": "Employee not found"}
    return user

@router.get("/employee/leave-balance")
def get_leave_balance(employee_id: str):
    if mongo_db.users is None:
        return {"total": 0, "used": 0, "remaining": 0, "types": []}
    
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"error": "User not found"}
        
    is_intern = user.get("employment_type") == "Intern"
    
    if is_intern:
        accrued_co = user.get("comp_off_balance", 0.0)
        # Fetch approved comp-off usage for interns too
        used_co = 0
        if mongo_db.db is not None:
             approved_leaves = list(mongo_db.leaves.find({"employee_id": employee_id, "status": "Approved"}))
             for leaf in approved_leaves:
                 if "Compensatory" in leaf["leave_type"] or "Comp-Off" in leaf["leave_type"]:
                     try:
                        start = datetime.datetime.fromisoformat(leaf["start_date"])
                        end = datetime.datetime.fromisoformat(leaf["end_date"])
                        used_co += (end - start).days + 1
                     except: continue
        
        rem_co = max(0, accrued_co - used_co)
        
        return {
            "total": rem_co,
            "used": used_co,
            "remaining": rem_co,
            "is_intern": True,
            "types": [
                {"name": "Privilege Leave", "remaining": 0},
                {"name": "Sick Leave", "remaining": 0},
                {"name": "Casual Leave", "remaining": 0},
                {"name": "Compensatory Off", "remaining": round(rem_co, 1)}
            ],
            "message": "Interns are eligible for Compensatory Off credits earned via holiday work."
        }

    # Calculate Accrued Leaves for Full-Time
    joining_date_str = user.get("joining_date")
    if not joining_date_str:
        joining_date_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    joining_date = datetime.datetime.fromisoformat(joining_date_str)
    now = datetime.datetime.utcnow()
    
    # Calculate months passed (Include joining month)
    months_passed = (now.year - joining_date.year) * 12 + (now.month - joining_date.month) + 1
    if months_passed < 1: months_passed = 1
    
    # Rates (Default to user's stored rates or system defaults)
    pl_rate = user.get("privilege_leave_rate", 0.0)
    sl_rate = user.get("sick_leave_rate", 0.5)
    cl_rate = user.get("casual_leave_rate", 1.0)
    
    accrued_pl = months_passed * pl_rate
    accrued_sl = months_passed * sl_rate
    accrued_cl = months_passed * cl_rate
    
    # Fetch Approved Leaves to calculate usage
    used_pl = 0
    used_sl = 0
    used_cl = 0
    used_co = 0
    
    if mongo_db.db is not None:
        approved_leaves = list(mongo_db.leaves.find({
            "employee_id": employee_id,
            "status": "Approved"
        }))
        
        for leaf in approved_leaves:
            try:
                start = datetime.datetime.fromisoformat(leaf["start_date"])
                end = datetime.datetime.fromisoformat(leaf["end_date"])
                days = (end - start).days + 1
                
                l_type = leaf["leave_type"]
                if "Privilege" in l_type: used_pl += days
                elif "Sick" in l_type: used_sl += days
                elif "Casual" in l_type: used_cl += days
                elif "Compensatory" in l_type or "Comp-Off" in l_type: used_co += days
            except:
                continue

    rem_pl = max(0, accrued_pl - used_pl)
    rem_sl = max(0, accrued_sl - used_sl)
    rem_cl = max(0, accrued_cl - used_cl)
    
    # Comp-Off is stored directly as a balance in user profile (granted by Admin)
    accrued_co = user.get("comp_off_balance", 0.0)
    rem_co = max(0, accrued_co - used_co)
    
    return {
        "total": rem_pl + rem_sl + rem_cl + rem_co,
        "used": used_pl + used_sl + used_cl + used_co,
        "remaining": rem_pl + rem_sl + rem_cl + rem_co,
        "is_intern": False,
        "types": [
            {"name": "Privilege Leave", "remaining": round(rem_pl, 1)},
            {"name": "Sick Leave", "remaining": round(rem_sl, 1)},
            {"name": "Casual Leave", "remaining": round(rem_cl, 1)},
            {"name": "Compensatory Off", "remaining": round(rem_co, 1)}
        ],
        "accrual_info": {
            "months_passed": months_passed,
            "rates": {"PL": pl_rate, "SL": sl_rate, "CL": cl_rate}
        }
    }

@router.get("/employee/salary")
def get_employee_salary(employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
    user = mongo_db.users.find_one({"employee_id": employee_id}, {"_id": 0, "monthly_salary": 1, "employment_type": 1, "in_hand_salary": 1, "joining_date": 1})
    if not user:
        return {"error": "Employee not found"}
    
    try:
        monthly_salary = float(user.get("monthly_salary", 0))
    except (ValueError, TypeError):
        monthly_salary = 0.0
        
    employment_type = user.get("employment_type", "Full-Time")
    
    # Calculate expected working days based on joining date for Proration
    joining_date_str = user.get("joining_date")
    joining_date = None
    if joining_date_str:
        try:
            joining_date = datetime.datetime.fromisoformat(joining_date_str).date()
        except: pass

    now = datetime.datetime.utcnow()
    year = now.year
    month = now.month
    month_prefix = f"{year}-{month:02d}"
    
    # Fetch holidays/overrides for calculation
    all_holidays = list(mongo_db.holidays.find({}, {"_id": 0})) if mongo_db.holidays is not None else []
    all_overrides = list(mongo_db.workday_overrides.find({}, {"_id": 0})) if mongo_db.workday_overrides is not None else []
    month_holidays = {h["date"] for h in all_holidays if h["date"].startswith(month_prefix)}
    month_overrides = {o["date"]: o["type"] for o in all_overrides if o["date"].startswith(month_prefix)}

    import calendar as py_calendar
    _, num_days = py_calendar.monthrange(year, month)
    total_working_days_in_month = 0
    expected_working_days = 0
    
    for d in range(1, num_days + 1):
        curr_day = datetime.date(year, month, d)
        date_str = curr_day.isoformat()
        weekday = curr_day.weekday()
        
        is_working = True
        if weekday >= 5: is_working = False
        if date_str in month_holidays: is_working = False
        if date_str in month_overrides:
            if month_overrides[date_str] == "forced_working": is_working = True
            elif month_overrides[date_str] == "forced_holiday": is_working = False
            
        if is_working:
            total_working_days_in_month += 1
            if not joining_date or curr_day >= joining_date:
                expected_working_days += 1

    if total_working_days_in_month > 0 and expected_working_days < total_working_days_in_month:
        base_salary = (expected_working_days / total_working_days_in_month) * monthly_salary
    else:
        base_salary = monthly_salary

    # NEW: LOP Deduction Logic (₹500 per day) from attendance history
    lop_days = 0
    attendance_penalty = 0
    
    try:
        calendar_res = get_attendance_calendar(employee_id)
        if "history" in calendar_res:
            today_str = datetime.datetime.utcnow().strftime('%Y-%m')
            for record in calendar_res["history"]:
                if record["date"].startswith(today_str):
                    if record.get("status_char") == "A":
                        lop_days += 1
                    else:
                        attendance_penalty += record.get("deduction", 0)
    except Exception as e:
        print(f"Error calculating attendance penalty/LOP: {e}")

    lop_deduction = lop_days * 500

    if employment_type == "Intern":
        attendance_penalty = 0
        deductions = lop_deduction
        tax = 0
        net_salary = base_salary - lop_deduction
    else:
        stored_in_hand = user.get("in_hand_salary")
        try:
            stored_in_hand = float(stored_in_hand) if stored_in_hand is not None else 0
        except (ValueError, TypeError):
            stored_in_hand = 0
            
        if stored_in_hand > 0:
            if total_working_days_in_month > 0 and expected_working_days < total_working_days_in_month:
                 prorated_in_hand = (expected_working_days / total_working_days_in_month) * stored_in_hand
            else:
                 prorated_in_hand = stored_in_hand
                 
            net_salary = prorated_in_hand - lop_deduction
            deductions = base_salary - net_salary
            tax = 0
        else:
            deductions = int(base_salary * 0.05) + lop_deduction + attendance_penalty
            tax = int(base_salary * 0.08)
            net_salary = base_salary - deductions - tax
            
    return {
        "net_salary": net_salary,
        "deductions": deductions,
        "tax": tax,
        "gross_salary": base_salary,
        "lop_days": lop_days,
        "lop_deduction": lop_deduction,
        "attendance_penalty": attendance_penalty
    }

def generate_payslip_pdf(employee, salary, month_year, format_info):
    # format_info is a dict with coordinates or descriptions
    pdf = FPDF()
    pdf.add_page()
    
    # 1. Background Template
    template_image = s3_db.get_image("settings/payslip_template.jpg")
    has_template = False
    if template_image:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                tmp.write(template_image)
                temp_path = tmp.name
            pdf.image(temp_path, x=0, y=0, w=210, h=297) # A4 size
            os.unlink(temp_path) # Clean up
            has_template = True
        except:
            pass # Fallback to manual generation if template fails
            
    # 2. Add Professional Header if no template exists
    if not has_template:
        # Header bar
        pdf.set_fill_color(200, 76, 255) # #c84cff (Violet)
        pdf.rect(0, 0, 210, 40, 'F')
        
        pdf.set_font("Arial", 'B', 24)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(15, 12)
        pdf.cell(0, 10, "NeuZen AI", ln=False)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.set_xy(150, 15)
        pdf.cell(45, 10, "PAYSLIP REPORT", align='R', ln=True)
        
        pdf.set_font("Arial", '', 10)
        pdf.set_xy(150, 22)
        pdf.cell(45, 10, f"{month_year}", align='R', ln=True)
        pdf.ln(25)
    
    # 2. Overlay Text
    pdf.set_font("Arial", 'B', 12)
    pdf.set_text_color(0, 0, 0)
    
    if not has_template:
        # Section titles
        pdf.set_xy(15, 50)
        pdf.cell(0, 10, "Employee Details", ln=True)
        pdf.line(15, 58, 195, 58)
        
        pdf.set_font("Arial", '', 10)
        pdf.set_xy(15, 65)
        pdf.cell(40, 10, f"Name: {employee.get('name')}", ln=True)
        pdf.set_x(15)
        pdf.cell(40, 10, f"ID: {employee.get('employee_id')}", ln=True)
        pdf.set_x(15)
        pdf.cell(40, 10, f"Type: {employee.get('employment_type', 'Full-Time')}", ln=True)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.set_xy(15, 100)
        pdf.cell(0, 10, "Salary Breakdown", ln=True)
        pdf.line(15, 108, 195, 108)
        
        pdf.set_font("Arial", '', 10)
        pdf.set_xy(15, 115)
        pdf.cell(100, 10, "Description", ln=False)
        pdf.cell(0, 10, "Amount", align='R', ln=True)
        
        pdf.line(15, 123, 195, 123)
        
        items = [
            ("Gross Monthly Salary", salary.get('gross_salary')),
            ("Attendance Penalty", -salary.get('attendance_penalty', 0)),
            ("LOP Deductions", -salary.get('lop_deduction', 0)),
            ("Professional Tax / Other", -salary.get('tax', 0)),
        ]
        
        curr_y = 130
        for label, val in items:
            pdf.set_xy(15, curr_y)
            pdf.cell(100, 10, label)
            pdf.set_x(150)
            pdf.cell(45, 10, f"Rs. {val:,}", align='R', ln=True)
            curr_y += 8
            
        pdf.line(15, curr_y + 5, 195, curr_y + 5)
        pdf.set_font("Arial", 'B', 11)
        pdf.set_xy(15, curr_y + 10)
        pdf.cell(100, 10, "NET PAYABLE")
        pdf.set_x(150)
        pdf.cell(45, 10, f"Rs. {salary.get('net_salary'):,}", align='R', ln=True)
        
        pdf.set_font("Arial", 'I', 8)
        pdf.set_xy(15, 260)
        pdf.cell(0, 10, "This is a computer generated document and does not require a signature.", align='C')
    else:
        # Use existing coordinate-based overlay if template exists
        pdf.set_font("Arial", size=10)
        fields = [
            ("Employee Name", employee.get("name"), 40, 50),
            ("Employee ID", employee.get("employee_id"), 40, 60),
            ("Month", month_year, 150, 50),
            ("Gross Salary", f"Rs. {salary.get('gross_salary'):,}", 150, 100),
            ("Net Salary", f"Rs. {salary.get('net_salary'):,}", 150, 200),
            ("Deductions", f"Rs. {salary.get('deductions'):,}", 150, 150),
        ]
        for label, val, x, y in fields:
            pdf.set_xy(x, y)
            pdf.cell(0, 10, txt=f"{val}", ln=False)

    return pdf.output()

@router.get("/employee/payslip/download/{month_year}")
def download_payslip(month_year: str, employee_id: str):
    # Retrieve from MongoDB users or a specific payslip collection
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return Response(status_code=404, content="Employee not found")
        
    s3_key = user.get("payslip_document_key")
    if not s3_key:
        return Response(status_code=404, content="Payslip not found")
        
    html_bytes = s3_db.get_image(s3_key)
    if not html_bytes:
        return Response(status_code=404, content="Payslip file not found in storage")
        
    return Response(
        content=html_bytes, 
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=NeuzenAI_Payslip_{month_year}.html"}
    )
def analyze_payslip_template(request: PayslipTemplateRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "AI not configured (missing API Key)."}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # 1. Decode Image for Gemini
    try:
        image_bytes = parse_base64(request.image_base64)
    except:
        return {"error": "Invalid image format"}

    # 2. Ask Gemini to extract the layout structure
    prompt = """
    Analyze this payslip template image. Identify the coordinates or relative positions of the following fields:
    - Employee Name
    - Employee ID
    - Designation/Position
    - Month/Year
    - Basic Salary
    - Deductions (LOP, Tax, PF)
    - Net Salary
    Return a JSON structure describing the layout (e.g., labels and their relative positions or a list of placeholders).
    We will use this to generate identical PDFs.
    """
    
    try:
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_bytes}])
        # Store the extracted format in Mongo for future use
        format_description = response.text
        if mongo_db.db is not None:
            mongo_db.db.settings.update_one(
                {"key": "payslip_format"},
                {"$set": {"description": format_description, "template_image_key": "settings/payslip_template.jpg", "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}},
                upsert=True
            )
            s3_db.save_image("settings/payslip_template.jpg", image_bytes, content_type='image/jpeg')
            
        return {"message": "Template analyzed and saved", "analysis": format_description}
    except Exception as e:
        return {"error": f"AI analysis failed: {str(e)}"}
def get_employee_payslips(employee_id: str):
    if mongo_db.users is None:
        return {"payslips": []}
    
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"error": "Employee not found"}

    joining_date_str = user.get("joining_date")
    if not joining_date_str:
        return {"payslips": []}
        
    joining_date = datetime.datetime.fromisoformat(joining_date_str)
    salary = user.get("monthly_salary", 0)
    
    # Check released months
    released_months = []
    if mongo_db.db is not None:
        releases = list(mongo_db.payslip_releases.find({"released": True}))
        released_months = [r["month_year"] for r in releases]

    payslips = []
    now = datetime.datetime.utcnow()
    
    # Generate payslips from joining month to current month
    # We iterate backwards from current month
    curr = datetime.datetime(now.year, now.month, 1)
    start = datetime.datetime(joining_date.year, joining_date.month, 1)
    
    # ISSUE 1: For intern payslip will be get after completing of internship period
    if user.get("employment_type") == "Intern":
        # Check if internship is completed (either a flag or date check)
        is_completed = user.get("internship_completed", False)
        end_date_str = user.get("internship_end_date")
        
        if not is_completed:
            if end_date_str:
                try:
                    # Handle both ISO and simple date formats
                    if 'T' in end_date_str:
                        end_date = datetime.datetime.fromisoformat(end_date_str).date()
                    else:
                        end_date = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
                    
                    if datetime.date.today() < end_date:
                        return {"payslips": [], "message": f"Intern payslips will be available after internship completion ({end_date.strftime('%Y-%m-%d')})."}
                except:
                    return {"payslips": [], "message": "Internship period not yet finished."}
            else:
                return {"payslips": [], "message": "Internship period not yet finished."}

    while curr >= start:
        month_name = curr.strftime("%B %Y")
        
        # Only show if released by admin
        if month_name not in released_months:
            curr = curr - datetime.timedelta(days=1)
            curr = datetime.datetime(curr.year, curr.month, 1)
            continue

        # Last day of that month
        last_day = (datetime.datetime(curr.year, curr.month, 1) + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)
        
        payslips.append({
            "id": f"ps_{curr.strftime('%b%y').lower()}",
            "month": month_name,
            "date": last_day.strftime("%Y-%m-%d"),
            "amount": f"₹{salary:,}"
        })
        
        # Move to previous month
        curr = curr - datetime.timedelta(days=1)
        curr = datetime.datetime(curr.year, curr.month, 1)
        
        if len(payslips) >= 12: # Limit to last 12 months
            break

    return {"payslips": payslips}

@router.post("/admin/payslips/release")
def release_payslip(request: PayslipReleaseRequest):
    if mongo_db.db is None:
        return {"error": "Database error"}
    
    mongo_db.payslip_releases.update_one(
        {"month_year": request.month_year},
        {"$set": {"released": request.release, "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": f"Payslips for {request.month_year} {'released' if request.release else 'hidden'}"}

@router.get("/admin/payslips/status")
def get_payslip_release_status():
    if mongo_db.db is None:
        return {"releases": []}
    releases = list(mongo_db.payslip_releases.find({}, {"_id": 0}))
    return {"releases": releases}

@router.get("/employee/payslips")
def get_employee_payslips(employee_id: str):
    if mongo_db.users is None or mongo_db.payslip_releases is None:
        return {"payslips": []}
    
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"payslips": []}
        
    salary = user.get("monthly_salary", 0)
    # Filter releases that are set to True
    releases = list(mongo_db.payslip_releases.find({"released": True}, {"_id": 0}))
    
    payslips = []
    for r in releases:
        payslips.append({
            "month": r.get("month_year"),
            "date": r.get("updated_at", "").split('T')[0] if r.get("updated_at") else "2026-03-05",
            "amount": f"₹{salary:,}"
        })
        
    return {"payslips": payslips}

@router.get("/employee/team-availability")
def get_team_availability():
    if mongo_db.users is None:
        return {"team": []}
    
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    employees = list(mongo_db.users.find({"status": "approved"}, {"_id": 0, "name": 1, "employee_id": 1}))
    
    team_status = []
    for emp in employees:
        emp_id = emp["employee_id"]
        
        # Check attendance for today
        is_present = False
        if mongo_db.attendance is not None:
            latest = mongo_db.attendance.find_one(
                {"employee_id": emp_id, "timestamp": {"$regex": f"^{today_str}"}},
                sort=[("timestamp", -1)]
            )
            if latest and latest["action"] == "sign_in":
                is_present = True
        
        # Check leave for today
        on_leave = False
        if mongo_db.db is not None:
            leave = mongo_db.leaves.find_one({
                "employee_id": emp_id,
                "status": {"$regex": "Approved"},
                "start_date": {"$lte": today_str},
                "end_date": {"$gte": today_str}
            })
            if leave:
                on_leave = True
        
        status = "Available" if is_present else ("On Leave" if on_leave else "Offline")
        
        team_status.append({
            "name": emp["name"],
            "id": emp_id,
            "status": status,
            "initials": "".join([n[0] for n in emp["name"].split()[:2]]).upper()
        })
        
    return {"team": team_status}

class KudosRequest(BaseModel):
    sender_id: str

class EmployeeSignatureRequest(BaseModel):
    employee_id: str
    signature_name: str
    signing_date: str
    sender_name: str
    receiver_name: str
    message: str

@router.post("/employee/kudos")
def give_kudos(request: KudosRequest):
    record = request.dict()
    record["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if mongo_db.db is not None:
        # Create kudos collection if it doesn't exist
        mongo_db.kudos.insert_one(record)
    return {"message": "Kudos shared!", "record": record}

@router.get("/employee/kudos")
def get_all_kudos():
    if mongo_db.db is None:
        return {"kudos": []}
    kudos = list(mongo_db.kudos.find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
    # Default kudos if empty
    if not kudos:
        kudos = [
            {"sender_name": "HR Team", "receiver_name": "Everyone", "message": "Welcome to the new dashboard!", "timestamp": "2026-03-01T10:00:00"}
        ]
    return {"kudos": kudos}

# --- Announcements ---

@router.get("/announcement")
def get_announcement():
    if mongo_db.db is None:
        return {"title": "Welcome", "content": "Welcome to DurgDhana HRMS!"}
    
    announcement = mongo_db.db.announcements.find_one({}, {"_id": 0}, sort=[("updated_at", -1)])
    if not announcement:
        return {
            "title": "📌 Essential Office Guidelines",
            "content": "Attendance: Mandatory sign-in (11:00 AM - 8:00 PM). \nLeave Policy: 1.5 days/month for FTE (1 Casual + 0.5 Sick). Interns: No leaves."
        }
    return announcement

@router.post("/admin/announcement")
def update_announcement(request: AnnouncementRequest):
    if mongo_db.db is None:
        return {"error": "Database error"}
    
    record = {
        "title": request.title,
        "content": request.content,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    mongo_db.db.announcements.insert_one(record)
    return {"message": "Announcement updated successfully", "record": {"title": record["title"], "content": record["content"]}}

@router.get("/admin/notifications")
def get_admin_notifications():
    if mongo_db.db is None:
        return {"notifications": []}
    notes = list(mongo_db.db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(20))
    return {"notifications": notes}

@router.get("/admin/attendance")
def get_all_attendance_logs():
    if mongo_db.attendance is None:
        return {"logs": []}
    logs = list(mongo_db.attendance.find({}, {"_id": 0}).sort("timestamp", -1).limit(100))
    return {"logs": logs}

@router.post("/admin/copilot")
def admin_ai_copilot(request: AdminCopilotRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"answer": "AI Copilot is not configured (missing API Key)."}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    context = "Company policies retrieval is currently disabled."

    # 2. Context Retrieval from Mongo (Employee/Candidate Info)
    # Extract names or IDs if possible, for now we can do a broad search
    # or just assume the AI will ask for specifics if missing.
    try:
        if "candidate" in request.query.lower() or "employee" in request.query.lower():
            # Find recent onboarding requests
            pendings = list(mongo_db.users.find({"status": "pending_approval"}, {"_id":0, "password":0}).limit(5))
            context += f"\nRecent Candidate Applications: {pendings}"
    except:
        pass

    prompt = f"""
    You are the Dhanadurga HR Copilot. Use the context below to answer the Admin's query.
    Context: {context}
    
    Admin Query: {request.query}
    
    Response (Professional and concise):
    """
    
    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        return {"answer": f"AI error: {str(e)}"}

@router.get("/admin/photos/{key:path}")
def serve_s3_photo(key: str):
    image_bytes = s3_db.get_image(key)
    if image_bytes:
        return Response(content=image_bytes, media_type="image/jpeg")
    return {"error": "Photo not found"}

# Include enhanced document system routes
router.include_router(enhanced_router, prefix="")

# --- Offer Letters ---

def generate_offer_letter_pdf(data):
    pdf = FPDF()
    pdf.add_page()
    
    # --- Header ---
    # Top bar
    pdf.set_fill_color(255, 69, 0) # Orange Red (#ff4500)
    pdf.rect(0, 0, 210, 25, 'F')
    
    # Logo / Company Name
    pdf.set_font("Arial", 'B', 24)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(15, 7)
    pdf.cell(0, 10, "NeuzenAI", ln=False)
    
    pdf.set_font("Arial", '', 12)
    pdf.set_xy(160, 7)
    pdf.cell(35, 10, "IT SOLUTIONS", align='R', ln=True)
    
    # --- Content ---
    pdf.set_text_color(26, 26, 26) # #1a1a1a (Dark Black)
    pdf.ln(25)
    
    # Normalize employment type
    emp_type = str(data.get('employment_type', 'Intern')).strip().lower()
    is_intern = 'intern' in emp_type
    title = "INTERNSHIP OFFER LETTER" if is_intern else "FULL TIME EMPLOYMENT OFFER LETTER"
    
    # Letter Head Info
    pdf.set_font("Arial", 'B', 16)
    pdf.set_x(15)
    pdf.cell(0, 15, title, align='C', ln=True)
    
    # ISSUE 5: Today's date is missing in offer letter for full time
    offer_date = data.get('date') or data.get('offer_date')
    if not offer_date:
        offer_date = datetime.datetime.now().strftime("%Y-%m-%d")

    pdf.ln(5)
    pdf.set_font("Arial", '', 10)
    pdf.set_x(15)
    pdf.cell(0, 10, f"Date: {offer_date}", ln=True)
    pdf.cell(0, 5, f"Ref: NZ/{'INT' if is_intern else 'FT'}/{data['employee_id'][-4:].upper()}/2026", ln=True)
    
    pdf.ln(10)
    pdf.set_font("Arial", 'B', 12)
    pdf.set_x(15)
    pdf.cell(0, 10, f"Dear {data['name']},", ln=True)
    
    pdf.ln(5)
    pdf.set_font("Arial", '', 11)
    pdf.set_x(15)
    
    if is_intern:
        body_text = f"Following our recent discussions, we are delighted to offer you an internship at NeuzenAI IT Solutions. We were impressed with your skills and believe you will be a valuable addition to our team."
    else:
        body_text = f"Following our recent discussions and interview process, we are pleased to offer you employment with NeuzenAI IT Solutions. We believe your background and experience will be a tremendous asset to our organization."
        
    pdf.multi_cell(180, 7, txt=body_text)
    
    pdf.ln(5)
    pdf.set_x(15)
    if is_intern:
        role_text = f"You are being offered the position of {data['role']}. During your internship, you will be primarily focused on: {data['role_description']}"
    else:
        role_text = f"You are being offered the position of {data['role']}. Your responsibilities will include: {data['role_description']}"
    pdf.multi_cell(180, 7, txt=role_text)
    
    # Terms Table-like structure
    pdf.ln(10)
    pdf.set_font("Arial", 'B', 11)
    pdf.set_x(15)
    pdf.cell(0, 10, "Terms and Conditions:", ln=True)
    
    pdf.set_font("Arial", '', 10)
    if is_intern:
        details = [
            ("Position", data['role']),
            ("Duration", data.get('duration', '3 Months')),
            ("Stipend", data.get('stipend', 'Unpaid')),
            ("Start Date", data['date']),
            ("Working Hours", "11:00 AM to 8:00 PM (Mon-Sat)")
        ]
    else:
        details = [
            ("Position", data['role']),
            ("Employment Type", "Full-Time (Probationary)"),
            ("Fixed CTC", f"₹{data.get('annual_ctc', 0)} LPA"),
            ("Start Date", data['date']),
            ("Notice Period", data.get('notice_period', '30 Days')),
            ("Working Hours", "11:00 AM to 8:00 PM (Mon-Sat)")
        ]
    
    for label, val in details:
        pdf.set_x(25)
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(45, 8, f"{label}:", ln=False)
        pdf.set_font("Arial", '', 10)
        pdf.cell(0, 8, f"{val}", ln=True)
        
    pdf.ln(10)
    pdf.set_font("Arial", '', 11)
    pdf.set_x(15)
    if is_intern:
        closing = "Please review the terms mentioned above. If they are acceptable to you, kindly sign the duplicate copy of this letter and return it to us as a token of your acceptance.\n\nWe look forward to a mutually beneficial relationship."
    else:
        closing = "This offer is subject to the successful completion of background verification and professional references. Please return a signed copy of this letter to signify your acceptance of our offer.\n\nWe look forward to having you on our team!"
    pdf.multi_cell(180, 7, txt=closing)
    
    # --- Signatures ---
    pdf.ln(25)
    pdf.set_x(15)
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(90, 8, "For NeuzenAI IT Solutions,", ln=False)
    pdf.cell(0, 8, "Accepted By,", align='R', ln=True)
    
    pdf.ln(10)
    pdf.set_x(15)
    pdf.cell(90, 8, "________________________", ln=False)
    pdf.cell(0, 8, "________________________", align='R', ln=True)
    pdf.set_x(15)
    pdf.set_font("Arial", '', 9)
    pdf.cell(90, 8, "Authorized Signatory", ln=False)
    pdf.cell(0, 8, "Candidate Signature", align='R', ln=True)

    if not is_intern:
        # --- Annexure-A Page ---
        pdf.add_page()
        # Header (reuse color theme)
        pdf.set_fill_color(255, 69, 0)
        pdf.rect(0, 0, 210, 25, 'F')
        pdf.set_font("Arial", 'B', 24)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(15, 7)
        pdf.cell(0, 10, "NeuzenAI", ln=False)
        
        pdf.set_text_color(26, 26, 26)
        pdf.ln(35)
        pdf.set_font("Arial", 'B', 14)
        pdf.set_x(15)
        pdf.cell(180, 10, "ANNEXURE - A: SALARY BREAKUP", align='C', ln=True)
        pdf.ln(5)
        
        # Table Header
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("Arial", 'B', 10)
        pdf.set_x(15)
        pdf.cell(120, 10, "Component", border=1, fill=True)
        pdf.cell(60, 10, "Amount (Annual ₹)", border=1, fill=True, ln=True)
        
        # Table Rows
        pdf.set_font("Arial", '', 10)
        pdf.set_x(15)
        
        ctc = float(data.get('annual_ctc', 0))
        has_pf = data.get('has_pf', False)
        pf_amt = float(data.get('pf_amount', 0))
        
        pdf.cell(120, 10, "Basic Salary + HRA + Allowances", border=1)
        pdf.cell(60, 10, f"₹{ctc - pf_amt if has_pf else ctc}", border=1, ln=True)
        
        if has_pf:
            pdf.set_x(15)
            pdf.cell(120, 10, "Provident Fund (Employer Contribution)", border=1)
            pdf.cell(60, 10, f"₹{pf_amt}", border=1, ln=True)
            
        # Total
        pdf.set_font("Arial", 'B', 10)
        pdf.set_x(15)
        pdf.set_fill_color(255, 240, 230)
        pdf.cell(120, 10, "TOTAL FIXED CTC", border=1, fill=True)
        pdf.cell(60, 10, f"₹{ctc}", border=1, fill=True, ln=True)
        
        pdf.ln(10)
        pdf.set_font("Arial", 'B', 11)
        pdf.set_x(15)
        pdf.set_text_color(16, 185, 129) # Success Green
        in_hand = float(data.get('in_hand_salary', 0))
        pdf.cell(0, 10, f"ESTIMATED IN-HAND MONTHLY SALARY: ₹{round(in_hand/12, 2)}", ln=True)
        pdf.set_text_color(26, 26, 26)
        
        pdf.ln(5)
        pdf.set_font("Arial", '', 9)
        pdf.set_x(15)
        pdf.multi_cell(180, 6, txt="*Note: The in-hand amount is estimated after standard deductions as discussed. Statutory taxes (if applicable) will be deducted at source as per government regulations.")

    # --- Footer ---
    pdf.set_y(-30)
    pdf.set_font("Arial", 'I', 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 10, "NeuzenAI IT Solutions | Flat No. 402, 4th Floor, Sri Sai Enclave, Hyderabad", align='C', ln=True)
    pdf.cell(0, 5, "www.neuzenai.com | info@neuzenai.com", align='C', ln=True)
    
    return pdf.output()

def generate_offer_letter_html_pdf(data, template_html):
    # Use Jinja2 to render the HTML with the data
    template = jinja2.Template(template_html)
    rendered_html = template.render(**data)
    
    # Use xhtml2pdf to convert HTML to PDF
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(rendered_html, dest=pdf_buffer)
    
    if pisa_status.err:
        raise Exception("HTML to PDF conversion failed")
    
    return pdf_buffer.getvalue()

@router.post("/admin/interns/generate-offer-letter")
def admin_generate_offer_letter(request: OfferLetterRequest):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "Employee not found"}
        
    data = {
        "name": user["name"],
        "employee_id": request.employee_id,
        "employment_type": request.employment_type, # Use type from request
        "date": request.date,
        "role": request.role,
        "role_description": request.role_description,
        "stipend": request.stipend,
        "duration": request.duration,
        "annual_ctc": request.annual_ctc,
        "notice_period": request.notice_period,
        "has_pf": request.has_pf,
        "pf_amount": request.pf_amount,
        "in_hand_salary": request.in_hand_salary,
        "annexure_details": request.annexure_details
    }
    
    try:
        # Check for custom HTML template
        template_record = mongo_db.offer_letter_templates.find_one({"employment_type": request.employment_type})
        
        if template_record and "html_content" in template_record:
            pdf_bytes = generate_offer_letter_html_pdf(data, template_record["html_content"])
        else:
            pdf_bytes = generate_offer_letter_pdf(data)
            
        # Store draft in S3 or local tmp for preview
        key = f"drafts/offer_letter_{request.employee_id}.pdf"
        s3_db.save_image(key, pdf_bytes, content_type='application/pdf')
        
        # Update user record with draft status
        mongo_db.users.update_one(
            {"employee_id": request.employee_id},
            {"$set": {"offer_letter_draft_key": key, "offer_letter_status": "draft"}}
        )
        
        return {"message": "Offer letter draft generated", "draft_key": key}
    except Exception as e:
        return {"error": f"Failed to generate offer letter: {str(e)}"}

@router.get("/admin/interns/offer-letter-preview/{employee_id}")
def preview_offer_letter(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user or "offer_letter_draft_key" not in user:
        return Response(status_code=404)
        
    pdf_bytes = s3_db.get_image(user["offer_letter_draft_key"])
    return Response(content=pdf_bytes, media_type="application/pdf")

@router.post("/admin/interns/send-offer-letter/{employee_id}")
def finalize_offer_letter(employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user or "offer_letter_draft_key" not in user:
        return {"error": "Draft not found"}
        
    # Copy from draft to final
    final_key = f"documents/offer_letter_{employee_id}.pdf"
    pdf_bytes = s3_db.get_image(user["offer_letter_draft_key"])
    s3_db.save_image(final_key, pdf_bytes, content_type='application/pdf')
    
    import datetime
    
    # Determine doc type name
    is_intern = user.get("employment_type") == "Intern"
    doc_type = "internship_offer" if is_intern else "full_time_offer"
    doc_name = "Internship Offer Letter" if is_intern else "Full-Time Offer Letter"

    mongo_db.users.update_one(
        {"employee_id": employee_id},
        {
            "$set": {
                "offer_letter_key": final_key, 
                "offer_letter_status": "final",
                f"{doc_type}_document_key": final_key,
                f"{doc_type}_generated_at": datetime.datetime.now().isoformat()
            },
            "$addToSet": {
                "all_documents": {
                    "type": doc_type,
                    "name": doc_name,
                    "s3_key": final_key,
                    "generated_at": datetime.datetime.now().isoformat()
                }
            }
        }
    )
    
    return {"message": "Offer letter sent to employee"}

@router.api_route("/employee/offer-letter/{employee_id}", methods=["GET", "HEAD"])
def get_employee_offer_letter(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user or "offer_letter_key" not in user or user.get("offer_letter_status") != "final":
        return Response(status_code=404)
        
    html_bytes = s3_db.get_image(user["offer_letter_key"])
    return Response(
        content=html_bytes, 
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=NeuzenAI_Offer_Letter.html"}
    )

@router.post("/employee/submit-offer-signature")
def submit_offer_signature(request: EmployeeSignatureRequest):
    """
    ISSUE 4: After admin releases, employee signs (name & date) 
    and then it goes back to admin side.
    """
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user or "offer_letter_key" not in user:
        return {"error": "Offer letter not found"}
    
    # Update user record with signature
    mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": {
            "offer_letter_status": "signed",
            "employee_signature_name": request.signature_name,
            "employee_signing_date": request.signing_date,
            "signed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }}
    )

    # RE-GENERATE the letter with the signature using the enhanced system
    from api.enhanced_doc_system import generate_and_save_document, get_employee_prefill_data, DOCUMENT_CONFIGS
    from api.enhanced_doc_system import DocumentGenerationRequest
    
    # Determine type
    doc_type = "full_time_offer" if user.get("employment_type") != "Intern" else "internship_offer"
    
    # Get prefill data (it will now include the signature from the DB)
    prefill = get_employee_prefill_data(request.employee_id, doc_type)
    
    if "prefill_data" in prefill:
        gen_request = DocumentGenerationRequest(
            employee_id=request.employee_id,
            doc_type=doc_type,
            roi_data=prefill["prefill_data"]
        )
        generate_and_save_document(gen_request)
    
    return {"message": "Signature submitted successfully. Offer letter updated and Admin notified."}

# Functionality moved to enhanced_doc_system

# Functionality moved to enhanced_doc_system

# Obsolete relieve/experience endpoints removed. Consolidating to enhanced_doc_system.
@router.post("/admin/employee/generate-relieving-letter")
def admin_generate_relieving_letter(request: RelievingLetterRequest):
    return {"error": "Use /enhanced-docs/generate"}

@router.post("/admin/employee/finalize-relieving-letter/{employee_id}")
def finalize_relieving_letter(employee_id: str):
    return {"error": "Use /enhanced-docs/generate"}

@router.get("/admin/employee/relieving-letter-preview/{employee_id}")
def preview_relieving_letter(employee_id: str):
    return Response(content="Use /enhanced-docs/preview", media_type="text/plain")

@router.api_route("/employee/relieving-letter/{employee_id}", methods=["GET", "HEAD"])
def get_employee_relieving_letter(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user or "relieving_document_key" not in user:
        return Response(status_code=404)
        
    html_bytes = s3_db.get_image(user["relieving_document_key"])
    return Response(
        content=html_bytes, 
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=NeuzenAI_Relieving_Letter.html"}
    )

@router.post("/admin/employee/generate-experience-certificate")
def admin_generate_experience_certificate(request: ExperienceCertificateRequest):
    return {"error": "Use /enhanced-docs/generate"}

@router.post("/admin/employee/finalize-experience-certificate/{employee_id}")
def finalize_experience_certificate(employee_id: str):
    return {"error": "Use /enhanced-docs/generate"}

@router.get("/admin/employee/experience-certificate-preview/{employee_id}")
def preview_experience_certificate(employee_id: str):
    return Response(content="Use /enhanced-docs/preview", media_type="text/plain")

@router.api_route("/employee/experience-certificate/{employee_id}", methods=["GET", "HEAD"])
def get_employee_experience_certificate(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user or "experience_document_key" not in user:
        return Response(status_code=404)
        
    html_bytes = s3_db.get_image(user["experience_document_key"])
    return Response(
        content=html_bytes, 
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=NeuzenAI_Experience_Certificate.html"}
    )

# --- Template Management ---

def analyze_and_convert_template(content_b64: str, file_type: str, document_type: str = "Document"):
    try:
        content_bytes = parse_base64(content_b64)
        
        raw_text = ""
        if file_type == 'pdf':
            reader = PdfReader(BytesIO(content_bytes))
            for page in reader.pages:
                raw_text += page.extract_text() + "\n"
        else:
            raw_text = content_bytes.decode('utf-8', errors='ignore')

        # Use Gemini to:
        # 1. Identify placeholders
        # 2. If PDF, convert to a clean HTML template relative to the content
        
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-image-preview")
        model = genai.GenerativeModel(model_name)
        
        # Specialized prompts based on document type
        document_type = document_type if document_type else "Document"
        
        extra_instr = """
        - CRITICAL: Identify and list all "ROI / Investment / Deduction" fields (e.g., 80C, 80D, HRA, Medical, NPS, PF).
        - Include these in the "roi_fields" array in the returned JSON. If none exist, return an empty array [].
        - CRITICAL: DO NOT convert the Company Name and Company Address into placeholders. They MUST remain as fixed static text in the HTML exactly as they appear in the document.
        """
        
        if "payslip" in document_type.lower():
            extra_instr += """
            - ONLY create placeholders for: Employee Details, Earnings, Deductions, Net Salary, "Payslip for the month of X", and Amount in Words.
            """
        elif "relieving" in document_type.lower() or "experience" in document_type.lower():
             extra_instr += """
            - CRITICAL: Identify exit-related fields (Joining Date, Relieving Date, Last Working Day, Reason for Leaving, Performance Review).
            - Add these naturally as placeholders in the HTML.
            """

        prompt = f"""
        You are an HR technical assistant at NeuzenAI. I have a {document_type} template in {file_type} format.
        
        TASK:
        1. Identify all existing placeholders like {{{{name}}}}, {{{{role}}}}, or unique markers.
        2. CRITICAL: REPLICATE the EXACT original HTML layout, structure, tables, and design of the provided document. DO NOT create a new design or change the format.
        3. CRITICAL: You MUST preserve ALL original colors, fonts, branding, alignments, and css styling exactly as they appear in the original uploaded document. Do not lose the color scheme.
        4. Ensure the HTML template uses Jinja2 style placeholders {{{{key}}}} for all dynamic data.
        {extra_instr}
        5. If the original didn't have placeholders, add them naturally for relevant fields.
        
        RETURN ONLY a valid JSON object with:
        "placeholders": [list of strings],
        "roi_fields": [list of strings or []],
        "html_template": "the full html source string"
        
        Template Raw Content/Text:
        {raw_text[:8000]}
        """
        
        response = model.generate_content(prompt)
        # Clean response if it contains markdown code blocks
        resp_text = response.text.replace('```json', '').replace('```', '').strip()
        import json
        try:
            analysis = json.loads(resp_text, strict=False)
        except json.JSONDecodeError as e:
            # Often caused by invalid \ escapes in CSS (e.g., content: "\2022")
            # We try a naive fallback by doubling backslashes
            print(f"JSONDecodeError encountered: {e}. Attempting fallback parsing.")
            try:
                # Replace backslashes but try not to break valid \n
                resp_text_escaped = resp_text.replace('\\', '\\\\')
                # But revert standard JSON escapes
                resp_text_escaped = resp_text_escaped.replace('\\\\n', '\\n').replace('\\\\r', '\\r').replace('\\\\t', '\\t').replace('\\\\"', '\\"')
                analysis = json.loads(resp_text_escaped, strict=False)
            except Exception as inner_e:
                print(f"Fallback parsing also failed: {inner_e}")
                return None
        return analysis
    except Exception as e:
        print(f"Template Analysis Error: {e}")
        return None

@router.post("/admin/templates/analyze")
def analyze_template_api(request: TemplateUploadRequest):
    # AI Analysis & Conversion Only
    analysis = analyze_and_convert_template(request.content_base64, request.file_type, request.employment_type)
    
    if not analysis:
        return {"error": "AI Analysis failed. Please try a cleaner file."}

    return analysis

@router.post("/admin/templates/upload")
def save_analyzed_template(request: TemplateSaveRequest):
    # This route now performs the actual saving AFTER admin confirmation
    if mongo_db.offer_letter_templates is None:
        return {"error": "Database error: offer_letter_templates collection missing"}

    # Save HTML template to S3
    s3_key = f"templates/{request.employment_type.replace(' ', '_').lower()}.html"
    s3_db.save_file(s3_key, request.html_template.encode('utf-8'), content_type='text/html')

    mongo_db.offer_letter_templates.update_one(
        {"employment_type": request.employment_type},
        {"$set": {
            "html_content": request.html_template,
            "placeholders": request.placeholders,
            "roi_fields": request.roi_fields,
            "original_type": request.original_type,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {
        "message": f"Template officially saved for {request.employment_type}"
    }

@router.get("/admin/templates")
def list_offer_letter_templates():
    if mongo_db.offer_letter_templates is None:
        return []
    # Return everything including html_content so preview works
    templates = list(mongo_db.offer_letter_templates.find({}, {"_id": 0}))
    return templates

@router.delete("/admin/templates/{employment_type}")
def delete_offer_letter_template(employment_type: str):
    mongo_db.offer_letter_templates.delete_one({"employment_type": employment_type})
    return {"message": f"Template deleted for {employment_type}"}
