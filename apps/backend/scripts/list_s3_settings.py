import os
import sys
from pathlib import Path
import boto3

# Add the parent directory to sys.path to import S3Database
current_dir = Path(__file__).parent
backend_dir = current_dir.parent
sys.path.append(str(backend_dir))

from database.s3_client import s3_db

def list_settings():
    print(f"Listing 'settings/' in S3 bucket: {s3_db.bucket_name}")
    s3 = boto3.client('s3')
    response = s3.list_objects_v2(Bucket=s3_db.bucket_name, Prefix="settings/")
    
    if 'Contents' in response:
        for obj in response['Contents']:
            print(f"Key: {obj['Key']}, Size: {obj['Size']}")
    else:
        print("No 'settings/' objects found in S3.")

if __name__ == "__main__":
    list_settings()
