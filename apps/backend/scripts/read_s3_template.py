import re
import os
import sys
from pathlib import Path

# Add the parent directory to sys.path to import S3Database
current_dir = Path(__file__).parent
backend_dir = current_dir.parent
sys.path.append(str(backend_dir))

from database.s3_client import s3_db

def list_vars(template_name):
    key = f"templates/{template_name}"
    content_bytes = s3_db.get_image(key)
    if content_bytes:
        content = content_bytes.decode('utf-8')
        variables = sorted(list(set(re.findall(r'\{\{\s*(\w+)\s*\}\}', content))))
        print("|".join(variables))
    else:
        print(f"Failed to read {key}")

if __name__ == "__main__":
    list_vars("full_time_offer.html")
