from pydantic import BaseModel
from typing import Optional, List
import datetime

class EmployeeRegistrationRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None

class HolidayRequest(BaseModel):
    name: str
    date: str
    type: str = "Holiday"

class ProfileUpdateRequest(BaseModel):
    employee_id: str
    dob: str
    is_experienced: bool
    bank_account: str
    bank_ifsc: str
    bank_photo_base64: str
    education_degree: str
    education_cert_base64: str
    prev_company: Optional[str] = None
    prev_role: Optional[str] = None
    experience_years: Optional[str] = None
    image_base64: str

class PayslipTemplateRequest(BaseModel):
    employment_type: str
    content_base64: str
    file_type: str

class AdminCopilotRequest(BaseModel):
    query: str

class Notification(BaseModel):
    type: str 
    message: str
    employee_id: Optional[str] = None
    created_at: str = datetime.datetime.utcnow().isoformat()

class PayslipReleaseRequest(BaseModel):
    month_year: str 
    release: bool = True

class AnnouncementRequest(BaseModel):
    title: str
    content: str

class OfferLetterRequest(BaseModel):
    employee_id: str
    employment_type: str 
    date: str
    role: str
    role_description: str
    stipend: Optional[str] = None
    duration: Optional[str] = None
    annual_ctc: Optional[float] = 0.0
    notice_period: Optional[str] = None
    has_pf: Optional[bool] = False
    pf_amount: Optional[float] = 0.0
    in_hand_salary: Optional[float] = 0.0
    annexure_details: Optional[str] = None
    template_type: Optional[str] = "Standard"

class EmployeeUpdate(BaseModel):
    employment_type: Optional[str] = None
    position: Optional[str] = None
    monthly_salary: Optional[int] = None
    privilege_leave_rate: Optional[float] = None
    sick_leave_rate: Optional[float] = None
    casual_leave_rate: Optional[float] = None

class AdminApprovalRequest(BaseModel):
    employee_id: str
    action: str 
    employment_type: Optional[str] = "Full-Time"
    position: Optional[str] = "Staff"
    monthly_salary: Optional[int] = 0
    privilege_leave_rate: Optional[float] = 0.0
    sick_leave_rate: Optional[float] = 0.5
    casual_leave_rate: Optional[float] = 1.0

class LeaveRequest(BaseModel):
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class KudosRequest(BaseModel):
    sender_id: str
    sender_name: str
    receiver_name: str
    message: str

class TemplateUploadRequest(BaseModel):
    employment_type: str
    content_base64: str
    file_type: str
    document_type: str = "Offer Letter"

class CopilotQuery(BaseModel):
    query: str
    employee_id: Optional[str] = None

class AttendanceScanRequest(BaseModel):
    employee_id: str
    image_base64: str
    location: str
    action_type: str

class LeaveStatusUpdate(BaseModel):
    status: str

class TemplateSaveRequest(BaseModel):
    employment_type: str
    html_template: str
    placeholders: List[str]
    company_details: Optional[dict] = {}
    document_type: str = "Offer Letter"

