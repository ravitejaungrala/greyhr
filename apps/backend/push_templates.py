import os
import sys

# Load environment variables first
from dotenv import load_dotenv
load_dotenv(r"c:\Raviteja\NeuZen AI\grey-hr\apps\backend\.env")

# Add backend directory to path so we can import database modules
sys.path.append(r"c:\Raviteja\NeuZen AI\grey-hr\apps\backend")

from database.s3_client import s3_db

def push_all_templates():
    templates_dir = r"c:\Raviteja\NeuZen AI\grey-hr\apps\backend\templates"
    print(f"\n--- SYNCING TEMPLATES ---")
    if not os.path.exists(templates_dir):
        print(f"Error: Templates directory not found at {templates_dir}")
        return

    for filename in os.listdir(templates_dir):
        if filename.endswith(".html"):
            file_path = os.path.join(templates_dir, filename)
            with open(file_path, "rb") as f:
                content = f.read()
                s3_key = f"templates/{filename}"
                print(f"Uploading {filename} to S3 (key: {s3_key})...")
                success = s3_db.save_file(s3_key, content, content_type="text/html")
                if success:
                    print(f"Successfully uploaded {filename}")
                else:
                    print(f"Failed to upload {filename}")

def push_static_assets():
    static_dir = r"c:\Raviteja\NeuZen AI\grey-hr\apps\backend\static"
    print(f"\n--- SYNCING STATIC ASSETS ---")
    if not os.path.exists(static_dir):
        print(f"Error: Static directory not found at {static_dir}")
        return

    for filename in os.listdir(static_dir):
        file_path = os.path.join(static_dir, filename)
        if os.path.isfile(file_path):
            with open(file_path, "rb") as f:
                content = f.read()
                s3_key = f"static/{filename}"
                content_type = "image/png" if filename.endswith(".png") else "application/octet-stream"
                print(f"Uploading {filename} to S3 (key: {s3_key})...")
                success = s3_db.save_file(s3_key, content, content_type=content_type)
                if success:
                    print(f"Successfully uploaded {filename}")
                else:
                    print(f"Failed to upload {filename}")

if __name__ == "__main__":
    push_all_templates()
    push_static_assets()
    print("\nAll assets synced to S3 successfully!")
