from fastapi import APIRouter, Response, UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fpdf import FPDF
from database.s3_client import s3_db
from database.mongo_client import mongo_db
from dotenv import load_dotenv
load_dotenv(override=True)
import datetime
from dateutil.relativedelta import relativedelta
import calendar
import base64
import uuid
import json
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
from api.email_utils import (
    send_leave_notification, 
    send_item_notification,
    get_admin_emails
)
from api.admin_agent import (
    process_admin_query, 
    sync_employee_to_vector_db, 
    sync_all_to_vector_db, 
    sync_leave_request_to_vector_db, 
    sync_all_leaves_to_vector_db,
    get_vector_inventory,
    clear_vector_db
)

router = APIRouter()

@router.get("/health")
def health_check():
    """System health check endpoint"""
    status = {
        "api": "healthy",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": mongo_db.get_status(),
        "s3": "connected" if s3_db.s3_client else "disconnected"
    }
    return status

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

class AdminEmployeeCreate(BaseModel):
    name: str
    email: str
    password: str
    employment_type: str
    position: str
    monthly_salary: int

class LeaveRequest(BaseModel):
    employee_id: str
    leave_type: str
    subject: Optional[str] = ""
    start_date: str
    end_date: str
    reason: str
    approver_id: Optional[str] = None
    cc_ids: List[str] = []

class EducationDetail(BaseModel):
    institution_name: str
    department: str
    cgpa: float
    pass_year: int
    board_university: str
    certificate_base64: str

class ExperienceDetail(BaseModel):
    company_name: str
    designation: str
    duration_months: int
    reason_for_leaving: str

class ProfileUpdateRequest(BaseModel):
    employee_id: str
    full_name: Optional[str] = None
    dob: str
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    siblings_details: Optional[str] = None
    employment_type: Optional[str] = "Full-Time"
    
    # Financial/Bank
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_account: Optional[str] = None # Alias for account_number used in some paths
    bank_ifsc: Optional[str] = None
    ifsc_code: Optional[str] = None # Alias
    cif_number: Optional[str] = None
    bank_photo_base64: Optional[str] = None
    bank_passbook_base64: Optional[str] = None # Alias
    
    # Education
    education_degree: Optional[str] = None
    ug_details: Optional[EducationDetail] = None
    inter_details: Optional[EducationDetail] = None
    ssc_details: Optional[EducationDetail] = None
    education_cert_base64: Optional[str] = None
    
    # Experience
    is_experienced: bool = False
    has_experience: bool = False # Alias
    prev_company: Optional[str] = None
    prev_role: Optional[str] = None
    experience_years: Optional[str] = None
    experience_list: List[ExperienceDetail] = []
    
    # IDs & Keys
    pf_number: Optional[str] = None
    uan_number: Optional[str] = None
    pan_no: Optional[str] = None
    
    # Biometric/Files
    image_base64: Optional[str] = None
    image_left_base64: Optional[str] = None
    image_right_base64: Optional[str] = None
    passport_photo_base64: Optional[str] = None
    last_company_payslip_base64: Optional[str] = None
    # Files
class PassportPhotoUpload(BaseModel):
    employee_id: str
    passport_photo_base64: str

class DocumentRequest(BaseModel):
    employee_id: str
    doc_type: str
    reason: Optional[str] = ""


def parse_base64_with_meta(b64_string: str):
    """Parses base64 and returns (bytes, extension, mime_type)"""
    ext = ".jpg"
    mime = "image/jpeg"
    
    if ',' in b64_string:
        header, b64_string = b64_string.split(',', 1)
        if 'image/png' in header:
            ext = ".png"
            mime = "image/png"
        elif 'image/jpeg' in header or 'image/jpg' in header:
            ext = ".jpg"
            mime = "image/jpeg"
        elif 'application/pdf' in header:
            ext = ".pdf"
            mime = "application/pdf"
            
    try:
        data = base64.b64decode(b64_string)
        # Magic bytes check for robust detection
        if data.startswith(b'%PDF-'):
            ext = ".pdf"
            mime = "application/pdf"
        elif data.startswith(b'\x89PNG\r\n\x1a\n'):
            ext = ".png"
            mime = "image/png"
        elif data.startswith(b'\xff\xd8\xff'):
            ext = ".jpg"
            mime = "image/jpeg"
            
        return data, ext, mime
    except:
        # Fallback for corrupted base64 or other issues
        try:
            return base64.b64decode(b64_string + "==="), ext, mime
        except:
            return b"", ext, mime

def parse_base64(b64_string: str) -> bytes:
    data, _, _ = parse_base64_with_meta(b64_string)
    return data
    return base64.b64decode(b64_string)

@router.post("/auth/register")
def register_employee(request: EmployeeRegistrationRequest):
    # Enforce @neuzenai.com domain for employees
    if not request.email.lower().endswith("@neuzenai.com"):
        return {"error": "Only @neuzenai.com email addresses are accepted for employee registration."}

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
        db_status = mongo_db.get_status()
        return {"error": f"Database error: {db_status.get('error', 'Unknown issue')}"}
    
    # 1. Check for Admin credentials first
    if request.email == 'contact@neuzenai.com' and request.password == 'NeuzenAI@2026':
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
        db_status = mongo_db.get_status()
        return {"error": f"Database error: {db_status.get('error', 'Unknown issue')}"}
        
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "Employee not found"}

    try:
        live_photo_bytes = parse_base64(request.image_base64)
        live_photo_left_bytes = parse_base64(request.image_left_base64) if request.image_left_base64 else None
        live_photo_right_bytes = parse_base64(request.image_right_base64) if request.image_right_base64 else None
        
        # Detect Meta for Onboarding Docs (using aliased fields)
        bank_b64 = request.bank_photo_base64 or request.bank_passbook_base64
        edu_b64 = request.education_cert_base64
        
        bank_bytes, bank_ext, bank_mime = parse_base64_with_meta(bank_b64)
        edu_bytes, edu_ext, edu_mime = parse_base64_with_meta(edu_b64)
        
        payslip_bytes, payslip_ext, payslip_mime = (None, None, None)
        if request.last_company_payslip_base64:
            payslip_bytes, payslip_ext, payslip_mime = parse_base64_with_meta(request.last_company_payslip_base64)
    except Exception as e:
        return {"error": f"Invalid base64 image or document upload: {str(e)}"}

    reference_image_key = f"reference_faces/{request.employee_id}.jpg"
    reference_image_left_key = f"reference_faces/{request.employee_id}_left.jpg" if live_photo_left_bytes else None
    reference_image_right_key = f"reference_faces/{request.employee_id}_right.jpg" if live_photo_right_bytes else None
    bank_photo_key = f"documents/{request.employee_id}_bank{bank_ext}"
    edu_cert_key = f"documents/{request.employee_id}_edu{edu_ext}"
    payslip_key = f"documents/{request.employee_id}_last_payslip{payslip_ext}" if payslip_bytes else None
    
    # Save files to S3
    s3_db.save_image(reference_image_key, live_photo_bytes, content_type='image/jpeg')
    if live_photo_left_bytes: s3_db.save_image(reference_image_left_key, live_photo_left_bytes, content_type='image/jpeg')
    if live_photo_right_bytes: s3_db.save_image(reference_image_right_key, live_photo_right_bytes, content_type='image/jpeg')
    
    s3_db.save_image(bank_photo_key, bank_bytes, content_type=bank_mime)
    s3_db.save_image(edu_cert_key, edu_bytes, content_type=edu_mime)
    if payslip_bytes:
        s3_db.save_image(payslip_key, payslip_bytes, content_type=payslip_mime)

    
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

@router.get("/employee/directory")
def get_employee_directory():
    if mongo_db.users is None:
        return {"employees": []}
    # Only return name and ID for security/privacy
    employees = list(mongo_db.users.find(
        {"status": "approved"}, 
        {"_id": 0, "name": 1, "employee_id": 1}
    ).sort("name", 1))
    return {"employees": employees}

@router.get("/employee/approvers")
def get_possible_approvers():
    """Fetch list of admins/superadmins for the 'Send To' dropdown."""
    if mongo_db.users is None:
        return {"approvers": []}
    approvers = list(mongo_db.users.find(
        {"role": {"$in": ["admin", "super_admin", "hr", "hr_responsible"]}}, 
        {"_id": 0, "name": 1, "employee_id": 1, "role": 1}
    ).sort("name", 1))
    return {"approvers": approvers}

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
    role: Optional[str] = "employee"
    tax_deduction_rate: Optional[float] = None
    pf_deduction_rate: Optional[float] = None

class EmployeeUpdate(BaseModel):
    role: Optional[str] = None
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
    tax_deduction_rate: Optional[float] = None
    pf_deduction_rate: Optional[float] = None
    payroll_settings: Optional[Dict[str, Any]] = None


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
            "role": request.role,
            "tax_deduction_rate": request.tax_deduction_rate,
            "pf_deduction_rate": request.pf_deduction_rate,
            "joining_date": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    else:
        status_to_set = "rejected"
        update_fields = {"status": status_to_set}
        
    mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": update_fields}
    )
    
    if request.action == "approve":
        sync_employee_to_vector_db(request.employee_id, mongo_db)
    
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
    set_ops: Dict[str, Any] = {}
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

    # Special handling for payroll_settings if provided
    if "payroll_settings" in update_data:
        set_ops["payroll_settings"] = update_data["payroll_settings"]

    result = mongo_db.users.update_one(
        {"employee_id": employee_id},
        {"$set": set_ops}
    )
    
    if result.matched_count == 0:
        return {"error": "Employee not found"}
        
    sync_employee_to_vector_db(employee_id, mongo_db)
    return {"message": "Employee updated successfully"}

@router.delete("/admin/employee/{employee_id}")
def delete_employee(employee_id: str):
    """Permanently delete an employee record from the database"""
    if mongo_db.users is None:
        db_status = mongo_db.get_status()
        return {"error": f"Database error: {db_status.get('error', 'Unknown issue')}"}
    
    result = mongo_db.users.delete_one({"employee_id": employee_id})
    if result.deleted_count == 0:
        return {"error": "Employee not found"}
        
    return {"message": f"Employee {employee_id} deleted successfully"}

