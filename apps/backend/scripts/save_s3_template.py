import os
import sys
from pathlib import Path

# Add the parent directory to sys.path to import S3Database
current_dir = Path(__file__).parent
backend_dir = current_dir.parent
sys.path.append(str(backend_dir))

from database.s3_client import s3_db

def save_template_locally(template_name):
    key = f"templates/{template_name}"
    content_bytes = s3_db.get_image(key)
    if content_bytes:
        with open(template_name, "wb") as f:
            f.write(content_bytes)
        print(f"Saved {template_name} locally.")
    else:
        print(f"Failed to read {key}")

if __name__ == "__main__":
    save_template_locally("payslip.html")
