import google.generativeai as genai
import json
import base64
import os
from jinja2 import Environment, BaseLoader, FileSystemLoader, ChoiceLoader, TemplateNotFound
import pdfkit
from xhtml2pdf import pisa
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

from database.s3_client import s3_db
from api.doc_config import DOCUMENT_CONFIGS

class S3Loader(BaseLoader):
    """Custom Jinja2 loader that fetches templates from S3."""
    def __init__(self, s3_client, prefix="templates/"):
        self.s3_client = s3_client
        self.prefix = prefix

    def get_source(self, environment, template):
        key = f"{self.prefix}{template}"
        print(f"Fetching template {template} from S3 with key {key}...")
        source_bytes = self.s3_client.get_image(key)
        if not source_bytes:
            print(f"Template {template} not found in S3.")
            raise TemplateNotFound(template)
        
        try:
            source = source_bytes.decode('utf-8')
        except UnicodeDecodeError:
            print(f"Failed to decode template {template} as UTF-8.")
            raise TemplateNotFound(template)
            
        return source, None, lambda: True

# Join local templates directory
templates_dir = os.path.join(os.path.dirname(base_dir), 'templates')

# Jinja2 Setup - Hybrid Loader (Local first, then S3)
env = Environment(
    loader=ChoiceLoader([
        FileSystemLoader(templates_dir),
        S3Loader(s3_db)
    ])
)
static_dir = os.path.join(base_dir, 'static')
logo_path = os.path.join(static_dir, 'logo.png').replace('\\', '/')
signature_path = os.path.join(static_dir, 'signature.png').replace('\\', '/')

MASTER_PROMPT = """
Act as the HR Operations Backend for DHANADURGA. 
Analyze the input and return a JSON object with ONLY the exact field names listed below.

### Fields by Document Type:

- PAYSLIP fields: emp_name, emp_code, month_year, designation, department, doj, days_worked, bank_name, account_no, pan_no, pf_no, basic, hra, special_allowance, total_earnings, prof_tax, pf_deduction, income_tax, total_deductions, net_salary, amount_in_words

- INTERNSHIP_OFFER fields: emp_name, current_date, designation, internship_description, stipend, duration, doj, acceptance_deadline, your_name, your_designation

- FULL_TIME_OFFER fields: emp_name, designation, doj, offer_date, monthly_basic, annual_basic, monthly_hra, annual_hra, monthly_stat_bonus, annual_stat_bonus, monthly_lta, annual_lta, monthly_personal_allowance, annual_personal_allowance, monthly_gross, annual_gross, employer_pf_monthly, fixed_ctc_monthly, fixed_ctc_annual, variable_bonus_monthly, variable_bonus_annual, total_ctc_monthly, total_ctc_annual, inhand_amount, employee_signature_name, signing_date

- EXPERIENCE fields: emp_name, designation, start_date, end_date

- RELIEVING fields: emp_name, current_date, designation, department, last_working_day, resignation_date

- INTERNSHIP_COMPLETION fields: emp_name, current_date, designation, start_date, end_date, performance_summary

### Global Rules:
- Company Name: NEUZENAI IT Solutions Pvt Ltd.
- Signatory: B. Subba Rami Reddy, Co-Founder.
- Format: Return ONLY raw JSON. No markdown blocks. No extra keys beyond those listed above.
"""

def extract_doc_data(raw_data, doc_type):
    """
    Step 1: Gemini Data Extraction
    Returns the structured JSON data representing the ROI fields.
    """
    print(f"Extracting data for {doc_type}...")
    prompt = f"{MASTER_PROMPT}\n\nFormat this for a {doc_type}:\n{raw_data}"
    response = model.generate_content(prompt)
    
    try:
        cleaned_json = response.text.strip().strip('`').replace('json', '').strip()
        data = json.loads(cleaned_json)
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        print(f"Raw Response: {response.text}")
        return {"error": "Failed to extract structured data from Gemini."}

