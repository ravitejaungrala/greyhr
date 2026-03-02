from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from database.s3_client import s3_db
from database.vector_client import vector_db
from database.mongo_client import mongo_db
import datetime
import base64
import uuid

router = APIRouter()

# --- Auth & Registration ---

class EmployeeRegistrationRequest(BaseModel):
    name: str
    email: str
    password: str
    dob: str
    is_experienced: bool
    # Bank
    bank_account: str
    bank_ifsc: str
    bank_photo_base64: str
    # Education
    education_degree: str
    education_cert_base64: str
    # Experience (Optional)
    prev_company: Optional[str] = None
    prev_role: Optional[str] = None
    experience_years: Optional[str] = None
    # Live Photo
    image_base64: str

def parse_base64(b64_string: str) -> bytes:
    if ',' in b64_string:
        b64_string = b64_string.split(',')[1]
    return base64.b64decode(b64_string)

@router.post("/auth/register")
def register_employee(request: EmployeeRegistrationRequest):
    # Check if already exists
    if mongo_db.users is not None and mongo_db.users.find_one({"email": request.email}):
        return {"error": "Email already exists"}
        
    try:
        live_photo_bytes = parse_base64(request.image_base64)
        bank_photo_bytes = parse_base64(request.bank_photo_base64)
        edu_cert_bytes = parse_base64(request.education_cert_base64)
    except Exception as e:
        return {"error": "Invalid base64 image or document upload"}

    # Generate Employee ID
    emp_id = f"EMP{uuid.uuid4().hex[:6].upper()}"
    reference_image_key = f"reference_faces/{emp_id}.jpg"
    bank_photo_key = f"documents/{emp_id}_bank.jpg"
    edu_cert_key = f"documents/{emp_id}_edu.jpg"
    
    # Save files to S3
    s3_db.save_image(reference_image_key, live_photo_bytes, content_type='image/jpeg')
    s3_db.save_image(bank_photo_key, bank_photo_bytes, content_type='image/jpeg')
    s3_db.save_image(edu_cert_key, edu_cert_bytes, content_type='image/jpeg')
    
    # Save to MongoDB
    user_record = {
        "employee_id": emp_id,
        "name": request.name,
        "email": request.email,
        "password": request.password, # Plain text for MVP mock, hash in production
        "dob": request.dob,
        "is_experienced": request.is_experienced,
        "bank_details": {
            "account_number": request.bank_account,
            "ifsc": request.bank_ifsc,
            "bank_photo_key": bank_photo_key
        },
        "education": {
            "degree": request.education_degree,
            "cert_key": edu_cert_key
        },
        "experience": {
            "prev_company": request.prev_company,
            "prev_role": request.prev_role,
            "years": request.experience_years
        } if request.is_experienced else None,
        "status": "pending_approval",
        "reference_image_key": reference_image_key,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    if mongo_db.users is not None:
        mongo_db.users.insert_one(user_record)
        
    return {
        "message": "Registration successful. Please wait for Admin approval.",
        "employee_id": emp_id
    }

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

@router.post("/auth/admin/approve")
def admin_approve_employee(request: AdminApprovalRequest):
    if mongo_db.users is None:
        return {"error": "Database unavailable"}
        
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user:
        return {"error": "Employee not found"}
        
    if request.action == "approve":
        status_to_set = "approved"
    else:
        status_to_set = "rejected"
        
    mongo_db.users.update_one(
        {"employee_id": request.employee_id},
        {"$set": {"status": status_to_set}}
    )
    
    return {"message": f"Employee {request.employee_id} {status_to_set} successfully."}

# --- Leaves & Admin Features ---
class LeaveRequest(BaseModel):
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str

@router.post("/leaves/apply")
def apply_leave(request: LeaveRequest):
    record = request.dict()
    record["status"] = "Pending Admin Approval"
    record["applied_on"] = datetime.datetime.utcnow().isoformat()
    record["id"] = uuid.uuid4().hex[:8]
    if mongo_db.db is not None:
        mongo_db.db.leaves.insert_one(record)
    return {"message": "Leave submitted pending approval", "record": record}

@router.get("/admin/leaves")
def get_all_leaves():
    if mongo_db.db is None:
        return {"leaves": []}
    leaves = list(mongo_db.db.leaves.find({}, {"_id": 0}))
    return {"leaves": leaves}

class LeaveStatusUpdate(BaseModel):
    status: str

@router.put("/admin/leaves/{leave_id}/status")
def update_leave(leave_id: str, update: LeaveStatusUpdate):
    if mongo_db.db is not None:
        mongo_db.db.leaves.update_one({"id": leave_id}, {"$set": {"status": update.status}})
    return {"message": f"Leave {leave_id} updated to {update.status}"}

class Holiday(BaseModel):
    name: str
    date: str
    type: str

@router.post("/admin/holidays")
def add_holiday(holiday: Holiday):
    record = holiday.dict()
    record["id"] = uuid.uuid4().hex[:8]
    if mongo_db.db is not None:
        mongo_db.db.holidays.insert_one(record)
    return {"message": "Holiday added", "record": record}

@router.get("/admin/holidays")
def get_holidays():
    if mongo_db.db is None:
        return {"holidays": []}
    holidays = list(mongo_db.db.holidays.find({}, {"_id": 0}))
    # Default holidays if empty
    if not holidays:
        holidays = [
            {"name": "New Year's Day", "date": "2026-01-01", "type": "Public Holiday"},
            {"name": "Independence Day", "date": "2026-08-15", "type": "Public Holiday"}
        ]
    return {"holidays": holidays}

@router.get("/admin/reports")
def get_reports_summary():
    # Mock data aggregation
    return {
        "total_employees": 124,
        "present_today": 118,
        "on_leave": 5,
        "open_tickets": 12,
        "average_engagement_score": 88
    }

# --- Attendance ---
class AttendanceScanRequest(BaseModel):
    employee_id: str
    image_base64: str
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
        if ',' in request.image_base64:
            base64_data = request.image_base64.split(',')[1]
        else:
            base64_data = request.image_base64
        image_bytes = base64.b64decode(base64_data)
    except Exception as e:
        return {"error": "Invalid image format"}

    # 1.5 Mock Face Comparison
    # Here, we would compare image_bytes with the S3 image at user['reference_image_key']
    # For MVP, we simulate a successful match if the image decodes properly.
    face_match_success = True 
    if not face_match_success:
        return {"error": "Face does not match the registered identity."}

    timestamp = datetime.datetime.utcnow().isoformat()
    image_key = f"attendance_faces/{request.employee_id}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
    
    # 2. Save Daily Image to S3
    s3_db.save_image(image_key, image_bytes, content_type='image/jpeg')
    
    # 3. Save to MongoDB
    attendance_record = {
        "employee_id": request.employee_id,
        "action": request.action_type,
        "timestamp": timestamp,
        "location": request.location,
        "s3_image_key": image_key,
        "ai_verification_score": 0.99
    }
    mongo_db.attendance.insert_one(attendance_record)
    if "_id" in attendance_record:
        attendance_record["_id"] = str(attendance_record["_id"])

    return {
        "message": f"Identity verified against reference. Successfully processed {request.action_type}",
        "record": attendance_record
    }

class CopilotQuery(BaseModel):
    query: str

@router.post("/copilot/ask")
def ask_hr_copilot(query: CopilotQuery):
    # Mock AI response based on query
    q = query.query.lower()
    
    response = "I'm not sure how to answer that yet."
    if "low productivity" in q:
        response = "Based on recent analytics, the Marketing team has seen a 15% drop in productivity. Would you like me to schedule a check-in with the team lead?"
    elif "resignation probability" in q or "risk" in q:
        response = "The Employee Risk Prediction engine highlights 3 employees in the Engineering department with a high burnout risk score (>85%). Suggesting immediate 1-on-1s."
    elif "policy" in q:
        # Mock VectorDB integration
        search_results = vector_db.search([0.1, 0.2, 0.3])
        docs = [res['metadata']['title'] for res in search_results]
        response = f"According to our knowledge base ({', '.join(docs)}), the policy states standard rules apply."
        
    return {
        "agent": "HR Copilot",
        "response": response
    }
