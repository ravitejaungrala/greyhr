import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database.mongo_client import mongo_db
from dotenv import load_dotenv

load_dotenv(override=True)

SMTP_USER = os.getenv("SMTP_USER", "raviteja.ungarala2003@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "jcxm cagd ckss xpkq")
BACKEND_URL = os.getenv("BACKEND_URL", "https://on3uxagkjotqw27olp3gsqyr7i0wvcjn.lambda-url.ap-south-1.on.aws/api")

def get_admin_emails(approver_id=None):
    """Fetch emails of admins or a specific approver."""
    ifApproverProvided = approver_id is not None
    
    if ifApproverProvided:
        # Fetch specific approver
        admin = mongo_db.users.find_one({"employee_id": approver_id}, {"email": 1, "_id": 0})
        return [admin["email"]] if admin and "email" in admin else []
    
    # Fetch all admins and superadmins
    admins = list(mongo_db.users.find(
        {"role": {"$in": ["admin", "super_admin"]}}, 
        {"email": 1, "_id": 0}
    ))
    # Fallback to hardcoded admin if none found in DB
    emails = [a["email"] for a in admins if "email" in a]
    if not emails:
        emails = ["admin@dhanadurga.com"]
    return emails

def send_approval_email(recipient_emails, subject, body_html, cc_emails=None):
    """Generic SMTP sender."""
    if not recipient_emails:
        print("No recipients for email notification.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Dhanadurga HRMS <{SMTP_USER}>"
        msg["To"] = ", ".join(recipient_emails)
        
        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)
        
        all_recipients = recipient_emails + (cc_emails if cc_emails else [])

        part = MIMEText(body_html, "html")
        msg.attach(part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, all_recipients, msg.as_string())
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def send_leave_notification(employee_name, leave_details, leave_id, approver_id=None, cc_ids=None):
    recipients = get_admin_emails(approver_id)
    
    cc_emails = []
    if cc_ids:
        # Fetch emails for CC IDs
        cursor = mongo_db.users.find({"employee_id": {"$in": cc_ids}}, {"email": 1, "_id": 0})
        cc_emails = [u["email"] for u in cursor if "email" in u]
        
    subject = leave_details.get("subject", f"🔔 Leave Application: {employee_name}")
    
    # Approval Links
    approve_url = f"{BACKEND_URL}/admin/leaves/approve-direct?id={leave_id}&status=Approved"
    reject_url = f"{BACKEND_URL}/admin/leaves/approve-direct?id={leave_id}&status=Rejected"

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">New Leave Application</h2>
            <p><strong>Employee:</strong> {employee_name}</p>
            <p><strong>Type:</strong> {leave_details.get('leave_type')}</p>
            <p><strong>Dates:</strong> {leave_details.get('start_date')} to {leave_details.get('end_date')}</p>
            <p><strong>Reason:</strong> {leave_details.get('reason')}</p>
            
            <div style="margin-top: 30px; display: flex; gap: 10px;">
                <a href="{approve_url}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">✅ Approve</a>
                <a href="{reject_url}" style="background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-left: 10px;">❌ Reject</a>
            </div>
            
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
                You can also approve this in the <a href="https://dhanadurgahr.web.app/admin">Admin Dashboard</a>.
            </p>
        </div>
    </body>
    </html>
    """
    return send_approval_email(recipients, subject, html, cc_emails)

def send_item_notification(employee_name, item_details, request_id, approver_id=None, cc_ids=None):
    recipients = get_admin_emails(approver_id)
    
    cc_emails = []
    if cc_ids:
        # Fetch emails for CC IDs
        cursor = mongo_db.users.find({"employee_id": {"$in": cc_ids}}, {"email": 1, "_id": 0})
        cc_emails = [u["email"] for u in cursor if "email" in u]

    subject = item_details.get("subject", f"📦 Item Request: {employee_name}")
    
    approve_url = f"{BACKEND_URL}/admin/items/approve-direct?id={request_id}&status=Approved"
    reject_url = f"{BACKEND_URL}/admin/items/approve-direct?id={request_id}&status=Rejected"

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0A66C2;">New Item Request</h2>
            <p><strong>Employee:</strong> {employee_name}</p>
            <p><strong>Item:</strong> {item_details.get('item_name')}</p>
            <p><strong>Quantity:</strong> {item_details.get('quantity')}</p>
            <p><strong>Reason:</strong> {item_details.get('reason')}</p>
            
            <div style="margin-top: 30px;">
                <a href="{approve_url}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">✅ Approve</a>
                <a href="{reject_url}" style="background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-left: 10px;">❌ Reject</a>
            </div>
        </div>
    </body>
    </html>
    """
    return send_approval_email(recipients, subject, html, cc_emails)
