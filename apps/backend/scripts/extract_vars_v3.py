import re

template_path = r"c:\Users\jaswa\Neuzenai\HRMS\apps\backend\templates\full_time_offer.html"

vars_found = set()
with open(template_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        matches = re.findall(r"\{\{\s*(\w+)\s*\}\}", line)
        for m in matches:
            vars_found.add(m)

print("\n--- START OF VARIABLES ---")
for var in sorted(list(vars_found)):
    print(var)
print("--- END OF VARIABLES ---\n")
