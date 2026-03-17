filepath = "c:\\Users\\jaswa\\Neuzenai\\HRMS\\apps\\frontend\\src\\pages\\AdminDashboard.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = "in_hand_salary: emp.in_hand_salary || 0\n                                                     pan_no: emp.pan_no || ''"
replacement = "in_hand_salary: emp.in_hand_salary || 0,\n                                                     pan_no: emp.pan_no || ''"

if target in content:
    content = content.replace(target, replacement)
    print("Fixed target 1")
else:
    # Try with \r\n
    target_crlf = "in_hand_salary: emp.in_hand_salary || 0\r\n                                                     pan_no: emp.pan_no || ''"
    replacement_crlf = "in_hand_salary: emp.in_hand_salary || 0,\r\n                                                     pan_no: emp.pan_no || ''"
    if target_crlf in content:
        content = content.replace(target_crlf, replacement_crlf)
        print("Fixed target CRLF")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Fix Complete")
