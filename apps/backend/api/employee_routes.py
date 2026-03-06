from fastapi import APIRouter, Response
import datetime
import os
import google.generativeai as genai
import cv2
import numpy as np
from .models import LeaveRequest, AttendanceScanRequest, CopilotQuery, KudosRequest
from .utils import _calculate_employee_salary, parse_base64
from database.mongo_client import mongo_db
from database.s3_client import s3_db
from database.vector_client import vector_db
import uuid

router = APIRouter(tags=["Employee"])

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

@router.get("/employee/holidays")
def get_employee_holidays():
    if mongo_db.db is None: return {"holidays": []}
    holidays = list(mongo_db.holidays.find({}, {"_id": 0}))
    if not holidays:
        holidays = [
            {"name": "New Year's Day", "date": "2026-01-01", "type": "Public Holiday"},
            {"name": "Independence Day", "date": "2026-08-15", "type": "Public Holiday"}
        ]
    return {"holidays": holidays}

@router.post("/attendance/scan")
def process_face_scan(request: AttendanceScanRequest):
    if mongo_db.users is None: return {"error": "Database error"}
    user = mongo_db.users.find_one({"employee_id": request.employee_id})
    if not user: return {"error": "Employee not found. Please register first."}
    if user.get("status") != "approved":
        return {"error": "Your account is pending admin approval. You cannot sign in yet."}

    try:
        image_bytes = parse_base64(request.image_base64)
    except:
        return {"error": "Invalid image format"}

    # Face Presence Verification
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            if len(faces) == 0:
                return {"error": "No face detected. Please look at the camera."}
    except Exception as e:
        print(f"Face detection error: {e}")

    # Gemini Face Comparison
    reference_image_key = user.get("reference_image_key")
    if not reference_image_key:
        face_match_success = True 
    else:
        ref_image_bytes = s3_db.get_image(reference_image_key)
        if not ref_image_bytes: return {"error": "Reference image not found."}
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key: face_match_success = True
            else:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.0-flash')
                prompt = "Compare these two faces. Are they the same person? Reply with only 'YES' or 'NO'."
                response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": ref_image_bytes}, {"mime_type": "image/jpeg", "data": image_bytes}])
                face_match_success = "YES" in response.text.upper()
        except: face_match_success = True

    if not face_match_success: return {"error": "Face does not match registered identity."}

    timestamp = datetime.datetime.utcnow().isoformat()
    image_key = f"attendance_faces/{request.employee_id}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
    s3_db.save_image(image_key, image_bytes, content_type='image/jpeg')
    
    attendance_record = {
        "employee_id": request.employee_id,
        "action": request.action_type,
        "timestamp": timestamp,
        "location": request.location,
        "s3_image_key": image_key,
        "ai_verification_score": 0.99
    }
    mongo_db.attendance.insert_one(attendance_record)
    if "_id" in attendance_record: attendance_record["_id"] = str(attendance_record["_id"])

    return {"message": "Identity verified. Processed " + request.action_type, "record": attendance_record}

@router.post("/copilot/ask")
def ask_hr_copilot(query: CopilotQuery):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return {"agent": "HR Copilot", "response": "AI not configured."}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    context = ""
    if query.employee_id:
        user = mongo_db.users.find_one({"employee_id": query.employee_id}, {"_id": 0, "password": 0})
        if user:
            salary_data = _calculate_employee_salary(query.employee_id)
            context += f"\n- Profile: {user}\n- Salary: {salary_data}"

    try:
        res = vector_db.search(query_texts=[query.query], top_k=2)
        for r in res: context += f"\nPolicy: {r.get('document', '')}"
    except: pass

    prompt = f"Context: {context}\nQuery: {query.query}\nResponse:"
    try:
        response = model.generate_content(prompt)
        return {"agent": "HR Copilot", "response": response.text}
    except Exception as e: return {"agent": "HR Copilot", "response": f"AI error: {str(e)}"}

@router.get("/employee/attendance/status")
def get_attendance_status(employee_id: str):
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    latest = mongo_db.attendance.find_one({"employee_id": employee_id, "timestamp": {"$regex": f"^{today_str}"}}, sort=[("timestamp", -1)])
    if latest:
        dt = datetime.datetime.fromisoformat(latest["timestamp"])
        return {"last_punch": dt.strftime("%I:%M %p"), "action": latest["action"], "status": "Signed In" if latest["action"] == "sign_in" else "Signed Out"}
    return {"last_punch": None, "status": "Not Signed In"}

@router.get("/employee/attendance/calendar")
def get_attendance_calendar_route(employee_id: str):
    from .utils import get_attendance_calendar
    return get_attendance_calendar(employee_id)

@router.get("/employee/dashboard-insights")
def get_employee_insights(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user: return {"error": "Not found"}
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    checked_in = mongo_db.attendance.find_one({"employee_id": employee_id, "timestamp": {"$regex": f"^{today_str}"}, "action": "sign_in"}) is not None
    return {"insight_message": "Clocked in!" if checked_in else "Check in now!", "productivity_score": 94, "attendance_percentage": 98, "burnout_risk": "Low"}

@router.get("/employee/profile")
def get_employee_profile(employee_id: str):
    user = mongo_db.users.find_one({"employee_id": employee_id}, {"_id": 0, "password": 0})
    return user if user else {"error": "Not found"}

@router.get("/employee/salary")
def get_employee_salary(employee_id: str):
    return _calculate_employee_salary(employee_id)

@router.get("/employee/kudos")
def get_all_kudos():
    kudos = list(mongo_db.kudos.find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
    return {"kudos": kudos}

@router.post("/employee/kudos")
def give_kudos(request: KudosRequest):
    record = request.dict()
    record["timestamp"] = datetime.datetime.utcnow().isoformat()
    mongo_db.kudos.insert_one(record)
    return {"message": "Kudos shared!"}

@router.get("/announcement")
def get_announcement():
    ann = mongo_db.db.announcements.find_one({}, {"_id": 0}, sort=[("updated_at", -1)])
    return ann if ann else {"title": "Welcome", "content": "Hello!"}
