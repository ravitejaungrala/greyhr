DOCUMENT_CONFIGS = {
    "full_time_offer": {
        "name": "Full-Time Offer Letter",
        "template": "full_time_offer.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "doj": {"type": "date", "label": "Date of Joining", "required": True},
            "offer_date": {"type": "date", "label": "Offer Date", "required": True},
            "monthly_basic": {"type": "number", "label": "Monthly Basic Salary", "required": True},
            "annual_basic": {"type": "number", "label": "Annual Basic Salary", "required": True},
            "monthly_hra": {"type": "number", "label": "Monthly HRA", "required": True},
            "annual_hra": {"type": "number", "label": "Annual HRA", "required": True},
            "monthly_stat_bonus": {"type": "number", "label": "Monthly Statutory Bonus", "required": False},
            "annual_stat_bonus": {"type": "number", "label": "Annual Statutory Bonus", "required": False},
            "monthly_lta": {"type": "number", "label": "Monthly LTA", "required": False},
            "annual_lta": {"type": "number", "label": "Annual LTA", "required": False},
            "monthly_personal_allowance": {"type": "number", "label": "Monthly Personal Allowance", "required": False},
            "annual_personal_allowance": {"type": "number", "label": "Annual Personal Allowance", "required": False},
            "monthly_gross": {"type": "number", "label": "Monthly Gross Salary", "required": True},
            "annual_gross": {"type": "number", "label": "Annual Gross Salary", "required": True},
            "employer_pf_monthly": {"type": "number", "label": "Employer PF (Monthly)", "required": False},
            "inhand_amount": {"type": "number", "label": "In-hand Amount", "required": True}
        }
    },
    "internship_offer": {
        "name": "Internship Offer Letter",
        "template": "internship_offer.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "current_date": {"type": "date", "label": "Current Date", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "internship_description": {"type": "textarea", "label": "Internship Description", "required": True},
            "stipend": {"type": "text", "label": "Stipend Amount", "required": True},
            "duration": {"type": "text", "label": "Duration", "required": True},
            "doj": {"type": "date", "label": "Date of Joining", "required": True},
            "acceptance_deadline": {"type": "date", "label": "Acceptance Deadline", "required": True},
            "your_name": {"type": "text", "label": "Signatory Name", "required": True, "default": "B. Subba Rami Reddy"},
            "your_designation": {"type": "text", "label": "Signatory Designation", "required": True, "default": "Founder & CEO"}
        }
    },
    "internship_completion": {
        "name": "Internship Completion Certificate",
        "template": "internship_completion.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "current_date": {"type": "date", "label": "Issue Date", "required": True},
            "designation": {"type": "text", "label": "Internship Role", "required": True},
            "start_date": {"type": "date", "label": "Start Date", "required": True},
            "end_date": {"type": "date", "label": "Completion Date", "required": True},
            "performance_summary": {"type": "textarea", "label": "Performance Summary", "required": False, "default": "Successfully completed with good performance."}
        }
    },
    "experience": {
        "name": "Experience Letter",
        "template": "experience.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "start_date": {"type": "date", "label": "Start Date", "required": True},
            "end_date": {"type": "date", "label": "End Date", "required": True}
        }
    },
    "relieving": {
        "name": "Relieving Letter",
        "template": "relieving.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "current_date": {"type": "date", "label": "Current Date", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "department": {"type": "text", "label": "Department", "required": True},
            "last_working_day": {"type": "date", "label": "Last Working Day", "required": True},
            "resignation_date": {"type": "date", "label": "Resignation Date", "required": True}
        }
    },
    "payslip": {
        "name": "Payslip",
        "template": "payslip.html",
        "roi_fields": {
            "emp_name": {"type": "text", "label": "Employee Name", "required": True},
            "emp_code": {"type": "text", "label": "Employee Code", "required": True},
            "month_year": {"type": "text", "label": "Month & Year (e.g., March 2026)", "required": True},
            "designation": {"type": "text", "label": "Designation", "required": True},
            "department": {"type": "text", "label": "Department", "required": True},
            "doj": {"type": "date", "label": "Date of Joining", "required": True},
            "days_worked": {"type": "number", "label": "Days Worked", "required": True},
            "bank_name": {"type": "text", "label": "Bank Name", "required": True},
            "account_no": {"type": "text", "label": "Bank Account Number", "required": True},
            "pan_no": {"type": "text", "label": "PAN Card Number", "required": True},
            "pf_no": {"type": "text", "label": "PF Account Number", "required": True},
            "basic": {"type": "number", "label": "Basic Salary", "required": True},
            "hra": {"type": "number", "label": "House Rent Allowance (HRA)", "required": True},
            "special_allowance": {"type": "number", "label": "Special Allowance", "required": True},
            "total_earnings": {"type": "number", "label": "Total Gross Earnings", "required": True},
            "prof_tax": {"type": "number", "label": "Professional Tax", "required": True},
            "pf_deduction": {"type": "number", "label": "PF Deduction", "required": True},
            "income_tax": {"type": "number", "label": "Income Tax (TDS)", "required": True},
            "total_deductions": {"type": "number", "label": "Total Deductions", "required": True},
            "net_salary": {"type": "number", "label": "Net Take-Home Salary", "required": True},
            "amount_in_words": {"type": "text", "label": "Net Salary in Words", "required": True}
        }
    }
}