def render_doc_to_html_bytes(data, doc_type):
    """
    Renders Jinja2 template and returns HTML bytes without saving to disk.
    """
    print(f"Rendering {doc_type} document to HTML...")
    template_name = f"{doc_type}.html"
    if doc_type in DOCUMENT_CONFIGS:
        template_name = DOCUMENT_CONFIGS[doc_type].get("template", template_name)
        
    try:
        template = env.get_template(template_name)
    except Exception as e:
        return None, f"Template {template_name} not found."
    
    # Data Injection
    # Use the correct filenames as provided by the user
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    data['logo_path'] = f'{backend_url}/static/chatbot%20icon.png' # Using the Dhanadurga Chatbot/Main Icon
    data['signature_path'] = f'{backend_url}/static/signature.png'
    data['signatory_name'] = "B. Subba Rami Reddy"
    data['signatory_designation'] = "Co-Founder"
    
    html_out = template.render(data)
    
    try:
        html_bytes = html_out.encode('utf-8')
        return html_bytes, None
    except Exception as ex:
        import traceback
        traceback.print_exc()
        return None, f"HTML conversion failed: {str(ex)}"

def render_and_save_doc(data, doc_type):
    """
    Step 2: Take extracted data, render Jinja2 template as HTML.
    """
    html_bytes, error = render_doc_to_html_bytes(data, doc_type)
    if error:
        return {"error": error}
        
    # Use /tmp for documents on Lambda/Cloud environments to avoid permission issues
    is_lambda = os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    if is_lambda:
        output_dir = "/tmp/generated_docs"
    else:
        output_dir = os.path.join(base_dir, 'generated_docs')
        
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    emp_name = data.get('emp_name', 'Employee').replace(' ', '_')
    output_filename = f"{emp_name}_{doc_type}.html"
    output_path = os.path.join(output_dir, output_filename)
    
    with open(output_path, "wb") as f:
        f.write(html_bytes)

    return {
        "status": "success",
        "doc_type": doc_type,
        "output_filename": output_filename,
        "output_path": output_path,
        "data_extracted": data
    }

def generate_any_neuzenai_doc(raw_data, doc_type):
    """
    Legacy wrapper for end-to-end generation in one step.
    """
    extract_result = extract_doc_data(raw_data, doc_type)
    if "error" in extract_result:
        return extract_result
    
    return render_and_save_doc(extract_result["data"], doc_type)

def process_uploaded_template(file_bytes, file_type, mime_type):
    """
    Uses Gemini to convert a document (PDF, Image, HTML) into a dynamic Jinja2 HTML template.
    Extracts high-ROI fields and replaces them with {{field_name}}.
    """
    print(f"Processing uploaded template of type {file_type}...")
    
    # Prompt for Gemini
    prompt = """
    Act as a professional UI/UX developer and document automation expert.
    I am providing you with a document (it could be an Image, PDF, or raw HTML).
    
    Your task:
    1. Recreate this document as a clean, responsive, and aesthetically pleasing HTML/CSS template.
    2. Use modern styling (Flexbox/Grid, Google Fonts if appropriate).
    3. IMPORTANT: Identify all dynamic fields in the document (like Employee Name, Dates, Salary, Company Names, etc.).
    4. Replace these dynamic fields with standard Jinja2 placeholders using double curly braces: {{field_name}}.
    5. Ensure the resulting HTML is self-contained (internal CSS).
    6. Return a JSON object with two keys:
       - "html_template": The complete HTML code as a string.
       - "extracted_fields": A list of the field names you used in the template (e.g., ["emp_name", "joining_date"]).
    
    Return ONLY the raw JSON object. No markdown formatting.
    """
    
    try:
        # Prepare the media part
        media_part = {
            "mime_type": mime_type,
            "data": base64.b64encode(file_bytes).decode('utf-8')
        }
        
        response = model.generate_content([prompt, media_part])
        cleaned_json = response.text.strip().strip('`').replace('json', '').strip()
        result = json.loads(cleaned_json)
        return {"status": "success", "data": result}
    except Exception as e:
        print(f"Error in Gemini template processing: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"AI processing failed: {str(e)}"}

def save_new_template(template_name, html_content):
    """
    Saves a newly generated template to S3.
    """
    s3_key = f"templates/{template_name}.html"
    try:
        s3_db.save_file(s3_key, html_content.encode('utf-8'), content_type='text/html')
        return {"status": "success", "s3_key": s3_key}
    except Exception as e:
        return {"error": f"Failed to save template to S3: {str(e)}"}
