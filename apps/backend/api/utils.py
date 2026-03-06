import base64
import os
import datetime
import jinja2
from io import BytesIO
from xhtml2pdf import pisa
from fpdf import FPDF
from pypdf import PdfReader
import google.generativeai as genai
from database.s3_client import s3_db
from database.mongo_client import mongo_db
import json

def parse_base64(b64_string: str) -> bytes:
    if ',' in b64_string:
        b64_string = b64_string.split(',')[1]
    return base64.b64decode(b64_string)

def get_attendance_calendar(employee_id: str):
    if mongo_db.attendance is None: return {"history": []}
    records = list(mongo_db.attendance.find({"employee_id": employee_id}).sort("timestamp", -1).limit(100))
    history = {}
    for r in records:
        day = r["timestamp"].split('T')[0]
        time_str = r["timestamp"].split('T')[1][:5]
        if day not in history: history[day] = {"date": day, "punches": []}
        history[day]["punches"].append({"action": r.get("action", "sign_in"), "time": time_str, "datetime": r["timestamp"]})
        
    dates_sorted = sorted(list(history.keys()))
    for day in dates_sorted:
        data = history[day]
        punches = sorted(data["punches"], key=lambda x: x["datetime"])
        first_in = next((p["time"] for p in punches if p["action"] == "sign_in"), "-")
        last_out = next((p["time"] for p in reversed(punches) if p["action"] == "sign_out"), "-")
        
        total_hrs = "-"
        tot_sec = 0
        if first_in != "-" and last_out != "-":
            try:
                tdelta = datetime.datetime.strptime(last_out, "%H:%M") - datetime.datetime.strptime(first_in, "%H:%M")
                tot_sec = int(tdelta.total_seconds())
                if tot_sec > 0:
                    hrs, rem = divmod(tot_sec, 3600)
                    mins, _ = divmod(rem, 60)
                    total_hrs = f"{hrs:02d}:{mins:02d}"
            except: pass
                
        has_half_day_leave = False
        if mongo_db.db is not None:
            leave = mongo_db.leaves.find_one({"employee_id": employee_id, "status": "Approved", "start_date": {"$lte": day}, "end_date": {"$gte": day}})
            if leave and leave.get("type") == "Half Day Leave": has_half_day_leave = True
                
        status_text, status_char, color, deduction = "Present", "P", "var(--secondary)", 0
        if tot_sec >= 9 * 3600: pass
        elif first_in != "-":
            if has_half_day_leave:
                status_text, status_char, color = "Half Day Leave", "HL", "#A855F7"
            else:
                if last_out == "-":
                    status_text, status_char, color, deduction = "Warning Type 2 (Missing Sign-out)", "W2", "#F59E0B", 0
                else:
                    status_text, status_char, color, deduction = "Half Day (Time Variance)", "HD", "#F59E0B", 250
                
        data.update({"first_in": first_in, "last_out": last_out, "total_work_hrs": total_hrs, "actual_work_hrs": total_hrs, "status": status_text, "status_char": status_char, "color": color, "deduction": deduction})
        del data["punches"]
    return {"history": list(history.values())}

def _calculate_employee_salary(employee_id: str):
    if mongo_db.users is None:
        return {"error": "Database error"}
    user = mongo_db.users.find_one({"employee_id": employee_id}, {"_id": 0, "monthly_salary": 1, "employment_type": 1})
    if not user:
        return {"error": "Employee not found"}
    
    monthly_salary = user.get("monthly_salary", 0)
    employment_type = user.get("employment_type", "Full-Time")
    
    lop_days = 0
    if mongo_db.db is not None:
        if employment_type == "Intern":
            lop_days = mongo_db.leaves.count_documents({
                "employee_id": employee_id,
                "status": "Approved by Admin"
            })
        else:
            lop_days = mongo_db.leaves.count_documents({
                "employee_id": employee_id,
                "status": "Rejected"
            })

    lop_deduction = lop_days * 500
    
    attendance_penalty = 0
    # Note: get_attendance_calendar needs to be imported or handled
    # We'll circular import if we're not careful. 
    # For now, we'll keep it here or pass it in.
    # Actually, let's move get_attendance_calendar logic or just the simple penalty logic.
    
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

