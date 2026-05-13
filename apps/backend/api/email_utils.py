import smtplib
import os
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database.mongo_client import mongo_db
from dotenv import load_dotenv

load_dotenv(override=True)

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
BACKEND_URL = os.getenv("BACKEND_URL")

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
    
    # Ultimate fallback to empty if still none found
    if not emails:
        emails = [] # No hardcoded fallback as per user request
    return emails

def send_approval_email(recipient_emails, subject, body_html, cc_emails=None):
    """Generic SMTP sender with safety fallbacks."""
    # Ensure recipient_emails is a valid non-empty list of strings
    if not recipient_emails or not isinstance(recipient_emails, list):
        print(f"SMTP Error: Invalid recipients list provided: {recipient_emails}")
        # Final emergency fallback - logic should handle empty lists safely
        recipient_emails = [] 


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
    """Returns a clean, professional HTML email template for admin/HR approvals."""
    c_primary = "#1a1a2e"
    c_accent = "#ff4500"
    c_bg = "#f7f7f8"
    c_card = "#ffffff"
    c_text = "#3d3d4e"
    c_heading = "#1a1a2e"
    c_border = "#e8e8ec"
    c_muted = "#8b8b9e"
    
    base_ep = "leaves" if type_of_request == "leave" else "items"
    app_url = f"{BACKEND_URL}/admin/{base_ep}/approve-direct?id={id_val}&status=Approved"
    rej_url = f"{BACKEND_URL}/admin/{base_ep}/approve-direct?id={id_val}&status=Rejected"
    safe_title = escape(str(title))
    safe_employee_name = escape(str(employee_name))
    request_label = "Leave" if type_of_request == "leave" else "Item"

    rows_html = ""
    for k, v in details.items():
        safe_k = escape(str(k))
        safe_v = escape(str(v))
        rows_html += f"""
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid {c_border}; color: {c_muted}; font-size: 13px; width: 38%; vertical-align: top;">{safe_k}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid {c_border}; color: {c_heading}; font-size: 13px; font-weight: 600;">{safe_v}</td>
        </tr>
        """

    # Contextual greeting and body based on request type
    if type_of_request == "leave":
        intro_line = f"{safe_employee_name} has applied for leave and it needs your approval. Please review the details below and take the necessary action."
        action_note = "You can approve or reject this request directly from this email, or log in to the dashboard for more details."
    else:
        intro_line = f"{safe_employee_name} has raised a request for an item. Kindly review the details and respond at your earliest convenience."
        action_note = "Use the buttons below to approve or reject, or visit the admin panel for the full request history."

    html = f"""
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{safe_title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: {c_bg}; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: {c_bg}; padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="580" style="background-color: {c_card}; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding: 20px 28px; border-bottom: 1px solid {c_border};">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td>
                                            <span style="font-size: 15px; font-weight: 700; color: {c_heading}; letter-spacing: -0.3px;">NeuzenAI</span>
                                            <span style="font-size: 12px; color: {c_muted}; margin-left: 6px;">HR Management</span>
                                        </td>
                                        <td align="right">
                                            <span style="display: inline-block; background-color: #fff3e0; color: #e65100; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Action Required</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 28px 28px 12px 28px;">
                                <p style="margin: 0 0 6px 0; font-size: 18px; color: {c_heading}; font-weight: 700; line-height: 1.3;">{safe_title}</p>
                                <p style="margin: 0 0 20px 0; font-size: 13px; color: {c_muted};">Submitted just now</p>
                                
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: {c_text}; line-height: 1.65;">
                                    Hi there,
                                </p>
                                <p style="margin: 0 0 22px 0; font-size: 14px; color: {c_text}; line-height: 1.65;">
                                    {intro_line}
                                </p>

                                <!-- Details Card -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border-radius: 8px; border: 1px solid {c_border}; margin-bottom: 6px;">
                                    <tr>
                                        <td colspan="2" style="padding: 10px 16px; border-bottom: 1px solid {c_border};">
                                            <span style="font-size: 11px; font-weight: 700; color: {c_muted}; text-transform: uppercase; letter-spacing: 0.8px;">{request_label} Details</span>
                                        </td>
                                    </tr>
                                    {rows_html}
                                </table>

                                <p style="margin: 20px 0 22px 0; font-size: 13px; color: {c_muted}; line-height: 1.6;">
                                    {action_note}
                                </p>

                                <!-- Action Buttons -->
                                <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                                    <tr>
                                        <td style="padding-right: 10px;">
                                            <a href="{app_url}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 10px 22px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none; letter-spacing: 0.2px;">Approve</a>
                                        </td>
                                        <td>
                                            <a href="{rej_url}" style="display: inline-block; background-color: #ffffff; color: #dc2626; padding: 9px 22px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid #fca5a5; letter-spacing: 0.2px;">Reject</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="padding: 0 28px;">
                                <div style="border-top: 1px solid {c_border};"></div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 16px 28px 20px 28px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td>
                                            <a href="https://neuzenaihr.web.app/admin" style="color: {c_accent}; font-size: 12px; font-weight: 600; text-decoration: none;">Open Dashboard &rarr;</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 10px 0 0 0; font-size: 11px; color: #b0b0be; line-height: 1.5;">
                                    You're receiving this because you're listed as an approver in NeuzenAI HRMS. If this doesn't look right, please contact your system administrator.
                                </p>
                            </td>
                        </tr>
                    </table>

                    <!-- Sub-footer -->
                    <table border="0" cellpadding="0" cellspacing="0" width="580" style="margin-top: 16px;">
                        <tr>
                            <td align="center">
                                <p style="margin: 0; font-size: 11px; color: #b0b0be;">NeuzenAI Pvt. Ltd. &middot; T-Hub Phase 2, Hyderabad</p>
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
    
    leave_type = leave_details.get("leave_type", "Leave")
    start = leave_details.get("start_date", "")
    end = leave_details.get("end_date", "")
    date_range = f"{start} to {end}" if start and end and start != end else (start or "TBD")
    
    subject = leave_details.get("subject") or f"{employee_name} – {leave_type} ({date_range})"
    
    # Extract details safely
    details = {
        "Employee": employee_name,
        "Leave Type": leave_type,
        "From": leave_details.get("start_date", "TBD"),
        "To": leave_details.get("end_date", "TBD"),
        "Reason": leave_details.get("reason", "Not specified")
    }

    # Add Dynamic Balance if available
    if "current_balance" in leave_details:
        details["Balance After"] = leave_details["current_balance"]
    
    html = get_premium_template("Leave Request", employee_name, details, leave_id, "leave")
    return send_approval_email(recipients, subject, html, cc_emails)

def send_item_notification(employee_name, item_details, request_id, approver_id=None, cc_ids=None):
    recipients = get_admin_emails(approver_id)
    
    cc_emails = []
    if cc_ids:
        cursor = mongo_db.users.find({"employee_id": {"$in": cc_ids}}, {"email": 1, "_id": 0})
        cc_emails = [u["email"] for u in cursor if "email" in u]

    item_name = item_details.get("item_name", "Item")
    subject = item_details.get("subject", f"{employee_name} – {item_name} Request")
    
    details = {
        "Employee": employee_name,
        "Item": item_name,
        "Quantity": item_details.get("quantity"),
        "Reason": item_details.get("reason", "Not specified")
    }

    html = get_premium_template("Item Request", employee_name, details, request_id, "item")
    return send_approval_email(recipients, subject, html, cc_emails)
    