@router.post("/admin/create-employee")
def admin_create_employee(request: AdminEmployeeCreate):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    if mongo_db.users.find_one({"email": request.email}):
        return {"error": "Email already exists"}
        
    emp_id = f"EMP{uuid.uuid4().hex[:6].upper()}"
    
    user_record = {
        "employee_id": emp_id,
        "name": request.name,
        "email": request.email,
        "password": request.password,
        "role": "employee",
        "status": "onboarding_pending",
        "employment_type": request.employment_type,
        "position": request.position,
        "monthly_salary": request.monthly_salary,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "joining_date": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    mongo_db.users.insert_one(user_record)
    return {"message": "Employee created successfully.", "employee_id": emp_id}

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

@router.get("/admin/vector-inventory")
def vector_inventory_api():
    """Diagnostic tool to see what is actually in the vector database."""
    inventory = get_vector_inventory()
    return {"inventory": inventory}

@router.post("/admin/sync-all")
def sync_all_data():
    """Sync all employees and leaves to vector DB with status report. Now perform Clean Sync."""
    # Step 1: Purge old data to ensure clean state (Requested by user)
    purged = clear_vector_db()
    
    # Step 2: Sync fresh data
    emp_count = sync_all_to_vector_db(mongo_db)
    leave_count = sync_all_leaves_to_vector_db(mongo_db)
    
    return {
        "status": "success", 
        "message": "Full system sync complete",
        "purge_performed": purged,
        "employees_synced": emp_count,
        "leaves_synced": leave_count
    }

class AdminCopilotRequest(BaseModel):
    query: str

class EmployeeChatRequest(BaseModel):
    employee_id: str
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

def get_leave_type_short(leave_type: str) -> str:
    # Mapping for common leave types to 2-letter codes for calendar
    l_type = str(leave_type).lower()
    if "sick" in l_type: return "SL"
    if "casual" in l_type: return "CL"
    if "paid leave" in l_type: return "PL"
    if "annual" in l_type or "privilege" in l_type: return "AL" # Annual Leave
    if "comp" in l_type: return "CO"
    return "L"

@router.post("/leaves/apply")
def apply_leave(request: LeaveRequest):
    record = request.dict()
    record["status"] = "Pending Admin Approval"
    record["leave_type_short"] = get_leave_type_short(record.get("leave_type", ""))
    record["applied_on"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record["id"] = uuid.uuid4().hex[:8]
    if mongo_db.db is not None:
        mongo_db.leaves.insert_one(record)
        
        # Trigger Email Notification
        try:
            user = mongo_db.users.find_one({"employee_id": request.employee_id}, {"name": 1})
            emp_name = user.get("name", "An Employee") if user else "An Employee"
            
            # Fetch current balance context for the Admin
            balance_data = get_leave_balance(request.employee_id)
            balance_str = "Unavailable"
            if "types" in balance_data:
                for t in balance_data["types"]:
                    if t["name"] == record.get("leave_type"):
                        balance_str = f"{t['remaining']} Days Remaining"
                        break
            
            # Add balance to record for email rendering
            record["current_balance"] = balance_str
            
            # Index in Vector DB for Admin Intelligence
            try:
                sync_leave_request_to_vector_db(record, mongo_db)
            except Exception as v_err:
                print(f"Vector Sync Warning: {v_err}")

            send_leave_notification(emp_name, record, record["id"], request.approver_id, request.cc_ids)
        except Exception as e:
            print(f"Leave Notification Failed: {e}")

    if "_id" in record: del record["_id"]
    return {"message": "Leave submitted pending approval", "record": record}

@router.get("/admin/leaves")
def get_all_leaves():
    if mongo_db.db is None:
        return {"leaves": []}
    
    leaves = list(mongo_db.leaves.find({}, {"_id": 0}).sort("applied_on", -1))
    
    # Enrich with employee balance to help admin decide
    enriched_leaves = []
    for leaf in leaves:
        emp_id = leaf.get("employee_id")
        if emp_id:
            # 1. Fetch Balance
            balance = get_leave_balance(emp_id)
            leaf["employee_balance"] = balance
            
            # 2. Fetch Name
            user_doc = mongo_db.users.find_one({"employee_id": emp_id}, {"name": 1, "_id": 0})
            if user_doc:
                leaf["employee_name"] = user_doc.get("name")
        enriched_leaves.append(leaf)
        
    return {"leaves": enriched_leaves}

@router.get("/employee/leaves")
def get_employee_leaves(employee_id: str):
    if mongo_db.db is None:
        return {"leaves": []}
    leaves = list(mongo_db.leaves.find({"employee_id": employee_id}, {"_id": 0}).sort("applied_on", -1))
    return {"leaves": leaves}

class LeaveStatusUpdate(BaseModel):
    status: str

@router.put("/admin/leaves/{leave_id}/status")
def update_leave(leave_id: str, update: LeaveStatusUpdate):
    if mongo_db.db is not None:
        mongo_db.leaves.update_one({"id": leave_id}, {"$set": {"status": update.status}})
        
        # Sync Status Change to Vector DB
        try:
            updated_record = mongo_db.leaves.find_one({"id": leave_id})
            if updated_record:
                sync_leave_request_to_vector_db(updated_record, mongo_db)
        except Exception as v_err:
            print(f"Vector Status Sync Warning: {v_err}")
            
    return {"message": f"Leave {leave_id} updated to {update.status}"}

@router.get("/admin/leaves/approve-direct")
def approve_leave_direct(id: str, status: str):
    """Direct approval from email link."""
    if mongo_db.db is not None:
        mongo_db.leaves.update_one({"id": id}, {"$set": {"status": status}})
        
        # Sync Status Change to Vector DB
        try:
            updated_record = mongo_db.leaves.find_one({"id": id})
            if updated_record:
                sync_leave_request_to_vector_db(updated_record, mongo_db)
        except Exception as v_err:
            print(f"Vector Status Sync Warning: {v_err}")

    color = "#10B981" if status == "Approved" else "#EF4444"
    icon = "✅" if status == "Approved" else "❌"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Action Successful | NeuzenAI HRMS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    </head>
    <body style="font-family: 'Inter', sans-serif; background-color: #f8fafc; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
        <div style="background: #ffffff; padding: 60px 40px; border-radius: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); text-align: center; max-width: 440px; width: 90%; border: 1px solid #e2e8f0;">
            <div style="background-color: {color}10; width: 100px; height: 100px; border-radius: 50px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; border: 2px solid {color}30;">
                <span style="font-size: 48px;">{icon}</span>
            </div>
            
            <h1 style="color: #0f172a; margin: 0 0 16px 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">Request {status}!</h1>
            <p style="color: #64748b; font-size: 18px; line-height: 1.6; margin-bottom: 40px;">
                The leave application has been processed successfully. The employee will be notified via email.
            </p>
            
            <div style="padding-top: 32px; border-top: 1.5px solid #f1f5f9;">
                <a href="https://neuzenaihr.web.app/admin" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 600; text-decoration: none; font-size: 16px; transition: all 0.2s;">
                    Back to Admin Dashboard
                </a>
            </div>
            
            <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">You can safely close this window.</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

# --- Item Requests ---
class ItemRequest(BaseModel):
    employee_id: str
    subject: str
    item_name: str
    reason: str
    quantity: int = 1
    approver_id: Optional[str] = None
    cc_ids: List[str] = []
    request_type: str = "item" # "item" or "general"

@router.post("/items/request")
def request_item(request: ItemRequest):
    if mongo_db.item_requests is None:
        return {"error": "Database error"}
    
    record = request.dict()
    record["id"] = uuid.uuid4().hex[:8]
    record["status"] = "Pending"
    record["applied_on"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    mongo_db.item_requests.insert_one(record)
    
    # Trigger Email Notification
    try:
        user = mongo_db.users.find_one({"employee_id": request.employee_id}, {"name": 1})
        emp_name = user.get("name", "An Employee") if user else "An Employee"
        send_item_notification(emp_name, record, record["id"], request.approver_id)
    except Exception as e:
        print(f"Item Notification Failed: {e}")

    if "_id" in record: del record["_id"]
    return {"message": "Item request submitted", "record": record}

@router.get("/admin/items/all")
def get_all_item_requests():
    if mongo_db.item_requests is None:
        return {"requests": []}
    requests = list(mongo_db.item_requests.find({}, {"_id": 0}))
    return {"requests": requests}

@router.get("/items/my-requests")
def get_my_item_requests(employee_id: str):
    if mongo_db.item_requests is None:
        return {"requests": []}
    requests = list(mongo_db.item_requests.find({"employee_id": employee_id}, {"_id": 0}))
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

@router.get("/admin/items/approve-direct")
def approve_item_direct(id: str, status: str):
    """Direct approval from email link for items."""
    if mongo_db.item_requests is not None:
        mongo_db.item_requests.update_one({"id": id}, {"$set": {"status": status}})
    
    color = "#3B82F6" if status == "Approved" else "#EF4444"
    icon = "✅" if status == "Approved" else "❌"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Action Successful | NeuzenAI HRMS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    </head>
    <body style="font-family: 'Inter', sans-serif; background-color: #f8fafc; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
        <div style="background: #ffffff; padding: 60px 40px; border-radius: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); text-align: center; max-width: 440px; width: 90%; border: 1px solid #e2e8f0;">
            <div style="background-color: {color}10; width: 100px; height: 100px; border-radius: 50px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; border: 2px solid {color}30;">
                <span style="font-size: 48px;">{icon}</span>
            </div>
            
            <h1 style="color: #0f172a; margin: 0 0 16px 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">Item Request {status}!</h1>
            <p style="color: #64748b; font-size: 18px; line-height: 1.6; margin-bottom: 40px;">
                The item request status has been updated. The employee can now view the status in their portal.
            </p>
            
            <div style="padding-top: 32px; border-top: 1.5px solid #f1f5f9;">
                <a href="https://neuzenaihr.web.app/admin" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 600; text-decoration: none; font-size: 16px; transition: all 0.2s;">
                    Back to Admin Dashboard
                </a>
            </div>
            
            <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">You can safely close this window.</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

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

@router.post("/admin/holidays/bulk")
def add_holidays_bulk(request: List[HolidayRequest]):
    if mongo_db.db is None:
        return {"error": "Database error"}
    
    records = []
    for h in request:
        # Check if already exists to avoid redundant inserts
        exists = mongo_db.holidays.find_one({"date": h.date})
        if not exists:
            records.append({
                "date": h.date,
                "name": h.name,
                "type": h.type,
                "id": uuid.uuid4().hex[:8]
            })
    
    if records:
        mongo_db.holidays.insert_many(records)
        return {"message": f"Successfully added {len(records)} holidays", "count": len(records)}
    
    return {"message": "No new holidays to add (all already exist)", "count": 0}

@router.get("/admin/holidays/ai-fetch")
def get_ai_holidays(year: int = 2026):
    """
    Experimental: Uses Google Gemini to fetch official holidays for India for a specific year.
    This replaces the external Nager.Date API when it's unstable.
    """
    try:
        # Read the model from .env, replace spaces with dashes as the API expects no spaces
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").replace(" ", "-").lower()
        model = genai.GenerativeModel(model_name)
        prompt = (
            f"List a comprehensive set of at least 25 official public, national, regional, and restricted holidays in India for the year {year}. "
            "CRITICAL: Accuracy is paramount. Use the following reference dates for 2026 major festivals if the year is 2026: "
            "Republic Day: Jan 26, Makar Sankranti: Jan 14, Maha Shivaratri: Feb 15, Holi: Mar 04, Ugadi/Gudi Padwa: Mar 19, Eid al-Fitr: Mar 20, "
            "Good Friday: Apr 03, Ambedkar Jayanti: Apr 14, Independence Day: Aug 15, Raksha Bandhan: Aug 28, Krishna Janmashtami: Sep 04, "
            "Ganesh Chaturthi (Vinayaka Chaturthi): Sep 14, Gandhi Jayanti: Oct 02, Dussehra (Vijaya Dashami): Oct 20, Diwali (Deepavali): Nov 08, Christmas: Dec 25. "
            "Include these and other significant regional festivals (like Bonalu, Bathukamma, Onam, etc.). "
            "Return ONLY a raw JSON array of objects. "
            "Each object must have exactly two fields: 'name' and 'date' (format: YYYY-MM-DD). "
            "Do not include any extra text, markdown blocks, or formatting."
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Robust JSON extraction from markdown if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        holidays = json.loads(text)
        # Ensure it's a list
        if not isinstance(holidays, list):
            raise ValueError("AI response was not a list")
            
        return holidays
    except Exception as e:
        print(f"AI Holiday Fetching Failed: {e}")
        # Comprehensive fallback list of Indian holidays if AI fails
        return [
            {"name": "New Year's Day", "date": f"{year}-01-01"},
            {"name": "Bhogi", "date": f"{year}-01-13"},
            {"name": "Makar Sankranti / Pongal", "date": f"{year}-01-14"},
            {"name": "Republic Day", "date": f"{year}-01-26"},
            {"name": "Maha Shivaratri", "date": f"{year}-02-15"},
            {"name": "Holi", "date": f"{year}-03-04"},
            {"name": "Ugadi / Gudi Padwa", "date": f"{year}-03-19"},
            {"name": "Good Friday", "date": f"{year}-04-03"},
            {"name": "Eid al-Fitr", "date": f"{year}-03-20"},
            {"name": "Ambedkar Jayanti", "date": f"{year}-04-14"},
            {"name": "May Day", "date": f"{year}-05-01"},
            {"name": "Bakrid / Eid al-Adha", "date": f"{year}-05-27"},
            {"name": "Independence Day", "date": f"{year}-08-15"},
            {"name": "Raksha Bandhan", "date": f"{year}-08-28"},
            {"name": "Krishna Janmashtami", "date": f"{year}-09-04"},
            {"name": "Vinayaka Chaturthi (Ganesh Chaturthi)", "date": f"{year}-09-14"},
            {"name": "Gandhi Jayanti", "date": f"{year}-10-02"},
            {"name": "Maha Navami", "date": f"{year}-10-19"},
            {"name": "Vijaya Dashami (Dussehra)", "date": f"{year}-10-20"},
            {"name": "Diwali (Deepavali)", "date": f"{year}-11-08"},
            {"name": "Christmas Day", "date": f"{year}-12-25"}
        ]

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

@router.get("/employee/attendance/history")
def get_attendance_history(employee_id: str):
    if mongo_db.attendance is None:
        return {"history": []}
    
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    # Get only today's records for the employee
    history = list(mongo_db.attendance.find(
        {"employee_id": employee_id, "timestamp": {"$regex": f"^{today_str}"}},
        {"_id": 0}
    ).sort("timestamp", -1))
    
    return {"history": history}

@router.get("/employee/holidays")
def get_employee_holidays():
    # Employees see the same holidays as admin
    return get_holidays()

@router.get("/admin/analytics/trend")
def get_analytics_trend():
    if mongo_db.db is None:
        return {"trend": []}
    
    # Calculate last 6 months
    now = datetime.datetime.utcnow()
    months = []
    for i in range(5, -1, -1):
        m = now - relativedelta(months=i)
        months.append(m.strftime("%Y-%m"))

    trend_data = []
    for m_prefix in months:
        # Calculate next month prefix for range queries
        yr, mn = map(int, m_prefix.split("-"))
        if mn == 12:
            next_m = f"{yr+1}-01"
        else:
            next_m = f"{yr}-{mn+1:02d}"

        # 1. Joins
        joins = mongo_db.users.count_documents({
            "status": "approved",
            "$or": [
                {"joining_date": {"$regex": f"^{m_prefix}"}},
                {"onboarding_completed_at": {"$regex": f"^{m_prefix}"}}
            ]
        })
        
        # 2. Exits
        exits = mongo_db.users.count_documents({
            "status": {"$in": ["separated", "inactive"]},
            "$or": [
                {"separation_date": {"$regex": f"^{m_prefix}"}},
                {"deactivated_at": {"$regex": f"^{m_prefix}"}}
            ]
        })

        # 3. Aggregation Data (Historical Context)
        # Use point-in-time total: those joined before the end of this month
        total_emps = mongo_db.users.count_documents({
            "status": "approved",
            "joining_date": {"$lt": next_m}
        })
        
        avg_attendance = 0
        avg_absentees = 0
        leaves_vol = 0
        
        if total_emps > 0:
            # Group all sign-ins by day
            punches = list(mongo_db.attendance.find({
                "timestamp": {"$regex": f"^{m_prefix}"},
                "action": "sign_in"
            }))
            days = {}
            for p in punches:
                d = p["timestamp"][:10]
                if d not in days: days[d] = set()
                days[d].add(p["employee_id"])
            
            if days:
                attendance_vals = []
                absentee_vals = []
                
                for d, emps_present in days.items():
                    # count unique people on leave this specific day
                    on_leave_distinct = mongo_db.leaves.distinct("employee_id", {
                        "status": {"$regex": "Approved"},
                        "start_date": {"$lte": d},
                        "end_date": {"$gte": d}
                    })
                    
                    present_count = len(emps_present)
                    on_leave_count = len(on_leave_distinct)
                    # Use point-in-time total for this specific day (simplified to month total)
                    unaccounted = max(0, total_emps - (present_count + on_leave_count))
                    
                    attendance_vals.append((present_count / total_emps) * 100)
                    absentee_vals.append(unaccounted)
                
                avg_attendance = round(sum(attendance_vals) / len(attendance_vals), 1)
                avg_absentees = round(sum(absentee_vals) / len(absentee_vals), 1)

        # 4. Total Approved Leaves
        leaves_vol = mongo_db.leaves.count_documents({
            "status": {"$regex": "Approved"},
            "start_date": {"$regex": f"^{m_prefix}"}
        })

        month_name = datetime.datetime.strptime(m_prefix, "%Y-%m").strftime("%b")
        
        trend_data.append({
            "month": month_name,
            "joins": joins,
            "exits": exits,
            "attendance": avg_attendance,
            "leaves": leaves_vol,
            "absentees": avg_absentees
        })

    return {"trend": trend_data}

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
    
    # Use local time for "Today" to match user expectation
    today_dt = datetime.datetime.now() # This will use server local time
    today_str = today_dt.strftime('%Y-%m-%d')
    
    total_employees = mongo_db.users.count_documents({"status": "approved"})
    
    # Count distinct sign-ins today
    present_today = 0
    if mongo_db.attendance is not None:
        # Crucial: distinct employee IDs who have signed in today
        present_today_list = mongo_db.attendance.distinct("employee_id", {
            "timestamp": {"$regex": f"^{today_str}"},
            "action": "sign_in"
        })
        present_today = len(present_today_list)
        
    on_leave = 0
    if mongo_db.db is not None:
        on_leave_list = mongo_db.leaves.distinct("employee_id", {
            "status": {"$regex": "Approved"},
            "start_date": {"$lte": today_str},
            "end_date": {"$gte": today_str}
        })
        on_leave = len(on_leave_list)

    return {
        "total_employees": total_employees,
        "present_today": present_today,
        "on_leave": on_leave,
        "open_tickets": 12, # Still mock for now as requested or until schema exists
        "average_engagement_score": 88 # Mock as requested
    }

@router.get("/admin/salary-report/{month_year}")
def get_monthly_salary_report(month_year: str):
    if mongo_db.users is None or mongo_db.attendance is None:
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
    total_working_days_in_month: int = 0
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
    
    settings = get_company_settings()
    for emp in employees:
        salary_info = calculate_month_salary(emp, year, month, settings)
        
        report.append({
            "employee_id": emp["employee_id"],
            "name": emp["name"],
            "expected_working_days": salary_info["expected_working_days"],
            "actual_presence": salary_info["actual_presence"],
            "leaves_taken": salary_info["leaves_taken"],
            "absent_days": salary_info["lop_days"],
            "gross_salary": salary_info["gross_salary"],
            "monthly_salary": salary_info["monthly_salary"],
            "lop_deduction": salary_info["lop_deduction"],
            "net_salary": salary_info["net_salary"],
            "bank_details": emp.get("bank_details", {}),
            "pan_no": emp.get("pan_no", "")
        })
        
    return {"month_year": month_year, "report": report}

@router.get("/admin/photos/{photo_key:path}")
def get_admin_photo(photo_key: str):
    """
    Serves images directly from S3. 
    Crucial for displaying employee photos and attendance scans.
    """
    data = s3_db.get_image(photo_key)
    if not data:
        return Response(status_code=404)
    
    # Sniff content type
    mime = "image/jpeg"
    if photo_key.lower().endswith(".pdf") or data.startswith(b'%PDF-'):
        mime = "application/pdf"
    elif photo_key.lower().endswith(".png") or data.startswith(b'\x89PNG\r\n\x1a\n'):
        mime = "image/png"
        
    return Response(content=data, media_type=mime)

# --- Attendance ---
# ProfileUpdateRequest consolidated at top
class AttendanceScanRequest(BaseModel):
    employee_id: str
    image_base64: Optional[str] = None
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

    if mongo_db.attendance is None:
        return {"error": "Attendance service is currently unavailable."}

    # 0.5 Check for duplicate actions today
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    # Get the latest action today to enforce alternating sequence
    latest_today = mongo_db.attendance.find_one(
        {"employee_id": request.employee_id, "timestamp": {"$regex": f"^{today_str}"}},
        sort=[("timestamp", -1)]
    )
    
    if latest_today:
        if latest_today["action"] == request.action_type:
            action_name = "Sign In" if request.action_type == "sign_in" else "Sign Out"
            next_action = "Sign Out" if request.action_type == "sign_in" else "Sign In"
            return {"error": f"You have already performed a {action_name}. Please {next_action} before another {action_name}."}
    else:
        # First action of the day must be sign_in
        if request.action_type == "sign_out":
            return {"error": "You must Sign In before you can Sign Out."}

    # 1. Decode Image (Optional)
    image_key = None
    if request.image_base64:
        try:
            base64_data = request.image_base64.split(',')[1] if ',' in request.image_base64 else request.image_base64
            image_bytes = base64.b64decode(base64_data)
            
            timestamp_str = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            image_key = f"attendance_faces/{request.employee_id}_{timestamp_str}.jpg"
            
            # 2. Save Snapshot to S3 (For auditing)
            s3_db.save_image(image_key, image_bytes, content_type='image/jpeg')
        except Exception as e:
            print(f"Image decode error (skipping snapshot): {e}")
            # We continue without image if decoding fails
            image_key = None
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 2.5 Save Profile Photo for ID Card if provided
    if hasattr(request, 'image_profile_base64') and request.image_profile_base64:
        profile_b64 = request.image_profile_base64.split(',')[1] if ',' in request.image_profile_base64 else request.image_profile_base64
        profile_bytes = base64.b64decode(profile_b64)
        profile_image_key = f"reference_faces/{request.employee_id}_id_card.jpg"
        s3_db.save_image(profile_image_key, profile_bytes, content_type='image/jpeg')
        # Update user record with the new official ID photo
        mongo_db.users.update_one(
            {"employee_id": request.employee_id},
            {"$set": {"id_card_photo_key": profile_image_key}}
        )
    
    # 3. Save to MongoDB (Simplified Record)
    attendance_record = {
        "employee_id": request.employee_id,
        "action": request.action_type,
        "timestamp": timestamp,
        "location": request.location,
        "s3_image_key": image_key,
        "verified": True # Manual audit available
    }
    mongo_db.attendance.insert_one(attendance_record)

    # NEW: Admin Notification for attendance
    if mongo_db.db["notifications"] is not None:
        action_verb = "signed in" if request.action_type == "sign_in" else "signed out"
        mongo_db.db["notifications"].insert_one({
            "type": "attendance",
            "message": f"Employee {request.employee_id} {action_verb}.",
            "employee_id": request.employee_id,
            "action": request.action_type,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    if "_id" in attendance_record:
        attendance_record["_id"] = str(attendance_record["_id"])

    # 4. Generate Warnings for Sign-out
    warning = None
    if request.action_type == "sign_out" and latest_today:
        try:
            t1 = datetime.datetime.fromisoformat(latest_today["timestamp"].replace('Z', '+00:00'))
            t2 = datetime.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            work_sec = int((t2 - t1).total_seconds())
            
            is_intern = user.get("employment_type") == "Intern"
            
            if work_sec < 2 * 3600:
                warning = "You are signing out before 2 hours. This is considered a 'full-day type' deduction (1.0 cut)."
            elif work_sec < 5 * 3600:
                if is_intern:
                    warning = "You are signing out before 5 hours. This is a half-day deduction (Interns get 2 grace sessions per month)."
                else:
                    warning = "You are signing out before 5 hours. Full-Time employees must take permission from Admin/HR to avoid a half-day deduction."
            elif work_sec < 7 * 3600:
                warning = "You are signouting before 9 hours. No salary cut for half-day up to 3 times per month for both Interns and Full-Time."
            elif work_sec < 9 * 3600:
                warning = "You are signouting before 9 hours. Please note that 9 hours is required for a full day."
        except Exception as e:
            print(f"Warning calculation error: {e}")

    return {
        "message": f"Identity verified against reference. Successfully processed {request.action_type}",
        "warning": warning,
        "record": attendance_record
    }

class IDPhotoUpload(BaseModel):
    employee_id: str
    image_base64: str

@router.post("/employee/complete-onboarding")
def complete_onboarding(request: ProfileUpdateRequest):
    if mongo_db.users is None:
        return {"error": "Database offline"}
    
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "User not found"}

    # 1. Process Files and Save to S3
    try:
        # Passport Photo
        passport_b64 = request.passport_photo_base64 or request.image_base64
        passport_bytes, passport_ext, passport_mime = parse_base64_with_meta(passport_b64)
        passport_key = f"profile_photos/{request.employee_id}_passport{passport_ext}"
        s3_db.save_image(passport_key, passport_bytes, content_type=passport_mime)
        
        # Bank Passbook
        bank_b64 = request.bank_passbook_base64 or request.bank_photo_base64
        bank_bytes, bank_ext, bank_mime = parse_base64_with_meta(bank_b64)
        bank_key = f"onboarding_docs/{request.employee_id}_bank_passbook{bank_ext}"
        s3_db.save_image(bank_key, bank_bytes, content_type=bank_mime)
        
        # Education Certs
        # Handle both list and direct cert base64
        edu_b64 = request.education_cert_base64
        if not edu_b64 and request.ug_details:
            edu_b64 = request.ug_details.certificate_base64
            
        ug_bytes, ug_ext, ug_mime = parse_base64_with_meta(edu_b64)
        ug_key = f"onboarding_docs/{request.employee_id}_edu_cert{ug_ext}"
        s3_db.save_image(ug_key, ug_bytes, content_type=ug_mime)
        
    except Exception as e:
        return {"error": f"Document processing failed: {str(e)}"}

    # 2. Update User Record
    # Logic: If account was pre-created by admin, approve immediately.
    # Otherwise, set to pending_approval.
    new_status = "approved" if user.get("status") == "onboarding_pending" else "pending_approval"
    
    onboarding_data = {
        "full_name": request.full_name,
        "dob": request.dob,
        "father_name": request.father_name,
        "mother_name": request.mother_name,
        "siblings_details": request.siblings_details,
        "bank_details": {
            "bank_name": request.bank_name,
            "account_number": request.account_number,
            "ifsc_code": request.ifsc_code,
            "cif_number": request.cif_number,
            "passbook_url": bank_key
        },
        "education": {
            "ug": {
                "institution": request.ug_details.institution_name,
                "department": request.ug_details.department,
                "cgpa": request.ug_details.cgpa,
                "pass_year": request.ug_details.pass_year,
                "university": request.ug_details.board_university,
                "cert_url": ug_key
            },
            "intermediate": {
                "institution": request.inter_details.institution_name,
                "department": request.inter_details.department,
                "cgpa": request.inter_details.cgpa,
                "pass_year": request.inter_details.pass_year,
                "board": request.inter_details.board_university,
                "cert_url": inter_key
            },
            "ssc": {
                "institution": request.ssc_details.institution_name,
                "department": request.ssc_details.department,
                "cgpa": request.ssc_details.cgpa,
                "pass_year": request.ssc_details.pass_year,
                "board": request.ssc_details.board_university,
                "cert_url": ssc_key
            }
        },
        "experience": {
            "has_experience": request.has_experience,
            "list": [jsonable_encoder(exp) for exp in request.experience_list],
            "pf_number": request.pf_number,
            "uan_number": request.uan_number
        },
        "passport_photo_url": passport_key,
        "status": new_status,
        "onboarding_completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": onboarding_data}
    )
    
    if new_status == "approved":
        sync_employee_to_vector_db(request.employee_id, mongo_db)

    msg = "Onboarding completed! Your account is now active." if new_status == "approved" else "Onboarding information submitted successfully! Pending HR approval."
    return {"message": msg, "status": "success", "new_status": new_status}

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
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    model = genai.GenerativeModel(model_name)
    
    context = "Company policies retrieval is currently disabled."

    prompt = f"""
    You are the NeuzenAI Employee HR Copilot. Use the context below to answer the employee's query.
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
        return {"last_punch": None, "status": "Not Signed In", "total_hours_today": "0h 0m"}
    
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    # Get all swipes today to calculate cumulative time
    swipes = list(mongo_db.attendance.find(
        {"employee_id": employee_id, "timestamp": {"$regex": f"^{today_str}"}},
        sort=[("timestamp", 1)]
    ))
    
    total_sec = 0
    in_time = None
    for s in swipes:
        if s["action"] == "sign_in":
            in_time = datetime.datetime.fromisoformat(s["timestamp"].replace('Z', '+00:00'))
        elif s["action"] == "sign_out" and in_time:
            out_time = datetime.datetime.fromisoformat(s["timestamp"].replace('Z', '+00:00'))
            total_sec += (out_time - in_time).total_seconds()
            in_time = None
    
    # Status is based on the LAST punch
    latest = swipes[-1] if swipes else None
    
    # If currently signed in, add time so far to the total display
    current_sec = total_sec
    if in_time:
        now = datetime.datetime.now(datetime.timezone.utc)
        current_sec += (now - in_time).total_seconds()
    
    total_hours_str = f"{int(current_sec // 3600)}h {int((current_sec % 3600) // 60)}m"

    if latest:
        return {
            "last_punch": latest["timestamp"],
            "action": latest["action"],
            "status": "Signed In" if latest["action"] == "sign_in" else "Signed Out",
            "total_hours_today": total_hours_str
        }
    
    return {"last_punch": None, "status": "Not Signed In", "total_hours_today": "0h 0m"}

@router.get("/employee/attendance/calendar")
def get_attendance_calendar(employee_id: str, year: Optional[int] = None, month: Optional[int] = None):
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
            
    # 2. Determine Date Range
    now = datetime.datetime.utcnow()
    today = now.date()
    if year is None: year = now.year
    if month is None: month = now.month
    
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
        
    # 4. Fetch Approved Leaves (all status variants)
    leaves = []
    if mongo_db.leaves is not None:
        # Match anything starting with 'Approved'
        leaves = list(mongo_db.leaves.find({
            "employee_id": employee_id,
            "status": {"$regex": "^Approved", "$options": "i"}
        }))

    # 5. Fetch Global Holidays and Workday Overrides
    holidays = list(mongo_db.holidays.find({"date": {"$regex": f"^{month_prefix}"}}, {"_id": 0}))
    holiday_map = {h['date']: h for h in holidays}
    overrides = list(mongo_db.workday_overrides.find({"date": {"$regex": f"^{month_prefix}"}}, {"_id": 0}))
    override_map = {o['date']: o for o in overrides}
    
    
    final_history = []
    ft_early_count = 0 # Track early signouts for Full-Time (7-9h)
    
    # Parse joining date for comparison
    joining_date: Optional[datetime.date] = None
    if joining_date_str:
        try:
            joining_date = datetime.datetime.fromisoformat(joining_date_str).date()
        except: pass

    import calendar
    _, last_day_in_month = calendar.monthrange(year, month)
    
    ft_grace_5_9_count = 0
    int_grace_5_9_count = 0
    int_grace_2_5_count = 0
    # Iterate through every day of the month
    for d in range(1, last_day_in_month + 1):
        current_date: datetime.date = datetime.date(year, month, d)
        day_str = current_date.isoformat()
        
        # Default day data
        is_future_day = current_date > today
        data = {
            "date": day_str,
            "first_in": "-",
            "last_out": "-",
            "total_work_hrs": "-",
            # Default to 'Scheduled' for future, default placeholder for others
            "status": "Scheduled" if is_future_day else "Pending",
            "status_char": "-" if is_future_day else "?",
            "color": "#9CA3AF" if is_future_day else "#9CA3AF",
            "deduction": 0.0,
            "day_label": "Working Day"
        }
        
        # Rule: Count from the Joining Date (DOJ) onwards
        if joining_date and current_date < joining_date:
            data["status"] = "Not Applicable"
            data["status_char"] = "-"
            data["color"] = "var(--text-muted)"
            data["day_label"] = "Pre-Joining"
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
            
        # Check for approved leaves (normalize time strings)
        approved_leave = next((l for l in leaves if l["start_date"].split('T')[0] <= day_str <= l["end_date"].split('T')[0]), None)
        
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
            if tot_sec >= 9 * 3600 and is_originally_non_working:
                # Earned Comp-Off Request
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
                data["status_char"] = "P"
                data["color"] = "var(--secondary)"
                data["deduction"] = 0.0
            elif is_working_day:
                if tot_sec >= 9 * 3600 or is_forgot_logout:
                    data["status"] = "Present" if tot_sec >= 9 * 3600 else "Present (Forgot Logout)"
                    data["status_char"] = "P"
                    data["color"] = "var(--secondary)"
                    data["deduction"] = 0.0
                else:
                    # Apply Grace Periods/Penalties if NOT an approved leave
                    if not approved_leave:
                        if employment_type == "Intern":
                            if tot_sec >= 5 * 3600: # 5-9h range
                                data["status"] = "Half Day"
                                data["status_char"] = "HD"
                                if int_grace_5_9_count < 3:
                                    int_grace_5_9_count += 1
                                    data["deduction"] = 0.0
                                    data["color"] = "var(--secondary)"
                                else:
                                    data["deduction"] = 0.5
                                    data["color"] = "#F59E0B"
                            elif tot_sec >= 2 * 3600: # 2-5h range
                                data["status"] = "Half Day"
                                data["status_char"] = "HD"
                                if int_grace_2_5_count < 2:
                                    int_grace_2_5_count += 1
                                    data["deduction"] = 0.0
                                    data["color"] = "var(--secondary)"
                                else:
                                    data["deduction"] = 0.5
                                    data["color"] = "#F59E0B"
                            else: # 0-2h range
                                data["status"] = "Absent"
                                data["status_char"] = "A"
                                data["color"] = "#EF4444"
                                data["deduction"] = 1.0
                        else: # Full-Time
                            if tot_sec >= 5 * 3600: # 5-9h range
                                data["status"] = "Half Day"
                                data["status_char"] = "HD"
                                if ft_grace_5_9_count < 3:
                                    ft_grace_5_9_count += 1
                                    data["deduction"] = 0.0
                                    data["color"] = "var(--secondary)"
                                else:
                                    data["deduction"] = 0.5
                                    data["color"] = "#F59E0B"
                            elif tot_sec >= 2 * 3600: # 2-5h range
                                data["status"] = "Half Day"
                                data["status_char"] = "HD"
                                data["color"] = "#F59E0B"
                                data["deduction"] = 0.5 # Needs permission
                            else: # 0-2h range
                                data["status"] = "Absent"
                                data["status_char"] = "A"
                                data["color"] = "#EF4444"
                                data["deduction"] = 1.0
                    else:
                        # Handled below in approved_leave block
                        pass
            else:
                # Worked on holiday but < 9 hours
                data["status"] = "Worked on Holiday (<9h)"
                data["status_char"] = "WOH"
                data["color"] = "#ff7a00"
                data["deduction"] = 0.0

            # Overwrite with Approved Leave status if applicable (but deduction already set)
            if approved_leave:
                l_type = approved_leave.get("leave_type", "")
                type_map = {
                    "Casual Leave": "CL",
                    "Sick Leave": "SL",
                    "Paid Leave": "PL",
                    "Comp-Off": "CO",
                    "Annual Leave": "AL",
                    "Privilege Leave": "AL"
                }
                l_short = type_map.get(l_type, "L")
                
                if employment_type == "Full-Time":
                    data["status"] = f"Leave: {l_type}"
                    data["status_char"] = l_short
                    data["color"] = "#ff7a00" if l_type == "Paid Leave" else "#A855F7"
                    data["deduction"] = 0
                else:
                    data["status"] = f"Unpaid Leave: {l_type}"
                    data["status_char"] = l_short
                    data["color"] = "#F59E0B"
                    data["deduction"] = daily_salary
        else:
            # No sign-in: check day type
            if is_working_day:
                # SPECIAL RULE: Joining Day (First Day) exemption
                if joining_date and current_date == joining_date:
                    data["status"] = "Joined (First Day)"
                    data["status_char"] = "P"
                    data["color"] = "var(--secondary)"
                    data["deduction"] = 0.0
                elif approved_leave:
                    l_type = approved_leave.get("leave_type", "")
                    # Mapping for display short-codes
                    type_map = {
                        "Casual Leave": "CL",
                        "Sick Leave": "SL",
                        "Paid Leave": "PL",
                        "Comp-Off": "CO",
                        "Annual Leave": "AL",
                        "Privilege Leave": "AL"
                    }
                    l_short = type_map.get(l_type, "L")
                    
                    data["status"] = f"Leave ({l_type})"
                    data["status_char"] = l_short
                    data["color"] = "#A855F7" # Leave Purple
                    
                    # SALARY CUT LOGIC
                    if l_type == "Paid Leave":
                        if employment_type == "Intern":
                            data["deduction"] = daily_salary
                            data["color"] = "#ff7a00"
                        else:
                            # Full-Time Paid Leave: no deduction
                            data["deduction"] = 0
                            data["color"] = "#ff7a00"
                    else:
                        data["deduction"] = 0
                else:
                    # Only mark as Absent if the day is strictly in the past.
                    # Current day (today) and future days should not be penalized yet.
                    if current_date < today:
                        data["status"] = "Absent"
                        data["status_char"] = "A"
                        data["color"] = "#EF4444"
                        data["deduction"] = daily_salary
                    else:
                        # Today or Future days remain as "Scheduled" / "Pending"
                        pass
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

    # 3. Get recent leave status for notifications
    recent_leaves = []
    if mongo_db.db is not None:
        recent_leaves = list(mongo_db.leaves.find(
            {"employee_id": employee_id}, 
            {"_id": 0}
        ).sort("applied_on", -1).limit(3))

    # 4. Dynamic Insight Message
    if not checked_in:
        insight = "Welcome! You haven't clocked in yet today. Don't forget to sign in!"
    else:
        # If there's a recently approved leave, mention it
        approved_recently = next((l for l in recent_leaves if "Approved" in str(l.get("status", ""))), None)
        if approved_recently:
            insight = f"Great news! Your request for {approved_recently.get('leave_type')} has been Approved."
        else:
            insight = "Excellent! You're clocked in and on track with your schedule."

    # 4. Metrics Calculation (Month-to-Date)
    month_start = datetime.datetime(datetime.datetime.utcnow().year, datetime.datetime.utcnow().month, 1)
    
    # Joining date awareness
    joining_date_str = user.get("joining_date", "")
    window_start = month_start
    try:
        if joining_date_str:
            join_date = datetime.datetime.fromisoformat(joining_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
            window_start = max(month_start, join_date)
        else:
            # FALLBACK: If joining_date is missing, find the EARLIEST attendance record for this month
            first_att = mongo_db.attendance.find_one(
                {"employee_id": employee_id}, 
                sort=[("timestamp", 1)]
            )
            if first_att and "timestamp" in first_att:
                first_date = datetime.datetime.fromisoformat(first_att["timestamp"][:10])
                # Only use it if it's in the current month
                if first_date.year == month_start.year and first_date.month == month_start.month:
                    window_start = first_date
    except:
        window_start = month_start
        
    today = datetime.datetime.utcnow()
    
    # Calculate working days (Mon-Fri) from window_start to today
    working_days_so_far = 0
    curr = window_start
    while curr.date() <= today.date():
        if curr.weekday() < 5: # 0-4 is Mon-Fri
            working_days_so_far += 1
        curr += datetime.timedelta(days=1)
    
    if working_days_so_far == 0: working_days_so_far = 1 # Prevent div by zero
    
    # Count unique days present since window_start
    present_days_count = 0
    if mongo_db.attendance is not None:
        # Get unique dates from timestamp regex
        all_attendance = list(mongo_db.attendance.find({
            "employee_id": employee_id,
            "action": "sign_in",
            "timestamp": {"$gte": window_start.strftime('%Y-%m-%d')}
        }))
        unique_dates = len(set(a['timestamp'][:10] for a in all_attendance))
        present_days_count = unique_dates

    # Count approved leaves as present
    approved_leave_days = 0
    if mongo_db.leaves is not None:
        leaves_this_month = list(mongo_db.leaves.find({
            "employee_id": employee_id,
            "status": {"$regex": "Approved", "$options": "i"},
            "start_date": {"$gte": window_start.strftime('%Y-%m-%d')}
        }))
        for l in leaves_this_month:
            # Simple approximation: individual days in leave range
            try:
                s = datetime.datetime.fromisoformat(l['start_date'])
                e = datetime.datetime.fromisoformat(l['end_date'])
                # Only count days within the current window
                leave_curr = max(s, window_start)
                leave_end = min(e, today)
                while leave_curr <= leave_end:
                    if leave_curr.weekday() < 5:
                        approved_leave_days += 1
                    leave_curr += datetime.timedelta(days=1)
            except:
                continue

    attendance_percentage = min(100, round(((present_days_count + approved_leave_days) / working_days_so_far) * 100))
    productivity_score = min(100, round(attendance_percentage * 0.95)) if checked_in else max(0, round(attendance_percentage * 0.8))
    
    # Burnout Logic
    burnout_base = 5 if not checked_in else 12
    burnout_value = min(100, burnout_base + (attendance_percentage // 10))
    burnout_risk = "Low" if burnout_value < 15 else "Moderate" if burnout_value < 30 else "High"
    burnout_risk = f"{burnout_risk} ({burnout_value}%)"

    highlights = []
    # Add recent leave status to highlights
    for leaf in recent_leaves:
        status_val = str(leaf.get('status', ''))
        status_color = "success" if "Approved" in status_val else "warning" if "Pending" in status_val else "danger"
        highlights.append({
            "time": leaf.get("start_date"), 
            "title": f"Leave {status_val}", 
            "type": "leave",
            "status": status_color
        })

    for h in upcoming_holidays:
        highlights.append({"time": h['date'], "title": h['name'], "type": "holiday"})
    
    if not highlights:
        highlights = [{"time": "Upcoming", "title": "No immediate holidays", "type": "info"}]

    return {
        "insight_message": insight,
        "productivity_score": productivity_score,
        "attendance_percentage": attendance_percentage,
        "burnout_risk": burnout_risk,
        "burnout_value": burnout_value,
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
             approved_leaves = list(mongo_db.leaves.find({"employee_id": employee_id, "status": {"$regex": "Approved", "$options": "i"}}))
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
    
    # Calculate months passed (Include joining month as month 1)
    # This logic ensures that if you join in March and it's April 1st, 
    # you have been through 2 accrual periods (March and April).
    months_passed = (now.year - joining_date.year) * 12 + (now.month - joining_date.month) + 1
    if months_passed < 1: months_passed = 1
    
    # Rates (Default to user's stored rates or system defaults)
    pl_rate = float(user.get("privilege_leave_rate", 0.0))
    sl_rate = float(user.get("sick_leave_rate", 0.5))
    cl_rate = float(user.get("casual_leave_rate", 1.0))
    
    # --- Multi-Month Accrual Loop (No Negative Carryover) ---
    # Logic: For each month from joining beginning to now, add credits and subtract usage.
    # If the balance reaches 0 at month-end, the next month starts fresh.
    
    # 1. Group all approved usage by (year, month) based on the start date
    monthly_usage = {} # {(year, month): {"pl": 0, "sl": 0, "cl": 0, "co": 0}}
    
    processed_leaves = set()
    if mongo_db.db is not None:
        approved_leaves = list(mongo_db.leaves.find({
            "employee_id": employee_id,
            "status": {"$regex": "Approved", "$options": "i"}
        }))
        
        for leaf in approved_leaves:
            try:
                raw_start = str(leaf.get('start_date', ''))
                raw_end = str(leaf.get('end_date', ''))
                l_type = str(leaf.get('leave_type', ''))
                
                s_date = raw_start[:10] if len(raw_start) >= 10 else raw_start
                e_date = raw_end[:10] if len(raw_end) >= 10 else raw_end
                l_id = f"{employee_id}_{l_type}_{s_date}_{e_date}"
                
                if l_id in processed_leaves: continue
                processed_leaves.add(l_id)

                start = datetime.datetime.fromisoformat(raw_start.replace('Z', '+00:00').replace(' ', 'T')[:19] if 'T' in raw_start or ' ' in raw_start else raw_start)
                
                # Attribute leave to its month
                key = (start.year, start.month)
                if key not in monthly_usage:
                    monthly_usage[key] = {"pl": 0.0, "sl": 0.0, "cl": 0.0, "co": 0.0}
                
                days = (datetime.datetime.fromisoformat(raw_end.replace('Z', '+00:00').replace(' ', 'T')[:19] if 'T' in raw_end or ' ' in raw_end else raw_end).date() - start.date()).days + 1
                
                if "Privilege" in l_type: monthly_usage[key]["pl"] += days
                elif "Sick" in l_type: monthly_usage[key]["sl"] += days
                elif "Casual" in l_type: monthly_usage[key]["cl"] += days
                elif "Compensatory" in l_type or "Comp-Off" in l_type: monthly_usage[key]["co"] += days
            except Exception as e:
                print(f"Error grouping leaf for iterative calculation: {e}")
                continue

    # 2. Iterate month-by-month and calculate running balances
    rem_pl, rem_sl, rem_cl = 0.0, 0.0, 0.0
    total_used_all = 0.0
    
    # Rates
    pl_rate = float(user.get("privilege_leave_rate", 0.0))
    sl_rate = float(user.get("sick_leave_rate", 0.5))
    cl_rate = float(user.get("casual_leave_rate", 1.0))
    
    # Generate list of months since joining
    current_date = datetime.datetime(joining_date.year, joining_date.month, 1)
    target_date = datetime.datetime(now.year, now.month, 1)
    
    months_processed_count = 0
    while current_date <= target_date:
        months_processed_count += 1
        key = (current_date.year, current_date.month)
        usage = monthly_usage.get(key, {"pl": 0.0, "sl": 0.0, "cl": 0.0, "co": 0.0})
        
        # Add monthly credits
        rem_pl += pl_rate
        rem_sl += sl_rate
        rem_cl += cl_rate
        
        # Subtract usage
        rem_pl -= usage["pl"]
        rem_sl -= usage["sl"]
        rem_cl -= usage["cl"]
        
        # Track aggregate used 
        total_used_all += usage["pl"] + usage["sl"] + usage["cl"] + usage["co"]
        
        # --- NO NEGATIVE CARRYOVER ENGINE ---
        # Any 'over-leave' is essentially forgiven at month-end.
        # This month's balance cannot be negative when passing to the next month.
        rem_pl = max(0.0, rem_pl)
        rem_sl = max(0.0, rem_sl)
        rem_cl = max(0.0, rem_cl)
        
        if current_date.month == 12:
            current_date = datetime.datetime(current_date.year + 1, 1, 1)
        else:
            current_date = datetime.datetime(current_date.year, current_date.month + 1, 1)

    # Comp-Off is independent balance
    accrued_co = float(user.get("comp_off_balance", 0.0))
    used_co_total = sum(u["co"] for u in monthly_usage.values())
    rem_co = max(0.0, accrued_co - used_co_total)
    
    final_remaining = round(rem_pl + rem_sl + rem_cl + rem_co, 1)
    
    return {
        "total": final_remaining,
        "used": total_used_all,
        "remaining": final_remaining,
        "is_intern": False,
        "types": [
            {"name": "Privilege Leave", "remaining": round(rem_pl, 1)},
            {"name": "Sick Leave", "remaining": round(rem_sl, 1)},
            {"name": "Casual Leave", "remaining": round(rem_cl, 1)},
            {"name": "Compensatory Off", "remaining": round(rem_co, 1)}
        ],
        "accrual_info": {
            "months_passed": months_processed_count,
            "last_sync": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    }

@router.post("/employee/chat")
async def employee_chat(request: EmployeeChatRequest):
    """
    Dedicated endpoint for the Employee Chat Agent.
    Allows employees to apply for stays, request items, and check status.
    """
    from api.employee_agent import EmployeeAgent
    
    agent = EmployeeAgent(request.employee_id, mongo_db)
    response = await agent.get_response(request.query)
    return {"response": response}

@router.get("/admin/salary/settings")
def get_company_settings():
    """Fetch global company settings for deductions, etc."""
    if mongo_db.db is None:
        return {"enable_tax": True, "enable_pf": True}
    settings = mongo_db.db.settings.find_one({"key": "company_salary_config"})
    if not settings:
        return {"enable_tax": True, "enable_pf": True, "tax_rate": 8.0, "pf_rate": 5.0}
    return {
        "enable_tax": settings.get("enable_tax", True),
        "enable_pf": settings.get("enable_pf", True),
        "tax_rate": float(settings.get("tax_rate", 8.0)),
        "pf_rate": float(settings.get("pf_rate", 5.0))
    }

@router.post("/admin/salary/settings")
def update_salary_settings(enable_tax: bool, enable_pf: bool, tax_rate: float = 8.0, pf_rate: float = 5.0):
    """Admin endpoint to toggle and fix global deduction rates."""
    if mongo_db.db is None:
        return {"error": "Database error"}
    mongo_db.db.settings.update_one(
        {"key": "company_salary_config"},
        {"$set": {
            "enable_tax": enable_tax, 
            "enable_pf": enable_pf, 
            "tax_rate": tax_rate,
            "pf_rate": pf_rate,
            "last_sync": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Salary settings updated."}

def calculate_month_salary(user, year, month, settings=None):
    """Shared engine for all salary calculations (Summary & History)."""
    if not settings:
        settings = get_company_settings()
        
    try:
        monthly_salary = float(user.get("monthly_salary", 0))
    except (ValueError, TypeError):
        monthly_salary = 0.0
        
    joining_date_str = user.get("joining_date")
    joining_date = None
    if joining_date_str:
        try:
            joining_date = datetime.datetime.fromisoformat(joining_date_str).date()
        except: pass

    month_prefix = f"{year}-{month:02d}"
    
    # Fetch holidays/overrides for calculation
    all_holidays = list(mongo_db.holidays.find({}, {"_id": 0})) if mongo_db.holidays is not None else []
    all_overrides = list(mongo_db.workday_overrides.find({}, {"_id": 0})) if mongo_db.workday_overrides is not None else []
    month_holidays = {h["date"] for h in all_holidays if h["date"].startswith(month_prefix)}
    month_overrides = {o["date"]: o["type"] for o in all_overrides if o["date"].startswith(month_prefix)}

    import calendar as py_calendar
    _, num_days = py_calendar.monthrange(year, month)
    
    # We now use the total calendar days of the month as the denominator for salary
    # This aligns with the request to include Sat/Sun and handle 28/29/30/31 day months.
    divisor = float(num_days)
    
    # Calculate days since joining for proration
    days_expected_in_month = divisor
    if joining_date:
        # User Rule: If joining on Sat/Sun, pay starts from Monday onwards
        salary_start_date = joining_date
        while salary_start_date.weekday() >= 5: # 5=Saturday, 6=Sunday
            salary_start_date += datetime.timedelta(days=1)
            
        if salary_start_date.year == year and salary_start_date.month == month:
            # Joined this month - calculate remaining calendar days
            days_expected_in_month = (divisor - salary_start_date.day + 1)
        elif salary_start_date > datetime.date(year, month, num_days):
            # Salary start is after this month
            days_expected_in_month = 0
        elif salary_start_date < datetime.date(year, month, 1):
            # Joined before this month
            days_expected_in_month = divisor
            
    # Expected working days (Mon-Fri) for attendance display purposes (not divisor)
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
        if is_working and (not joining_date or curr_day >= joining_date):
            expected_working_days += 1

    # Base Proration (Calendar-based)
    base_salary = (days_expected_in_month / divisor) * monthly_salary

    # LOP Daily Rate (Calendar-based)
    daily_salary = 500 if user.get("employment_type") == "Intern" else (monthly_salary / divisor)
    
    lop_days = 0.0
    actual_presence = 0
    leaves_taken = 0
    
    try:
        calendar_res = get_attendance_calendar(user.get("employee_id"), year=year, month=month)
        if "history" in calendar_res:
            for record in calendar_res["history"]:
                if record["date"].startswith(month_prefix):
                    # We need to re-verify if this day is supposed to be working
                    # to be extra safe against LOP leaks.
                    r_date = datetime.date.fromisoformat(record["date"])
                    r_weekday = r_date.weekday()
                    is_working = True
                    if r_weekday >= 5: is_working = False
                    if record["date"] in month_holidays: is_working = False
                    if record["date"] in month_overrides:
                        if month_overrides[record["date"]] == "forced_working": is_working = True
                        elif month_overrides[record["date"]] == "forced_holiday": is_working = False
                    
                    status = record.get("status_char")
                    # ONLY count LOP if it's a working day and on or after joining date
                    if not is_working or (joining_date and r_date < joining_date):
                        continue

                    if status == "A":
                        lop_days += 1.0
                    elif status == "HD":
                        lop_days += 0.5
                    elif status == "P":
                        actual_presence += 1
                    elif status in ["CL", "SL", "PL", "AL", "CO"]:
                        leaves_taken += 1
    except: pass

    # LOP Deduction is now informational only (Requested: dont reduce or cut the salary)
    lop_deduction = 0.0 
    
    # Dynamic Deductions based on Admin Toggles and Fixed Rates
    emp_tax_rate = user.get("tax_deduction_rate")
    emp_pf_rate = user.get("pf_deduction_rate")
    
    tax = int(base_salary * (float(emp_tax_rate) / 100)) if emp_tax_rate is not None else 0
    pf_pt = int(base_salary * (float(emp_pf_rate) / 100)) if emp_pf_rate is not None else 0
    
    net = round(base_salary - tax - pf_pt, 2)
    
    return {
        "monthly_salary": monthly_salary,
        "gross_salary": round(base_salary, 2),
        "net_salary": net,
        "lop_deduction": lop_deduction,
        "lop_days": lop_days,
        "attendance_penalty": 0.0,
        "expected_working_days": expected_working_days,
        "actual_presence": actual_presence,
        "leaves_taken": leaves_taken,
        "tax": tax,
        "pf_pt": pf_pt,
        "deductions": tax + pf_pt + lop_deduction,
        "settings": settings
    }

@router.get("/employee/salary")
def get_employee_salary(employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
    user = mongo_db.users.find_one({"employee_id": employee_id}, {"_id": 0, "employee_id": 1, "monthly_salary": 1, "employment_type": 1, "in_hand_salary": 1, "joining_date": 1})
    if not user:
        return {"error": "Employee not found"}
    
    now = datetime.datetime.utcnow()
    return calculate_month_salary(user, now.year, now.month)

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

def generate_salary_statement_pdf(user, payslips, period_text):
    """Generates a professional multi-month salary statement (Portfolio)"""
    pdf = FPDF()
    pdf.add_page()
    
    # --- Professional Header ---
    pdf.set_fill_color(200, 76, 255) # Violet Theme
    pdf.rect(0, 0, 210, 45, 'F')
    
    # Company Name (Logo Placeholder styled text)
    pdf.set_font("Arial", 'B', 28)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(15, 12)
    pdf.cell(0, 15, "NeuZen AI", ln=False)
    
    pdf.set_font("Arial", 'B', 14)
    pdf.set_xy(120, 15)
    pdf.cell(75, 10, "SALARY PORTFOLIO", align='R', ln=True)
    
    pdf.set_font("Arial", '', 10)
    pdf.set_xy(120, 24)
    pdf.cell(75, 5, f"Statement Period: {period_text}", align='R', ln=True)
    pdf.set_xy(120, 29)
    pdf.cell(75, 5, "Confidential Document", align='R', ln=True)
    
    # --- Employee Info Section ---
    pdf.set_text_color(26, 26, 26)
    pdf.ln(35)
    
    pdf.set_font("Arial", 'B', 12)
    pdf.set_x(15)
    pdf.cell(0, 8, "EMPLOYEE IDENTIFICATION", ln=True)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(5)
    
    pdf.set_font("Arial", '', 10)
    pdf.set_x(15)
    pdf.cell(90, 7, f"Employee Name: {user.get('name')}", ln=False)
    pdf.cell(0, 7, f"Designation: {user.get('position', 'Not Assigned')}", ln=True)
    pdf.set_x(15)
    pdf.cell(90, 7, f"Employee ID: {user.get('employee_id')}", ln=False)
    pdf.cell(0, 7, f"Employment: {user.get('employment_type', 'Full-Time')}", ln=True)
    pdf.ln(10)
    
    # --- Salary History Table ---
    pdf.set_font("Arial", 'B', 12)
    pdf.set_x(15)
    pdf.cell(0, 8, "DISBURSEMENT HISTORY", ln=True)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(2)
    
    # Table Header
    pdf.set_fill_color(245, 245, 245)
    pdf.set_font("Arial", 'B', 9)
    pdf.set_x(15)
    pdf.cell(35, 10, "Month", border=1, fill=True)
    pdf.cell(30, 10, "Gross", border=1, fill=True)
    pdf.cell(25, 10, "LOP", border=1, fill=True)
    pdf.cell(25, 10, "Penalty", border=1, fill=True)
    pdf.cell(25, 10, "Tax", border=1, fill=True)
    pdf.cell(40, 10, "Net Paid (Rs.)", border=1, fill=True, ln=1)
    
    # Rows
    pdf.set_font("Arial", '', 9)
    total_net = 0
    for ps in payslips:
        pdf.set_x(15)
        pdf.cell(35, 9, ps.get('month'), border=1)
        pdf.cell(30, 9, f"{ps.get('gross_salary', 0):,.0f}", border=1)
        pdf.cell(25, 9, f"{ps.get('lop_deduction', 0):,.0f}", border=1)
        pdf.cell(25, 9, f"{ps.get('attendance_penalty', 0):,.0f}", border=1)
        pdf.cell(25, 9, f"{ps.get('tax', 0):,.0f}", border=1)
        
        net_amt = ps.get('net_salary', 0)
        pdf.cell(40, 9, f"{net_amt:,.2f}", border=1, ln=True)
        total_net += net_amt
    
    # Total Footer
    pdf.set_font("Arial", 'B', 10)
    pdf.set_x(15)
    pdf.set_fill_color(220, 255, 230)
    pdf.cell(140, 10, "TOTAL CONSOLIDATED NET DISBURSED", border=1, fill=True)
    pdf.cell(40, 10, f"Rs. {total_net:,.2f}", border=1, fill=True, ln=1)
    
    # --- Closing ---
    pdf.ln(20)
    pdf.set_font("Arial", '', 9)
    pdf.set_x(15)
    pdf.multi_cell(180, 5, "This document serves as an official summary of salary earnings for the period specified. It is generated by the NeuzenAI HRMS on behalf of NeuZen AI IT Solutions. For any discrepancies or additional verification, please contact the HR Department.")
    
    # Footer
    pdf.set_y(-25)
    pdf.set_font("Arial", 'I', 8)
    # Footer
    pdf.set_y(-25)
    pdf.set_font("Arial", 'I', 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 5, "NeuZen AI IT Solutions | Hyderabad, India | www.neuzenai.com", align='C', ln=1)
    pdf.cell(0, 5, f"Generated on {datetime.datetime.now().strftime('%d %b %Y')}", align='C', ln=1)
    
    return bytes(pdf.output())

@router.get("/employee/salary/statement/pdf")
def download_salary_statement_pdf(employee_id: str, months: Optional[int] = None, selected_months: Optional[str] = None):
    try:
        user = mongo_db.users.find_one({"employee_id": employee_id})
        if not user: return Response(status_code=404, content="Employee not found")
        
        all_ps = get_employee_payslips(employee_id)["payslips"]
        
        # Filtering logic
        if selected_months:
            months_list = [m.strip() for m in selected_months.split(',')]
            filtered_ps = [ps for ps in all_ps if ps.get('month') in months_list]
            period_text = f"Custom ({len(filtered_ps)} months)"
        else:
            limit = months if months else 12
            filtered_ps = all_ps[:limit]
            period_text = f"Last {limit} Months" if limit < 100 else "Full History"
        
        pdf_bytes = generate_salary_statement_pdf(user, filtered_ps, period_text)
        
        # Ensure we return valid bytes and use a filename
        filename = f"NeuZenAI_Salary_Statement_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(status_code=500, content=f"Failed to generate PDF: {str(e)}")

@router.get("/employee/salary/statement/excel")
def download_salary_statement_excel(employee_id: str, months: Optional[int] = None, selected_months: Optional[str] = None):
    try:
        all_ps = get_employee_payslips(employee_id)["payslips"]
        
        if selected_months:
            months_list = [m.strip() for m in selected_months.split(',')]
            filtered_ps = [ps for ps in all_ps if ps.get('month') in months_list]
        else:
            limit = months if months else 12
            filtered_ps = all_ps[:limit]
            
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Month", "Disbursement Date", "Gross Salary", "LOP Deduction", "Attendance Penalty", "Tax (TDS)", "Net Paid (INR)"])
        
        total_net = 0
        for ps in filtered_ps:
            net_amt = ps.get('net_salary', 0)
            writer.writerow([
                ps.get('month'), 
                ps.get('date'), 
                ps.get('gross_salary', 0), 
                ps.get('lop_deduction', 0), 
                ps.get('attendance_penalty', 0), 
                ps.get('tax', 0), 
                net_amt
            ])
            total_net += net_amt
            
        writer.writerow(["TOTAL", "-", "-", "-", "-", "-", total_net])
            
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=NeuZenAI_Salary_Portfolio.csv"}
        )
    except Exception as e:
        return Response(status_code=500, content=str(e))
def analyze_payslip_template(request: PayslipTemplateRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "AI not configured (missing API Key)."}
    
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    model = genai.GenerativeModel(model_name)
    
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
    if mongo_db.users is None or mongo_db.db is None:
        return {"payslips": []}
    
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"payslips": []}
        
    try:
        monthly_salary = float(user.get("monthly_salary", 0))
    except (ValueError, TypeError):
        monthly_salary = 0.0
        
    employment_type = user.get("employment_type", "Full-Time")
    base_salary = monthly_salary
    
    if employment_type == "Intern":
        gross_salary = base_salary
        net_salary = base_salary
    else:
        stored_in_hand = user.get("in_hand_salary")
        try:
            stored_in_hand = float(stored_in_hand) if stored_in_hand is not None else 0
        except:
            stored_in_hand = 0
            
        if stored_in_hand > 0:
            net_salary = stored_in_hand
            gross_salary = base_salary
        else:
            deductions = int(base_salary * 0.05)
            tax = int(base_salary * 0.08)
            gross_salary = base_salary
            net_salary = base_salary - deductions - tax

    import datetime
    from dateutil.relativedelta import relativedelta
    
    now = datetime.datetime.utcnow()
    # Find joining date to limit history
    joining_date_str = user.get("joining_date")
    joining_date = None
    if joining_date_str:
        try:
            joining_date = datetime.datetime.fromisoformat(joining_date_str).date()
        except: pass
        
    # Fetch released months from the database
    released_months = {}
    if mongo_db.payslip_releases is not None:
        releases = list(mongo_db.payslip_releases.find({}, {"_id": 0}))
        released_months = {r["month_year"]: r.get("released", False) for r in releases}

    settings = get_company_settings()
    payslips = []
    
    # Generate up to 12 months of history dynamically for portfolio demonstration
    for i in range(0, 13): # Start from current month (0) to history (12)
        target_date = now - relativedelta(months=i)
            
        # 1. Enforce Joining Date logic 
        target_month_start = target_date.replace(day=1).date()
        if joining_date and target_month_start < joining_date.replace(day=1):
            continue 

        month_year_str = target_date.strftime("%B %Y")
        disbursement_date = (target_date + relativedelta(months=1)).replace(day=5).strftime("%Y-%m-%d")
        
        # 2. Check Admin Release status
        is_released = released_months.get(month_year_str, False)
        
        # Consistent Proration & Calculation for every history entry
        calc_year = target_date.year
        calc_month = target_date.month
        
        # Call the shared engine
        stats = calculate_month_salary(user, calc_year, calc_month, settings)

        payslips.append({
            "month": month_year_str,
            "date": disbursement_date,
            "amount": stats["net_salary"],
            "gross_salary": stats["gross_salary"],
            "net_salary": stats["net_salary"],
            "lop_deduction": stats["lop_deduction"],
            "attendance_penalty": stats["attendance_penalty"],
            "tax": stats["tax"],
            "released": is_released,
            "pf_pt": stats["pf_pt"]
        })
        
    return {
        "payslips": payslips,
        "joining_date": joining_date_str,
        "settings": settings
    }

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
    notes = list(mongo_db.db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"notifications": notes}

@router.delete("/admin/notifications")
def delete_admin_notifications():
    if mongo_db.db is None:
        return {"error": "Database error"}
    mongo_db.db.notifications.delete_many({})
    return {"message": "All notifications cleared"}

@router.post("/employee/request-document")
def request_document(request: DocumentRequest):
    if mongo_db.db is None:
        return {"error": "Database error"}
    
    # Create notification for admin
    notification = {
        "type": "document_request",
        "employee_id": request.employee_id,
        "doc_type": request.doc_type,
        "reason": request.reason,
        "status": "pending",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    mongo_db.db.notifications.insert_one(notification)
    return {"message": "Request submitted to HR successfully."}

@router.get("/admin/attendance")
def get_all_attendance_logs():
    if mongo_db.attendance is None:
        return {"logs": []}
    logs = list(mongo_db.attendance.find({}, {"_id": 0}).sort("timestamp", -1).limit(100))
    return {"logs": logs}

@router.get("/admin/overview")
def get_admin_overview():
    """Aggregates key metrics for the landing dashboard."""
    if mongo_db.db is None or mongo_db.users is None:
        return {"error": "Database error"}
    
    # Staffing
    total_employees = mongo_db.users.count_documents({"status": "approved"})
    pending_approvals = mongo_db.users.count_documents({"status": "pending"})
    
    # Leaves (Today)
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    active_leaves = mongo_db.leaves.count_documents({
        "status": "Approved",
        "start_date": {"$lte": today_str},
        "end_date": {"$gte": today_str}
    })
    pending_leaves = mongo_db.leaves.count_documents({"status": "Pending"})

    # Requests
    item_requests = mongo_db.item_requests.count_documents({"status": "Pending"})
    
    # Recent Activity (Last 5)
    # We'll pull from notifications or last few users
    recent_users = list(mongo_db.users.find({}, {"_id": 0, "name": 1, "employee_id": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5))
    
    # Announcement
    announcement = mongo_db.announcements.find_one({}, {"_id": 0})
    
    return jsonable_encoder({
        "status": "success",
        "metrics": {
            "total_employees": total_employees,
            "pending_approvals": pending_approvals,
            "active_leaves_today": active_leaves,
            "pending_leaves": pending_leaves,
            "item_requests": item_requests
        },
        "recent_activity": recent_users,
        "announcement": announcement
    })

@router.post("/admin/copilot")
async def admin_ai_copilot(request: AdminCopilotRequest):
    """
    Enhanced Admin AI Agent powered by ChromaDB Vector Search.
    Retrieves real-time employee data (salary, leaves, personal) to answer queries.
    """
    answer = await process_admin_query(request.query)
    return {"answer": answer}

# Removed duplicate serve_s3_photo route to prevent conflict with get_admin_photo at line 1241.

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
        
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
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
