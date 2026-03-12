import boto3
import json
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

class S3Database:
    def __init__(self):
        # In a real environment, load from environment variables
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "ai-workforce-os-mock-bucket")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        
        # We'll use a local mock mode if no credentials are provided for development
        self.mock_mode = not os.getenv("AWS_ACCESS_KEY_ID")
        self.local_storage = {}
        
        if not self.mock_mode:
            self.s3_client = boto3.client('s3')

    def save_data(self, key: str, data: dict):
        if self.mock_mode:
            self.local_storage[key] = data
            return True
            
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=json.dumps(data)
            )
            return True
        except ClientError as e:
            print(f"Error saving to S3: {e}")
            return False

    def save_image(self, key: str, image_bytes: bytes, content_type: str = 'image/jpeg'):
        if self.mock_mode:
            print(f"Mock Mode: Saving image to local storage at {key}")
            self.local_storage[key] = image_bytes
            return True
            
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_bytes,
                ContentType=content_type
            )
            return True
        except ClientError as e:
            print(f"Error saving image to S3: {e}")
            return False

    def save_file(self, key: str, file_bytes: bytes, content_type: str):
        if self.mock_mode:
            print(f"Mock Mode: Saving file to local storage at {key}")
            self.local_storage[key] = file_bytes
            return True
            
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_bytes,
                ContentType=content_type
            )
            return True
        except ClientError as e:
            print(f"Error saving file to S3: {e}")
            return False

    def get_image(self, key: str):
        if self.mock_mode:
            print(f"Mock Mode: Retrieving image from local storage at {key}")
            return self.local_storage.get(key, None)
            
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return response['Body'].read()
        except ClientError as e:
            print(f"Error reading image from S3: {e}")
            return None

s3_db = S3Database()
