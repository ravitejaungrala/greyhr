import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from api.doc_engine import render_and_save_doc

def generate_test_docs():
    test_data = {
        "payslip": {
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
            "amount_in_words": "Seventy Thousand Rupees Only"
        },
        "internship_offer": {
            "emp_name": "Jane Smith",
            "current_date": "2026-03-14",
            "designation": "Software Intern",
            "internship_description": "Building AI-driven HRMS modules and improving automated testing flows.",
            "stipend": "15,000",
            "duration": "6 Months",
            "doj": "2026-04-01",
            "acceptance_deadline": "2026-03-20",
            "your_name": "B. Subba Rami Reddy",
            "your_designation": "Co-Founder"
        },
        "full_time_offer": {
            "emp_name": "Robert Brown",
            "candidate_name": "Robert Brown",
            "designation": "Project Manager",
            "doj": "2026-05-01",
            "offer_date": "2026-03-14",
            "current_date": "2026-05-01",
            "monthly_basic": "50,000",
            "annual_basic": "6,00,000",
            "monthly_hra": "25,000",
            "annual_hra": "3,00,000",
            "monthly_stat_bonus": "2,000",
            "annual_stat_bonus": "24,000",
            "monthly_lta": "5,000",
            "annual_lta": "60,000",
            "monthly_personal_allowance": "18,000",
            "annual_personal_allowance": "2,16,000",
            "monthly_gross": "1,00,000",
            "annual_gross": "12,00,000",
            "employer_pf_monthly": "1,800",
            "monthly_gratuity": "2,400",
            "fixed_ctc_monthly": "1,04,200",
            "fixed_ctc_annual": "12,50,400",
            "variable_bonus_monthly": "5,000",
            "variable_bonus_annual": "60,000",
            "total_ctc_monthly": "1,09,200",
            "total_ctc_annual": "13,10,400",
            "inhand_amount": "95,000",
            "signing_date": "2026-03-14",
            "probation_period": "6 Months"
        },
        "experience": {
            "emp_name": "Alice Wilson",
            "designation": "QA Engineer",
            "start_date": "2024-02-01",
            "end_date": "2026-02-28"
        },
        "relieving": {
            "emp_name": "Michael Johnson",
            "current_date": "2026-03-14",
            "designation": "Frontend Lead",
            "department": "UI/UX",
            "last_working_day": "2026-03-10",
            "resignation_date": "2026-02-10"
        }
    }

    print("--- STARTING TEST GENERATION ---")
    docs_to_test = test_data.keys()
    # docs_to_test = ["payslip"] # Uncomment to test specific one
    
    for doc_type in docs_to_test:
        data = test_data[doc_type]
        print(f"\nGenerating {doc_type}...")
        try:
            result = render_and_save_doc(data, doc_type)
            if "error" in result:
                print(f"FAILED: {result['error']}")
            else:
                print(f"SUCCESS: Saved to {result['output_filename']}")
        except Exception as e:
            import traceback
            print(f"EXCEPTION during {doc_type}:")
            traceback.print_exc()

if __name__ == "__main__":
    generate_test_docs()
