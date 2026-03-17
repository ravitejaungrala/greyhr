import re

filepath = "c:\\Users\\jaswa\\Neuzenai\\HRMS\\apps\\frontend\\src\\pages\\AdminDashboard.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the exact line
found = False
for i, line in enumerate(lines):
    if "in_hand_salary: emp.in_hand_salary" in line and "pan_no" in lines[i+1]:
        # Strip newline and add a comma
        lines[i] = line.rstrip("\n").rstrip("\r") + ",\n"
        print(f"Fixed line {i+1}")
        found = True
        break

if not found:
    print("Target line not found!")

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fix Complete 2")