def generate_offer_letter_pdf(data):
    pdf = FPDF()
    pdf.add_page()
    is_intern = data.get('employment_type') == 'Intern'
    
    # Header
    pdf.set_fill_color(255, 69, 0)
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_font("Arial", 'B', 24)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(15, 15)
    pdf.cell(0, 10, "NeuzenAI", ln=False)
    pdf.set_font("Arial", '', 10)
    pdf.set_xy(15, 25)
    pdf.cell(0, 5, "Empowering Businesses with AI Solutions", ln=True)
    
    pdf.set_text_color(26, 26, 26)
    pdf.ln(20)
    pdf.set_font("Arial", 'B', 16)
    pdf.set_x(15)
    pdf.cell(0, 10, "OFFER OF EMPLOYMENT", ln=True)
    
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
    
    pdf.ln(15)
    pdf.set_x(15)
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(90, 8, "For NeuzenAI IT Solutions,", ln=False)
    pdf.cell(0, 8, "Accepted By,", align='R', ln=True)
    pdf.output()


def generate_payslip_pdf(employee, salary, month_year, format_info):
    pdf = FPDF()
    pdf.add_page()
    template_image = s3_db.get_image("settings/payslip_template.jpg")
    if template_image:
        temp_path = "/tmp/template_ps.jpg"
        with open(temp_path, "wb") as f: f.write(template_image)
        pdf.image(temp_path, x=0, y=0, w=210, h=297)
    pdf.set_font("Arial", size=10)
    pdf.set_text_color(0, 0, 0)
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

def analyze_and_convert_template(content_b64: str, file_type: str, employment_type: str = "Full-Time"):
    try:
        content_bytes = parse_base64(content_b64)
        
        # Configure Gemini API Key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Gemini API Key not found in environment.")
            return None
        genai.configure(api_key=api_key)

        # Use Gemini 2.0 Flash for both text and image analysis
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        model = genai.GenerativeModel(model_name)
        
        if file_type in ['jpg', 'png', 'jpeg', 'image']:
            # Image Based Analysis (Vision)
            prompt = f"""
            You are an HR technical assistant at NeuzenAI. Analyze this company document image (Payslip or {employment_type} Offer Letter).
            1. Extract the layout and convert it into a valid, clean HTML template.
            2. Use {{{{placeholder_name}}}} for all dynamic fields (e.g. {{{{Employee_Name}}}}, {{{{Date}}}}, {{{{Role}}}}, {{{{Basic}}}}, {{{{HRA}}}}, etc.).
            3. CRITICAL: If you see a Signature area or Company Logo, use an <img src="{{{{placeholder_name}}}}" style="max-height: 50px;" /> tag with a relevant name (e.g. {{{{hr_signature_image}}}}, {{{{company_logo}}}}).
            4. CRITICAL: Identify and list all "ROI / Investment" fields found in the document.
            4. Return ONLY a valid JSON object with:
               "html_template": "the complete HTML string",
               "placeholders": ["list", "of", "detected", "placeholders"],
               "roi_fields": ["list", "of", "investment", "fields", "detected"],
               "document_type": "detected type (Payslip/Offer Letter)"
            """
            image_data = {'mime_type': 'image/jpeg', 'data': content_bytes}
            response = model.generate_content([prompt, image_data], generation_config={"response_mime_type": "application/json"})
        else:
            # Text/PDF Based Analysis
            raw_text = ""
            if file_type == 'pdf':
                reader = PdfReader(BytesIO(content_bytes))
                for page in reader.pages: raw_text += page.extract_text() + "\n"
            else:
                raw_text = content_bytes.decode('utf-8', errors='ignore')
            
            prompt = f"""
            You are an HR technical assistant at NeuzenAI. I have an {employment_type} document template in {file_type} format.
            Analyze the structure and:
            1. Convert it into a clean HTML template using {{{{placeholder}}}} syntax for dynamic data.
            2. Detect all dynamic placeholders correctly.
            3. CRITICAL: If you see a Signature area or Company Logo, use an <img src="{{{{placeholder_name}}}}" style="max-height: 50px;" /> tag with a relevant name (e.g. {{{{hr_signature_image}}}}, {{{{company_logo}}}}).
            4. Return ONLY a valid JSON object with:
               "html_template": "html string",
               "placeholders": ["detected", "placeholders"],
               "roi_fields": ["any", "salary", "components", "detected"],
               "document_type": "detected type"
            
            Raw Content:
            """
            prompt += raw_text[:8000]
            response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})

        try:
            return json.loads(response.text)
        except:
            resp_text = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(resp_text)
    except Exception as e:
        print(f"Template Analysis Error: {e}")
        return None

def generate_html_pdf(html_template: str, params: dict):
    # Use jinja2 to fill placeholders
    from jinja2 import Template
    tpl = Template(html_template)
    filled_html = tpl.render(**params)
    
    result = BytesIO()
    pisa.CreatePDF(BytesIO(filled_html.encode("utf-8")), dest=result)
    return result.getvalue()

