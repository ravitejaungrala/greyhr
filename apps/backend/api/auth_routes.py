from fastapi import APIRouter
import uuid
import datetime
from .models import EmployeeRegistrationRequest, LoginRequest
from .utils import parse_base64
from database.mongo_client import mongo_db

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register_employee(request: EmployeeRegistrationRequest):
    if not request.email.lower().endswith("@dhanadurga.com"):
        return {"error": "Only @dhanadurga.com email addresses are accepted for employee registration."}

    if mongo_db.users is not None and mongo_db.users.find_one({"email": request.email}):
        return {"error": "Email already exists"}
        
    emp_id = f"EMP{uuid.uuid4().hex[:6].upper()}"
    
    user_record = {
        "employee_id": emp_id,
        "name": request.name,
        "email": request.email,
        "password": request.password, 
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

@router.post("/login")
def login(request: LoginRequest):
    if mongo_db.users is None:
        return {"error": "Database error"}
    
    if request.email == 'admin@dhanadurga.com' and request.password == 'Dhanadurga@2003':
        return {"role": "admin", "name": "Admin", "email": request.email}
    
    user = mongo_db.users.find_one({"email": request.email, "password": request.password})
    if not user:
        return {"error": "Invalid email or password"}
    
    return {
        "role": user.get("role", "employee"),
        "name": user["name"],
        "email": user["email"],
        "employee_id": user["employee_id"],
        "status": user["status"]
    }

@router.get("/admin/pending")
def get_pending_employees():
    if mongo_db.users is None: return {"employees": []}
    employees = list(mongo_db.users.find({"status": "incomplete_profile"}, {"_id": 0, "password": 0}))
    return {"employees": employees}

@router.get("/admin/employees")
def get_approved_employees():
    if mongo_db.users is None: return {"employees": []}
    employees = list(mongo_db.users.find({"status": "approved"}, {"_id": 0, "password": 0}))
    return {"employees": employees}
