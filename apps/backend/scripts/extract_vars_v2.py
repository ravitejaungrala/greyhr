import re

template_path = r"c:\Users\jaswa\Neuzenai\HRMS\apps\backend\templates\full_time_offer.html"

with open(template_path, 'r', encoding='utf-8') as f:
    content = f.read()

variables = re.findall(r"\{\{\s*(\w+)\s*\}\}", content)
unique_vars = sorted(list(set(variables)))

print("\n--- START OF VARIABLES ---")
for var in unique_vars:
    print(var)
print("--- END OF VARIABLES ---\n")
