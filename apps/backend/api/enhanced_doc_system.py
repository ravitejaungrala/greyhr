"""
Enhanced Document Generation System
Provides admin interface for selecting employees, document types, and filling ROI fields
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from database.mongo_client import mongo_db
from api.doc_engine import render_doc_to_html_bytes, render_and_save_doc
from database.s3_client import s3_db
import datetime
import base64
import os

enhanced_router = APIRouter()

# Document type configurations with their ROI fields
DOCUMENT_CONFIGS = {
    "full_time_offer": {
        "name": "Full-Time Offer Letter",
        "template": "full_time_offer.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "doj": {"type": "date", "label": "Date of Joining", "required": True},
            "offer_date": {"type": "date", "label": "Offer Date", "required": True},
            "monthly_basic": {"type": "number", "label": "Monthly Basic Salary", "required": True},
            "annual_basic": {"type": "number", "label": "Annual Basic Salary", "required": True},
            "monthly_hra": {"type": "number", "label": "Monthly HRA", "required": True},
            "annual_hra": {"type": "number", "label": "Annual HRA", "required": True},
            "monthly_stat_bonus": {"type": "number", "label": "Monthly Statutory Bonus", "required": False},
            "annual_stat_bonus": {"type": "number", "label": "Annual Statutory Bonus", "required": False},
            "monthly_lta": {"type": "number", "label": "Monthly LTA", "required": False},
            "annual_lta": {"type": "number", "label": "Annual LTA", "required": False},
            "monthly_personal_allowance": {"type": "number", "label": "Monthly Personal Allowance", "required": False},
            "annual_personal_allowance": {"type": "number", "label": "Annual Personal Allowance", "required": False},
            "monthly_gross": {"type": "number", "label": "Monthly Gross Salary", "required": True},
            "annual_gross": {"type": "number", "label": "Annual Gross Salary", "required": True},
            "employer_pf_monthly": {"type": "number", "label": "Employer PF (Monthly)", "required": False},
            "inhand_amount": {"type": "number", "label": "In-hand Amount", "required": True}
        }
    },
    "internship_offer": {
        "name": "Internship Offer Letter",
        "template": "internship_offer.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "current_date": {"type": "date", "label": "Current Date", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "internship_description": {"type": "textarea", "label": "Internship Description", "required": True},
            "stipend": {"type": "text", "label": "Stipend Amount", "required": True},
            "duration": {"type": "text", "label": "Duration", "required": True},
            "doj": {"type": "date", "label": "Date of Joining", "required": True},
            "acceptance_deadline": {"type": "date", "label": "Acceptance Deadline", "required": True},
            "your_name": {"type": "text", "label": "Signatory Name", "required": True, "default": "B. Subba Rami Reddy"},
            "your_designation": {"type": "text", "label": "Signatory Designation", "required": True, "default": "Co-Founder"}
        }
    },
    "internship_completion": {
        "name": "Internship Completion Certificate",
        "template": "internship_completion.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "current_date": {"type": "date", "label": "Issue Date", "required": True},
            "designation": {"type": "text", "label": "Internship Role", "required": True},
            "start_date": {"type": "date", "label": "Start Date", "required": True},
            "end_date": {"type": "date", "label": "Completion Date", "required": True},
            "performance_summary": {"type": "textarea", "label": "Performance Summary", "required": False, "default": "Successfully completed with good performance."}
        }
    },
    "experience": {
        "name": "Experience Letter",
        "template": "experience.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "start_date": {"type": "date", "label": "Start Date", "required": True},
            "end_date": {"type": "date", "label": "End Date", "required": True}
        }
    },
    "relieving": {
        "name": "Relieving Letter",
        "template": "relieving.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "current_date": {"type": "date", "label": "Current Date", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "department": {"type": "text", "label": "Department", "required": True},
            "last_working_day": {"type": "date", "label": "Last Working Day", "required": True},
            "resignation_date": {"type": "date", "label": "Resignation Date", "required": True}
        }
    },
    "payslip": {
        "name": "Payslip",
        "template": "payslip.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "emp_code": {"type": "text", "label": "Employee Code", "required": True},
            "month_year": {"type": "text", "label": "Month & Year (e.g., March 2026)", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "department": {"type": "text", "label": "Department", "required": True},
            "doj": {"type": "date", "label": "Date of Joining", "required": True},
            "days_worked": {"type": "number", "label": "Days Worked", "required": True},
            "bank_name": {"type": "text", "label": "Bank Name", "required": True},
            "account_no": {"type": "text", "label": "Bank Account Number", "required": True},
            "pan_no": {"type": "text", "label": "PAN Card Number", "required": True},
            "pf_no": {"type": "text", "label": "PF Account Number", "required": True},
            "basic": {"type": "number", "label": "Basic Salary", "required": True},
            "hra": {"type": "number", "label": "House Rent Allowance (HRA)", "required": True},
            "special_allowance": {"type": "number", "label": "Special Allowance", "required": True},
            "total_earnings": {"type": "number", "label": "Total Gross Earnings", "required": True},
            "prof_tax": {"type": "number", "label": "Professional Tax", "required": True},
            "pf_deduction": {"type": "number", "label": "PF Deduction", "required": True},
            "income_tax": {"type": "number", "label": "Income Tax (TDS)", "required": True},
            "total_deductions": {"type": "number", "label": "Total Deductions", "required": True},
            "net_salary": {"type": "number", "label": "Net Take-Home Salary", "required": True},
            "amount_in_words": {"type": "text", "label": "Net Salary in Words", "required": True}
        }
    }
}

class DocumentGenerationRequest(BaseModel):
    employee_id: str
    doc_type: str
    roi_data: Dict[str, Any]

class DocumentPreviewRequest(BaseModel):
    doc_type: str
    roi_data: Dict[str, Any]

class HistoricalDocumentRequest(BaseModel):
    employee_data: Dict[str, Any]
    doc_type: str
    roi_data: Dict[str, Any]

@enhanced_router.get("/enhanced-docs/employees")
def get_employees_for_docs():
    """Get list of all approved employees for document generation"""
    if mongo_db.users is None:
        return {"employees": []}
    
    employees = list(mongo_db.users.find(
        {"status": "approved"}, 
        {
            "_id": 0, 
            "employee_id": 1, 
            "name": 1, 
            "email": 1, 
            "employment_type": 1,
            "position": 1,
            "department": 1,
            "joining_date": 1,
            "monthly_salary": 1
        }
    ))
    
    return {"employees": employees}

@enhanced_router.get("/enhanced-docs/types")
def get_document_types():
    """Get available document types and their configurations"""
    doc_types = []
    for doc_type, config in DOCUMENT_CONFIGS.items():
        doc_types.append({
            "type": doc_type,
            "name": config["name"],
            "roi_fields": config["roi_fields"]
        })
    
    return {"document_types": doc_types}

@enhanced_router.get("/enhanced-docs/employee/{employee_id}/prefill/{doc_type}")
def get_employee_prefill_data(employee_id: str, doc_type: str):
    """Get employee data to prefill ROI fields"""
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    employee = mongo_db.users.find_one({"employee_id": employee_id})
    if not employee:
        return {"error": "Employee not found"}
    
    if doc_type not in DOCUMENT_CONFIGS:
        return {"error": "Invalid document type"}
    
    # Prefill data based on employee record
    prefill_data = {}
    
    # Common fields
    prefill_data["emp_name"] = employee.get("name", "")
    prefill_data["designation"] = employee.get("position", "")
    prefill_data["department"] = employee.get("department", "")
    prefill_data["emp_code"] = employee.get("employee_id", "")
    
    # Date fields (Issue 5 & 4)
    current_date = datetime.datetime.now().strftime("%Y-%m-%d")
    prefill_data["current_date"] = current_date
    
    # Ensure offer_date is set, fallback to current_date if missing
    prefill_data["offer_date"] = employee.get("offer_date") or current_date
    
    # Signature fields
    prefill_data["signing_date"] = employee.get("employee_signing_date") or current_date
    prefill_data["employee_signature_name"] = employee.get("employee_signature_name") or ""

    if employee.get("joining_date"):
        try:
            joining_date = employee["joining_date"].split('T')[0]
            prefill_data["doj"] = joining_date
            prefill_data["start_date"] = joining_date
        except:
            pass
    
    # Internship specific fields
    prefill_data["internship_end_date"] = employee.get("internship_end_date")
    prefill_data["internship_completed"] = employee.get("internship_completed", False)
    if employee.get("internship_end_date"):
        prefill_data["end_date"] = employee.get("internship_end_date")
    
    # Salary related fields
    monthly_salary = employee.get("monthly_salary", 0)
    if monthly_salary and doc_type == "payslip":
        prefill_data["basic"] = int(monthly_salary * 0.4)
        prefill_data["hra"] = int(monthly_salary * 0.3)
        prefill_data["special_allowance"] = int(monthly_salary * 0.3)
        prefill_data["total_earnings"] = monthly_salary
        in_hand_salary = employee.get("in_hand_salary", 0)
        if in_hand_salary and in_hand_salary > 0:
            prefill_data["net_salary"] = in_hand_salary
            if in_hand_salary == monthly_salary:
                prefill_data["prof_tax"] = 0
                prefill_data["pf_deduction"] = 0
                prefill_data["income_tax"] = 0
                prefill_data["total_deductions"] = 0
            else:
                prefill_data["prof_tax"] = 200
                prefill_data["pf_deduction"] = int(monthly_salary * 0.12)
                prefill_data["income_tax"] = int(monthly_salary * 0.1)
                prefill_data["total_deductions"] = prefill_data["prof_tax"] + prefill_data["pf_deduction"] + prefill_data["income_tax"]
        else:
            prefill_data["prof_tax"] = 200
            prefill_data["pf_deduction"] = int(monthly_salary * 0.12)
            prefill_data["income_tax"] = int(monthly_salary * 0.1)
            prefill_data["total_deductions"] = prefill_data["prof_tax"] + prefill_data["pf_deduction"] + prefill_data["income_tax"]
            prefill_data["net_salary"] = monthly_salary - prefill_data["total_deductions"]
            prefill_data["days_worked"] = "30"
            prefill_data["month_year"] = datetime.datetime.now().strftime("%B %Y")
    
    elif monthly_salary and doc_type == "full_time_offer":
        annual_salary = monthly_salary * 12
        prefill_data["monthly_basic"] = int(monthly_salary * 0.4)
        prefill_data["annual_basic"] = prefill_data["monthly_basic"] * 12
        prefill_data["monthly_hra"] = int(monthly_salary * 0.3)
        prefill_data["annual_hra"] = prefill_data["monthly_hra"] * 12
        prefill_data["monthly_gross"] = monthly_salary
        prefill_data["annual_gross"] = annual_salary
        prefill_data["fixed_ctc_monthly"] = monthly_salary
        prefill_data["fixed_ctc_annual"] = annual_salary
        prefill_data["total_ctc_monthly"] = monthly_salary
        prefill_data["total_ctc_annual"] = annual_salary
        prefill_data["inhand_amount"] = employee.get("in_hand_salary") if employee.get("in_hand_salary") else int(monthly_salary * 0.8)
        prefill_data["employee_signature_name"] = employee.get("name", "")
    
    # Bank details
    bank_details = employee.get("bank_details", {})
    if bank_details:
        prefill_data["account_no"] = bank_details.get("account_number", "")
        prefill_data["bank_name"] = bank_details.get("bank_name", "")
        
    prefill_data["pan_no"] = employee.get("pan_no", "")
    prefill_data["pf_no"] = employee.get("pf_no", "")
    
    # Default values from config
    roi_fields_config = DOCUMENT_CONFIGS[doc_type]["roi_fields"]
    if isinstance(roi_fields_config, dict):
        for field_name, field_config in roi_fields_config.items():
            if field_name not in prefill_data and "default" in field_config:
                prefill_data[field_name] = field_config["default"]
    
    return {"prefill_data": prefill_data}

@enhanced_router.post("/enhanced-docs/preview")
def preview_document(request: DocumentPreviewRequest):
    """Generate PDF preview of document with ROI data"""
    if request.doc_type not in DOCUMENT_CONFIGS:
        return {"error": "Invalid document type"}
    
    # Add logo path for template rendering
    roi_data = request.roi_data.copy()
    
    html_bytes, error = render_doc_to_html_bytes(roi_data, request.doc_type)
    if error:
        return {"error": error}
    
    html_base64 = base64.b64encode(html_bytes).decode('utf-8')
    return {"status": "success", "html_base64": html_base64}

@enhanced_router.post("/enhanced-docs/generate")
def generate_and_save_document(request: DocumentGenerationRequest):
    """Generate final document and save to S3"""
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    if request.doc_type not in DOCUMENT_CONFIGS:
        return {"error": "Invalid document type"}
    
    employee = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not employee:
        return {"error": "Employee not found"}
    
    # ISSUE 2: Restriction for interns
    is_intern = employee.get("employment_type") == "Intern"
    if is_intern and request.doc_type == "relieving":
        return {"error": "Interns receive Internship Completion Certificate instead of Relieving Letter"}
    
    # Add logo path for template rendering
    roi_data = request.roi_data.copy()
    
    # Generate and save document
    result = render_and_save_doc(roi_data, request.doc_type)
    if "error" in result:
        return result
    
    # Save to S3
    output_path = result.get("output_path")
    if output_path:
        import os
        if os.path.exists(output_path):
            with open(output_path, "rb") as f:
                html_bytes = f.read()
            
            # Create S3 key
            doc_config = DOCUMENT_CONFIGS[request.doc_type]
            if isinstance(doc_config, dict):
                doc_name = str(doc_config.get("name", "Document")).replace(" ", "_")
            else:
                doc_name = "Document"
            s3_key = f"generated_docs/{request.employee_id}_{doc_name}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            
            # Save to S3
            s3_db.save_image(s3_key, html_bytes, content_type='text/html')
            
            # Update employee record with document reference
            # ISSUE 6: Ensure all documents are indexed for visibility
            doc_field = f"{request.doc_type}_document_key"
            generated_at_field = f"{request.doc_type}_generated_at"
            
            update_data = {
                doc_field: s3_key,
                generated_at_field: datetime.datetime.now().isoformat()
            }
            
            # Map specific doc types to their legacy keys in router.py
            if request.doc_type in ["full_time_offer", "internship_offer"]:
                update_data["offer_letter_key"] = s3_key
                update_data["offer_letter_status"] = "final" if not employee.get("employee_signature_name") else "signed"
            elif request.doc_type == "relieving":
                update_data["relieving_document_key"] = s3_key
            elif request.doc_type == "experience":
                update_data["experience_document_key"] = s3_key
            
            mongo_db.users.update_one(
                {"employee_id": request.employee_id},
                {"$set": update_data}
            )
            
            # Also add to a general 'documents' array if we want easier listing
            mongo_db.users.update_one(
                {"employee_id": request.employee_id},
                {"$addToSet": {"all_documents": {
                    "type": request.doc_type,
                    "name": DOCUMENT_CONFIGS[request.doc_type]["name"],
                    "s3_key": s3_key,
                    "generated_at": datetime.datetime.now().isoformat()
                }}}
            )
            
            result["s3_key"] = s3_key
            result["message"] = f"Document generated and saved successfully. Available for employee download."
    
    return result

@enhanced_router.get("/enhanced-docs/employee/{employee_id}/documents")
def get_employee_documents(employee_id: str):
    """Get list of generated documents for an employee"""
    if mongo_db.users is None:
        return {"documents": []}
    
    employee = mongo_db.users.find_one({"employee_id": employee_id})
    if not employee:
        return {"error": "Employee not found"}
    
    # ISSUE 6: Use the new all_documents array if it exists
    if "all_documents" in employee:
        return {"documents": employee["all_documents"]}
    
    documents = []
    for doc_type, config in DOCUMENT_CONFIGS.items():
        doc_key_field = f"{doc_type}_document_key"
        generated_at_field = f"{doc_type}_generated_at"
        
        if doc_key_field in employee:
            documents.append({
                "type": doc_type,
                "name": config["name"],
                "s3_key": employee[doc_key_field],
                "generated_at": employee.get(generated_at_field, ""),
                "download_url": f"/api/enhanced-docs/download/{employee_id}/{doc_type}"
            })
    
    return {"documents": documents}

@enhanced_router.get("/enhanced-docs/download/{employee_id}/{doc_type}")
def download_employee_document(employee_id: str, doc_type: str):
    """Download generated document for employee"""
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    employee = mongo_db.users.find_one({"employee_id": employee_id})
    if not employee:
        return {"error": "Employee not found"}
    
    doc_key_field = f"{doc_type}_document_key"
    if doc_key_field not in employee:
        return {"error": "Document not found"}
    
    s3_key = employee[doc_key_field]
    file_bytes = s3_db.get_image(s3_key)  # get_image works for any file type
    
    if not file_bytes:
        return {"error": "Document file not found in storage"}
    
    from fastapi import Response
    doc_name = DOCUMENT_CONFIGS.get(doc_type, {}).get("name", "Document")
    # All files are HTML now
    filename = f"{doc_name}_{employee_id}.html".replace(" ", "_")
    
    return Response(
        content=file_bytes,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- Historical Document Generation Endpoints ---

@enhanced_router.post("/historical-docs/generate")
def generate_historical_document(request: HistoricalDocumentRequest):
    """
    Generate and save document for a historical/external employee.
    Does NOT require the employee to be in the 'users' collection.
    Saves metadata to 'historical_employees' collection.
    """
    if mongo_db.historical_employees is None:
        return {"error": "Database error"}
    
    if request.doc_type not in DOCUMENT_CONFIGS:
        return {"error": "Invalid document type"}
    
    # Generate and save document
    roi_data = request.roi_data.copy()
    
    # Render using the existing doc engine
    from api.doc_engine import render_and_save_doc
    
    result = render_and_save_doc(roi_data, request.doc_type)
    if "error" in result:
        return result
    
    output_path = result.get("output_path")
    if output_path and os.path.exists(output_path):
        with open(output_path, "rb") as f:
            html_bytes = f.read()
        
        # Create S3 key
        doc_config = DOCUMENT_CONFIGS[request.doc_type]
        if isinstance(doc_config, dict):
            doc_name = str(doc_config.get("name", "Document")).replace(" ", "_")
        else:
            doc_name = "Document"
        emp_id = request.employee_data.get("employee_id") or f"HIST_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        s3_key = f"historical_docs/{emp_id}_{doc_name}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        # Save to S3
        s3_db.save_image(s3_key, html_bytes, content_type='text/html')
        
        # Record in historical_employees collection
        historical_record = {
            "employee_id": emp_id,
            "name": request.employee_data.get("name", ""),
            "email": request.employee_data.get("email", ""),
            "department": request.employee_data.get("department", ""),
            "position": request.employee_data.get("designation", ""),
            "doc_type": request.doc_type,
            "doc_name": DOCUMENT_CONFIGS[request.doc_type]["name"],
            "s3_key": s3_key,
            "generated_at": datetime.datetime.now().isoformat(),
            "roi_data": request.roi_data
        }
        
        mongo_db.historical_employees.insert_one(historical_record)
        
        return {
            "status": "success",
            "message": "Historical document generated and saved.",
            "s3_key": s3_key,
            "emp_id": emp_id,
            "filename": s3_key.split("/")[-1]
        }
    
    return {"error": "Failed to generate document"}

@enhanced_router.get("/historical-docs/list")
def list_historical_documents():
    """List all generated historical documents"""
    if mongo_db.historical_employees is None:
        return {"documents": []}
    
    docs = list(mongo_db.historical_employees.find({}, {"_id": 0}).sort("generated_at", -1))
    return {"documents": docs}

@enhanced_router.get("/historical-docs/download/{filename}")
def download_historical_document(filename: str):
    """Download a historical document by its filename (part of S3 key)"""
    s3_key = f"historical_docs/{filename}"
    file_bytes = s3_db.get_image(s3_key)
    
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Document not found")
    
    from fastapi import Response
    return Response(
        content=file_bytes,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )