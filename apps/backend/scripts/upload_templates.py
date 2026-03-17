import os
import sys
from pathlib import Path

# Add the parent directory to sys.path to import S3Database
current_dir = Path(__file__).parent
backend_dir = current_dir.parent
sys.path.append(str(backend_dir))

from database.s3_client import s3_db

def upload_templates():
    templates_dir = backend_dir / "templates"
    if not templates_dir.exists():
        print(f"Templates directory not found: {templates_dir}")
        return

    print(f"Uploading templates from {templates_dir} to S3 bucket: {s3_db.bucket_name}")
    
    for template_file in templates_dir.glob("*.html"):
        print(f"Uploading {template_file.name}...")
        with open(template_file, "rb") as f:
            file_bytes = f.read()
            
        key = f"templates/{template_file.name}"
        content_type = "text/html"
        
        success = s3_db.save_file(key, file_bytes, content_type)
        if success:
            print(f"Successfully uploaded {template_file.name} to {key}")
        else:
            print(f"Failed to upload {template_file.name}")

if __name__ == "__main__":
    upload_templates()
