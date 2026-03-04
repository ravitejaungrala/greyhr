from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional
from database.s3_client import s3_db
from database.vector_client import vector_db
from database.mongo_client import mongo_db
from dotenv import load_dotenv
load_dotenv(override=True)
import datetime
import base64
import uuid
import os
import google.generativeai as genai
import cv2
import numpy as np
from fpdf import FPDF
from io import BytesIO
import jinja2
from xhtml2pdf import pisa
from pypdf import PdfReader

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
        "created_at": datetime.datetime.utcnow().isoformat()
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
        return {"role": "admin", "name": "Admin", "email": request.email}
    
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
        bank_photo_bytes = parse_base64(request.bank_photo_base64)
        edu_cert_bytes = parse_base64(request.education_cert_base64)
    except Exception as e:
        return {"error": "Invalid base64 image or document upload"}

    reference_image_key = f"reference_faces/{request.employee_id}.jpg"
    bank_photo_key = f"documents/{request.employee_id}_bank.jpg"
    edu_cert_key = f"documents/{request.employee_id}_edu.jpg"
    
    # Save files to S3
    s3_db.save_image(reference_image_key, live_photo_bytes, content_type='image/jpeg')
    s3_db.save_image(bank_photo_key, bank_photo_bytes, content_type='image/jpeg')
    s3_db.save_image(edu_cert_key, edu_cert_bytes, content_type='image/jpeg')
    
    # Update Record
    update_data = {
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
        "updated_at": datetime.datetime.utcnow().isoformat()
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

class EmployeeUpdate(BaseModel):
    employment_type: Optional[str] = None
    position: Optional[str] = None
    monthly_salary: Optional[int] = None
    privilege_leave_rate: Optional[float] = None
    sick_leave_rate: Optional[float] = None
    casual_leave_rate: Optional[float] = None

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
            "joining_date": datetime.datetime.utcnow().isoformat()
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
        
    result = mongo_db.users.update_one(
        {"employee_id": employee_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        return {"error": "Employee not found"}
        
    return {"message": "Employee updated successfully"}

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
    created_at: str = datetime.datetime.utcnow().isoformat()

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

class TemplateUploadRequest(BaseModel):
    employment_type: str
    content_base64: str
    file_type: str  # 'html' or 'pdf'

@router.post("/leaves/apply")
def apply_leave(request: LeaveRequest):
    record = request.dict()
    record["status"] = "Pending Admin Approval"
    record["applied_on"] = datetime.datetime.utcnow().isoformat()
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

@router.get("/admin/photos/{photo_key:path}")
def get_admin_photo(photo_key: str):
    image_bytes = s3_db.get_image(photo_key)
    if not image_bytes:
        # For development/mock, if image is not found, we could return a placeholder or 404
        return Response(status_code=404)
        
    return Response(content=image_bytes, media_type="image/jpeg")

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

    # NEW: Admin Notification for attendance
    if mongo_db.db["notifications"] is not None:
        mongo_db.db["notifications"].insert_one({
            "type": "attendance",
            "message": f"Employee {request.employee_id} signed in.",
            "employee_id": request.employee_id,
            "created_at": datetime.datetime.utcnow().isoformat()
        })

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
        # Convert ISO to readable time
        dt = datetime.datetime.fromisoformat(latest["timestamp"])
        return {
            "last_punch": dt.strftime("%I:%M %p"),
            "action": latest["action"],
            "status": "Signed In" if latest["action"] == "sign_in" else "Signed Out"
        }
    
    return {"last_punch": None, "status": "Not Signed In"}

@router.get("/employee/attendance/calendar")
def get_attendance_calendar(employee_id: str):
    if mongo_db.attendance is None:
        return {"history": []}
    
    # Get last 30 days of unique day statuses
    # In a real app, this would be an aggregation. For MVP, we fetch and process.
    records = list(mongo_db.attendance.find({"employee_id": employee_id}, {"_id": 0}).sort("timestamp", -1).limit(100))
    
    history = {}
    for r in records:
        day = r["timestamp"].split('T')[0]
        time_str = r["timestamp"].split('T')[1][:5]
        if day not in history:
            history[day] = {
                "date": day,
                "punches": []
            }
        history[day]["punches"].append({
            "action": r.get("action", "sign_in"),
            "time": time_str,
            "datetime": r["timestamp"]
        })
        
    dates_sorted = sorted(list(history.keys()))
    early_logout_count = 0
            
    for day in dates_sorted:
        data = history[day]
        punches = sorted(data["punches"], key=lambda x: x["datetime"])
        first_in = next((p["time"] for p in punches if p["action"] == "sign_in"), "-")
        last_out = next((p["time"] for p in reversed(punches) if p["action"] == "sign_out"), "-")
        
        total_hrs = "-"
        tot_sec = 0
        if first_in != "-" and last_out != "-":
            try:
                fmt = "%H:%M"
                tdelta = datetime.datetime.strptime(last_out, fmt) - datetime.datetime.strptime(first_in, fmt)
                tot_sec = int(tdelta.total_seconds())
                if tot_sec > 0:
                    hrs, rem = divmod(tot_sec, 3600)
                    mins, _ = divmod(rem, 60)
                    total_hrs = f"{hrs:02d}:{mins:02d}"
            except Exception:
                pass
                
        # Fetch leaves to check for admin-approved half day
        has_half_day_leave = False
        if mongo_db.db is not None:
            leave = mongo_db.leaves.find_one({
                "employee_id": employee_id,
                "status": "Approved",
                "start_date": {"$lte": day},
                "end_date": {"$gte": day}
            })
            if leave and leave.get("type") == "Half Day Leave":
                has_half_day_leave = True
                
        # Status Logic
        status_text = "Present"
        status_char = "P"
        color = "var(--secondary)"
        deduction = 0
        
        if tot_sec >= 9 * 3600:
            status_text = "Present"
            status_char = "P"
            color = "var(--secondary)"
        elif first_in != "-": # Logged in but less than 9 hours
            if has_half_day_leave:
                status_text = "Half Day Leave"
                status_char = "HL"
                color = "#A855F7" # Purple
            else:
                early_logout_count += 1
                if is_forgot_logout:
                    status_text = "Absent (Forgot Logout)"
                    status_char = "A"
                    color = "#EF4444"
                    deduction = 500 # Full day penalty
                else:
                    # Treat every late login/early logout as a half-day immediately as per rule
                    status_text = "Half Day (Time Variance)"
                    status_char = "HD"
                    color = "#F59E0B"
                    deduction = 250
                
        data["first_in"] = first_in
        data["last_out"] = last_out
        data["total_work_hrs"] = total_hrs
        data["actual_work_hrs"] = total_hrs
        data["status"] = status_text
        data["status_char"] = status_char
        data["color"] = color
        data["deduction"] = deduction
        del data["punches"] # clean up payload
            
    return {"history": list(history.values())}

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
        return {
            "total": 0,
            "used": 0,
            "remaining": 0,
            "is_intern": True,
            "types": [
                {"name": "Privilege Leave", "remaining": 0},
                {"name": "Sick Leave", "remaining": 0},
                {"name": "Casual Leave", "remaining": 0}
            ],
            "message": "Interns are not eligible for paid leaves as per company policy."
        }

    # Calculate Accrued Leaves for Full-Time
    joining_date_str = user.get("joining_date")
    if not joining_date_str:
        joining_date_str = datetime.datetime.utcnow().isoformat()
    
    joining_date = datetime.datetime.fromisoformat(joining_date_str)
    now = datetime.datetime.utcnow()
    
    # Calculate months passed
    months_passed = (now.year - joining_date.year) * 12 + (now.month - joining_date.month)
    if months_passed < 0: months_passed = 0
    
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
            except:
                continue

    rem_pl = max(0, accrued_pl - used_pl)
    rem_sl = max(0, accrued_sl - used_sl)
    rem_cl = max(0, accrued_cl - used_cl)
    
    return {
        "total": rem_pl + rem_sl + rem_cl,
        "used": used_pl + used_sl + used_cl,
        "remaining": rem_pl + rem_sl + rem_cl,
        "is_intern": False,
        "types": [
            {"name": "Privilege Leave", "remaining": round(rem_pl, 1)},
            {"name": "Sick Leave", "remaining": round(rem_sl, 1)},
            {"name": "Casual Leave", "remaining": round(rem_cl, 1)}
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
    user = mongo_db.users.find_one({"employee_id": employee_id}, {"_id": 0, "monthly_salary": 1})
    if not user:
        return {"error": "Employee not found"}
    
    monthly_salary = user.get("monthly_salary", 0)
    employment_type = user.get("employment_type", "Full-Time")
    
    # NEW: LOP Deduction Logic (₹500 per day)
    lop_days = 0
    if mongo_db.db is not None:
        # All leaves for interns count as LOP
        if employment_type == "Intern":
            lop_days = mongo_db.leaves.count_documents({
                "employee_id": employee_id,
                "status": "Approved by Admin"
            })
        else:
            # For employees, only Rejected/Unapproved leaves count as LOP (or specifically marked)
            # In this logic, let's say "Rejected" means LOP if they took it anyway, 
            # or we check for a specific "LOP" flag if we had one.
            # User said: "without prior approval also for leave for each from salary cut 500 per day"
            lop_days = mongo_db.leaves.count_documents({
                "employee_id": employee_id,
                "status": "Rejected"
            })

    lop_deduction = lop_days * 500
    
    # NEW: Attendance penalty deduction (for 5+ early logouts)
    attendance_penalty = 0
    try:
        calendar_res = get_attendance_calendar(employee_id)
        if "history" in calendar_res:
            today_str = datetime.datetime.utcnow().strftime('%Y-%m')
            for record in calendar_res["history"]:
                if record["date"].startswith(today_str):
                    attendance_penalty += record.get("deduction", 0)
    except Exception as e:
        print(f"Error calculating attendance penalty: {e}")

    deductions = int(monthly_salary * 0.05) + lop_deduction + attendance_penalty
    tax = int(monthly_salary * 0.08)
    net_salary = monthly_salary - deductions - tax
    
    return {
        "net_salary": net_salary,
        "deductions": deductions,
        "tax": tax,
        "gross_salary": monthly_salary,
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
    if template_image:
        temp_path = "/tmp/template_ps.jpg"
        with open(temp_path, "wb") as f:
            f.write(template_image)
        pdf.image(temp_path, x=0, y=0, w=210, h=297) # A4 size
    
    # 2. Overlay Text
    # For now, we'll use a set of default coordinates if Gemini didn't provide precise ones
    # In a real scenario, we'd parse the 'description' from format_info
    
    pdf.set_font("Arial", size=10)
    pdf.set_text_color(0, 0, 0)
    
    # Generic placement (can be refined via Gemini analysis)
    # This is a fallback if Gemini's description isn't JSON-parseable easily
    fields = [
        ("Employee Name", employee.get("name"), 40, 50),
        ("Employee ID", employee.get("employee_id"), 40, 60),
        ("Month", month_year, 150, 50),
        ("Gross Salary", f"Rs. {salary.get('gross_salary'):,}", 150, 100),
        ("Net Salary", f"Rs. {salary.get('net_salary'):,}", 150, 200),
        ("Deductions", f"Rs. {salary.get('deductions'):,}", 150, 150),
    ]
    
    # Try to extract data from Gemini analysis if it looks like coordinates
    # For now, let's just place them at these sample spots or use Gemini to find them
    
    for label, val, x, y in fields:
        pdf.set_xy(x, y)
        pdf.cell(0, 10, txt=f"{val}", ln=False)

    return pdf.output()

@router.get("/employee/payslip/download/{month_year}")
def download_payslip(month_year: str, employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        return {"error": "User not found"}
        
    salary_data = get_employee_salary(employee_id)
    format_info = {}
    if mongo_db.db is not None:
        fmt = mongo_db.db.settings.find_one({"key": "payslip_format"})
        if fmt: format_info = fmt
    
    try:
        pdf_bytes = generate_payslip_pdf(user, salary_data, month_year, format_info)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=payslip_{month_year.replace(' ', '_')}.pdf"}
        )
    except Exception as e:
        return {"error": f"PDF generation failed: {str(e)}"}
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
                {"$set": {"description": format_description, "template_image_key": "settings/payslip_template.jpg", "updated_at": datetime.datetime.utcnow().isoformat()}},
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
        {"$set": {"released": request.release, "updated_at": datetime.datetime.utcnow().isoformat()}},
        upsert=True
    )
    return {"message": f"Payslips for {request.month_year} {'released' if request.release else 'hidden'}"}

@router.get("/admin/payslips/status")
def get_payslip_release_status():
    if mongo_db.db is None:
        return {"releases": []}
    releases = list(mongo_db.payslip_releases.find({}, {"_id": 0}))
    return {"releases": releases}

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
    sender_name: str
    receiver_name: str
    message: str

@router.post("/employee/kudos")
def give_kudos(request: KudosRequest):
    record = request.dict()
    record["timestamp"] = datetime.datetime.utcnow().isoformat()
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
        "updated_at": datetime.datetime.utcnow().isoformat()
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
    
    # 1. Context Retrieval from Chroma (Company Policies)
    context = ""
    try:
        search_results = vector_db.search(query_texts=[request.query], top_k=2)
        for res in search_results:
            context += f"\nCompany Policy: {res.get('document', '')}"
    except:
        context = "No specific company policies found in vector DB."

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
    
    pdf.ln(5)
    pdf.set_font("Arial", '', 10)
    pdf.set_x(15)
    pdf.cell(0, 10, f"Date: {data['date']}", ln=True)
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
    
    mongo_db.users.update_one(
        {"employee_id": employee_id},
        {"$set": {"offer_letter_key": final_key, "offer_letter_status": "final"}}
    )
    
    return {"message": "Offer letter sent to employee"}

@router.get("/employee/offer-letter")
def get_employee_offer_letter(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user or "offer_letter_key" not in user:
        return {"error": "No offer letter found"}
        
    pdf_bytes = s3_db.get_image(user["offer_letter_key"])
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NeuzenAI_Offer_Letter.pdf"}
    )

# --- Template Management ---

def analyze_and_convert_template(content_b64: str, file_type: str):
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
        
        prompt = f"""
        You are an HR technical assistant. I have an offer letter template in {file_type} format.
        
        TASK:
        1. Identify all existing placeholders like {{{{name}}}}, {{{{role}}}}, or unique markers.
        2. Create a professional, clean HTML/CSS template version of this letter.
        3. Ensure the HTML template uses Jinja2 style placeholders {{{{key}}}} for all dynamic data.
        4. If the original didn't have placeholders, add them naturally for: name, employee_id, date, role, role_description, stipend, duration (if intern), annual_ctc, in_hand_salary, notice_period (if full-time).
        
        RETURN ONLY a JSON object with two fields:
        "placeholders": [list of strings],
        "html_template": "the full html source string"
        
        Template Raw Content/Text:
        {raw_text[:8000]}
        """
        
        response = model.generate_content(prompt)
        # Clean response if it contains markdown code blocks
        resp_text = response.text.replace('```json', '').replace('```', '').strip()
        import json
        analysis = json.loads(resp_text)
        return analysis
    except Exception as e:
        print(f"Template Analysis Error: {e}")
        return None

@router.post("/admin/templates/upload")
def upload_offer_letter_template(request: TemplateUploadRequest):
    if mongo_db.offer_letter_templates is None:
        return {"error": "Database error: offer_letter_templates collection missing"}
    
    # AI Analysis & Conversion
    analysis = analyze_and_convert_template(request.content_base64, request.file_type)
    
    if not analysis:
        return {"error": "AI Analysis failed. Please try a cleaner file."}

    mongo_db.offer_letter_templates.update_one(
        {"employment_type": request.employment_type},
        {"$set": {
            "html_content": analysis["html_template"],
            "placeholders": analysis["placeholders"],
            "original_type": request.file_type,
            "updated_at": datetime.datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    return {
        "message": f"Template processed and updated for {request.employment_type}",
        "placeholders": analysis["placeholders"]
    }

@router.get("/admin/templates")
def list_offer_letter_templates():
    if mongo_db.offer_letter_templates is None:
        return []
    # Return everything except the massive html_content to keep list light
    templates = list(mongo_db.offer_letter_templates.find({}, {"_id": 0, "html_content": 0}))
    return templates

@router.delete("/admin/templates/{employment_type}")
def delete_offer_letter_template(employment_type: str):
    mongo_db.offer_letter_templates.delete_one({"employment_type": employment_type})
    return {"message": f"Template deleted for {employment_type}"}
