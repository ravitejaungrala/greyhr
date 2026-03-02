import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class MongoDBClient:
    def __init__(self):
        self.uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.db_name = os.getenv("MONGODB_DB_NAME", "greyhr_db")
        
        try:
            self.client = MongoClient(self.uri)
            self.db = self.client[self.db_name]
            
            # Sub-collections
            self.users = self.db["users"] # Login credentials & HR data
            self.attendance = self.db["attendance"] # Sign in / Sign out logs
            
            print(f"Connected to MongoDB: {self.db_name}")
        except Exception as e:
            print(f"Failed to connect to MongoDB: {e}")
            self.client = None
            self.db = None

mongo_db = MongoDBClient()
