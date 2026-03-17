import os
import sys
from pathlib import Path

# Add the parent directory to sys.path to import S3Database
current_dir = Path(__file__).parent
backend_dir = current_dir.parent
sys.path.append(str(backend_dir))

from database.s3_client import s3_db

def inspect_template(template_name):
    key = f"templates/{template_name}"
    print(f"Inspecting {key} from S3...")
    content_bytes = s3_db.get_image(key)
    if content_bytes:
        content = content_bytes.decode('utf-8')
        print("--- CONTENT START ---")
        print(content[:2000]) # First 2000 chars
        print("...")
        print("--- CONTENT END ---")
    else:
        print(f"Failed to read {key}")

if __name__ == "__main__":
    inspect_template("payslip.html")
