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
            print(f"Mock Mode: Pretending to save image to S3 at {key}")
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

    def get_data(self, key: str):
        if self.mock_mode:
            return self.local_storage.get(key, None)
            
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return json.loads(response['Body'].read().decode('utf-8'))
        except ClientError as e:
            print(f"Error reading from S3: {e}")
            return None

s3_db = S3Database()
