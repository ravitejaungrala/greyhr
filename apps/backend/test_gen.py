from api.doc_engine import generate_any_neuzenai_doc

raw_data = """
Create a payslip for John Doe (Emp Code: NZ-001) for the month of February 2026.
He works as a Software Engineer in the Engineering department. His DOJ is 01-01-2025.
Bank: HDFC Bank, AC: 123456789, PAN: ABCDE1234F, PF: TS/HYD/12345/678.
Days worked: 28.
Earnings: Basic: 30000, HRA: 15000, Special: 5000. Total Earnings: 50000.
Deductions: PF: 1800, Prof Tax: 200, Income Tax: 1000. Total Deductions: 3000.
Net Salary: 47000 (Forty Seven Thousand Only).
"""

print("Testing document generation...")
result = generate_any_neuzenai_doc(raw_data, "payslip")
print(result)
