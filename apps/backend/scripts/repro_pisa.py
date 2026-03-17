import os
import sys
from pathlib import Path
from io import BytesIO
from xhtml2pdf import pisa
from jinja2 import Template

# Mock data
data = {
    "emp_name": "John Doe",
    "emp_code": "NZ1234",
    "month_year": "March 2026",
    "designation": "Senior Developer",
    "department": "Engineering",
    "doj": "2024-01-15",
    "days_worked": 31,
    "bank_name": "HDFC Bank",
    "account_no": "1234567890",
    "pan_no": "ABCDE1234F",
    "pf_no": "PF/12345/6789",
    "basic": 40000,
    "hra": 20000,
    "special_allowance": 15000,
    "total_earnings": 75000,
    "prof_tax": 200,
    "pf_deduction": 1800,
    "income_tax": 3000,
    "total_deductions": 5000,
    "net_salary": 70000,
    "amount_in_words": "Seventy Thousand Rupees Only",
    "logo_path": "",
    "signature_path": ""
}

template_path = r"c:\Users\jaswa\Neuzenai\HRMS\apps\backend\templates\payslip.html"
with open(template_path, 'r', encoding='utf-8') as f:
    template_str = f.read()

template = Template(template_str)
html_out = template.render(data)

print("Starting pisa.CreatePDF...")
pdf_out = BytesIO()
try:
    pisa_status = pisa.CreatePDF(html_out, dest=pdf_out)
    if pisa_status.err:
        print("PISA Error")
    else:
        print("PISA Success")
except Exception as e:
    import traceback
    traceback.print_exc()
