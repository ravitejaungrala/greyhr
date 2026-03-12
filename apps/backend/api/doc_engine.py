import google.generativeai as genai
import json
import os
from jinja2 import Environment, FileSystemLoader
import pdfkit
from xhtml2pdf import pisa
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Jinja2 Setup
# Assuming doc_engine.py is in apps/backend/api/
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
template_dir = os.path.join(base_dir, 'templates')
env = Environment(loader=FileSystemLoader(template_dir))
static_dir = os.path.join(base_dir, 'static')
logo_path = os.path.join(static_dir, 'chatbot icon.png').replace('\\', '/')
signature_path = os.path.join(static_dir, 'signature.png').replace('\\', '/')

MASTER_PROMPT = """
Act as the HR Operations Backend for NeuzenAI. 
Analyze the input and return a JSON object.

### Logic by Document Type:
- PAYSLIP: Extract earnings, deductions, bank details, and net salary. 
- INTERNSHIP OFFER: Generate 'internship_description' (2-3 professional sentences) and extract stipend/duration/doj.
- FULL-TIME OFFER: Ensure all salary components from Annexure A are extracted.
- EXPERIENCE/RELIEVING: Generate 'roles_responsibilities' based on designation and extract 'last_working_day' or tenure dates.

### Global Rules:
- Company Name: NEUZENAI IT Solutions Pvt Ltd.
- Signatory: B. Subba rami Reddy, Co-Founder.
- Format: Return ONLY raw JSON. No markdown blocks.
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

def render_doc_to_bytes(data, doc_type):
    """
    Renders Jinja2 template and converts to PDF bytes without saving to disk.
    """
    print(f"Rendering {doc_type} document to bytes...")
    try:
        template_name = f"{doc_type}.html"
        template = env.get_template(template_name)
    except Exception as e:
        return None, f"Template {template_name} not found."
    
    # Data Injection
    data['logo_path'] = 'file:///' + logo_path if os.name == 'nt' else logo_path
    data['signature_path'] = 'file:///' + signature_path if os.name == 'nt' else signature_path
    
    html_out = template.render(data)

    options = {
        'page-size': 'A4',
        'margin-top': '0', 'margin-right': '0', 'margin-bottom': '0', 'margin-left': '0',
        'enable-local-file-access': None,
        'encoding': "UTF-8",
    }
    
    try:
        pdf_bytes = pdfkit.from_string(html_out, False, options=options)
        return pdf_bytes, None
    except Exception as e:
        print(f"pdfkit failed or wkhtmltopdf missing: {e}. Falling back to xhtml2pdf.")
        try:
            pdf_out = BytesIO()
            pisa_status = pisa.CreatePDF(html_out, dest=pdf_out)
            if pisa_status.err:
                return None, "PDF generation failed in both pdfkit and xhtml2pdf."
            return pdf_out.getvalue(), None
        except Exception as ex:
            return None, f"PDF conversion failed: {str(ex)}"

def render_and_save_doc(data, doc_type):
    """
    Step 2: Take extracted data, render Jinja2 template, and convert to PDF.
    """
    pdf_bytes, error = render_doc_to_bytes(data, doc_type)
    if error:
        return {"error": error}
        
    output_dir = os.path.join(base_dir, 'generated_docs')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    emp_name = data.get('emp_name', 'Employee').replace(' ', '_')
    output_filename = f"{emp_name}_{doc_type}.pdf"
    output_path = os.path.join(output_dir, output_filename)
    
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

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
