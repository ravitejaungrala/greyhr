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
    """Fetch emails of admins or a specific approver. Includes fallback the general admin list."""
    emails = []
    approver_provided = approver_id is not None and str(approver_id).strip() != ""
    
    if approver_provided:
        # Fetch specific approver
        admin = mongo_db.users.find_one({"employee_id": approver_id}, {"email": 1, "_id": 0})
        if admin and "email" in admin:
            emails.append(admin["email"])
    
    # If no specific approver email found, fallback to all admins/superadmins
    if not emails:
        admins = list(mongo_db.users.find(
            {"role": {"$in": ["admin", "super_admin"]}}, 
            {"email": 1, "_id": 0}
        ))
        emails = [a["email"] for a in admins if "email" in a]
    
    # Ultimate fallback to hardcoded admin if still none found
    if not emails:
        emails = ["contact@neuzenai.com"]
    return emails

def send_approval_email(recipient_emails, subject, body_html, cc_emails=None):
    """Generic SMTP sender with safety fallbacks."""
    # Ensure recipient_emails is a valid non-empty list of strings
    if not recipient_emails or not isinstance(recipient_emails, list):
        print(f"SMTP Error: Invalid recipients list provided: {recipient_emails}")
        # Final emergency fallback if list is totally empty or corrupted
        recipient_emails = ["contact@neuzenai.com"]

    # Sanitize CC emails
    safe_cc = []
    if cc_emails and isinstance(cc_emails, list):
        safe_cc = [str(email) for email in cc_emails if email and str(email).strip()]

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"NeuzenAI HRMS <{SMTP_USER}>"
        msg["To"] = ", ".join(recipient_emails)
        
        if safe_cc:
            msg["Cc"] = ", ".join(safe_cc)
        
        all_recipients = recipient_emails + safe_cc

        part = MIMEText(body_html, "html")
        msg.attach(part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, all_recipients, msg.as_string())
        
        print(f"SMTP Success: Email sent to {recipient_emails} (CC: {safe_cc})")
        return True
    except Exception as e:
        print(f"SMTP Critical Failure: {e}")
        # Log more context for debugging
        print(f"Context: Subject='{subject}', Recipients={recipient_emails}")
        return False

def get_premium_template(title, employee_name, details, id_val, type_of_request="leave"):
    """Returns an ultra-premium, table-based HTML email template for 100% Outlook compatibility."""
    c_primary = "#0a66c2" 
    c_bg = "#f0f2f5"
    c_card = "#ffffff"
    c_text = "#4b5563"
    c_heading = "#111827"
    
    base_ep = "leaves" if type_of_request == "leave" else "items"
    app_url = f"{BACKEND_URL}/admin/{base_ep}/approve-direct?id={id_val}&status=Approved"
    rej_url = f"{BACKEND_URL}/admin/{base_ep}/approve-direct?id={id_val}&status=Rejected"

    rows_html = ""
    for k, v in details.items():
        rows_html += f"""
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 35%;">{k}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: {c_heading}; font-size: 14px; font-weight: 600;">{v}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: {c_bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: {c_bg}; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: {c_card}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                        <!-- Brand Bar -->
                        <tr>
                            <td align="center" style="background-color: {c_primary}; padding: 24px;">
                                <div style="color: #ffffff; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">
                                    NeuzenAI HRMS
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 48px;">
                                <h1 style="margin: 0 0 16px 0; font-size: 24px; color: {c_heading}; font-weight: 800; line-height: 1.2;">{title}</h1>
                                <p style="margin: 0 0 32px 0; font-size: 16px; color: {c_text}; line-height: 1.6;">
                                    Hello Administrator, <br/>
                                    A new <strong>{type_of_request} request</strong> from <strong>{employee_name}</strong> is pending your review.
                                </p>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                                    {rows_html}
                                </table>

                                <!-- Action Buttons -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px;">
                                    <tr>
                                        <td align="center">
                                            <a href="{app_url}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 40px; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none;">Approve</a>
                                            &nbsp;&nbsp;
                                            <a href="{rej_url}" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 40px; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none;">Reject</a>
                                        </td>
                                    </tr>
                                </table>

                                <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
                                    <a href="https://neuzenaihr.web.app/admin" style="color: {c_primary}; font-size: 13px; font-weight: 600; text-decoration: none;">View in Admin Dashboard &rarr;</a>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 32px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
                                <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; 2026 NeuzenAI IT Solutions. Automated system notification.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html

def send_leave_notification(employee_name, leave_details, leave_id, approver_id=None, cc_ids=None):
    """Orchestrates leave notification with balance and CC recipients."""
    recipients = get_admin_emails(approver_id)
    
    cc_emails = []
    if cc_ids and isinstance(cc_ids, list):
        # Clean the list of any dummy/empty values
        clean_ids = [str(cid) for cid in cc_ids if cid and str(cid).strip()]
        if clean_ids:
            cursor = mongo_db.users.find({"employee_id": {"$in": clean_ids}}, {"email": 1, "_id": 0})
            cc_emails = [u["email"] for u in cursor if u.get("email")]
        
    subject = leave_details.get("subject") or f"🔔 Leave Request: {employee_name}"
    
    # Extract details safely
    details = {
        "Employee": employee_name,
        "Leave Type": leave_details.get("leave_type", "Leave"),
        "Start Date": leave_details.get("start_date", "TBD"),
        "End Date": leave_details.get("end_date", "TBD"),
        "Reason": leave_details.get("reason", "No reason provided")
    }

    # Add Dynamic Balance if available
    if "current_balance" in leave_details:
        details["Remaining Balance"] = leave_details["current_balance"]
    
    html = get_premium_template("New Leave Request", employee_name, details, leave_id, "leave")
    return send_approval_email(recipients, subject, html, cc_emails)

def send_item_notification(employee_name, item_details, request_id, approver_id=None, cc_ids=None):
    recipients = get_admin_emails(approver_id)
    
    cc_emails = []
    if cc_ids:
        cursor = mongo_db.users.find({"employee_id": {"$in": cc_ids}}, {"email": 1, "_id": 0})
        cc_emails = [u["email"] for u in cursor if "email" in u]

    subject = item_details.get("subject", f"📦 Item Request: {employee_name}")
    
    details = {
        "Employee": employee_name,
        "Item": item_details.get("item_name"),
        "Quantity": item_details.get("quantity"),
        "Reason": item_details.get("reason")
    }

    html = get_premium_template("New Item Request", employee_name, details, request_id, "item")
    return send_approval_email(recipients, subject, html, cc_emails)
    
