with open(r"c:\Users\jaswa\Neuzenai\HRMS\apps\frontend\src\pages\AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(860, 878):
    if i < len(lines):
        print(f"[{i+1}] {repr(lines[i])}")
