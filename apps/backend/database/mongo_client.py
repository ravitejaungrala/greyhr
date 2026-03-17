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
            self.leaves = self.db["leaves"]
            self.holidays = self.db["holidays"]
            self.payslip_releases = self.db["payslip_releases"]
            self.kudos = self.db["kudos"]
            self.announcements = self.db["announcements"]
            self.offer_letter_templates = self.db["offer_letter_templates"]
            self.workday_overrides = self.db["workday_overrides"]
            self.comp_off_requests = self.db["comp_off_requests"]
            self.weekend_work_requests = self.db["weekend_work_requests"]
            self.item_requests = self.db["item_requests"]
            
            print(f"Connected to MongoDB: {self.db_name}")
        except Exception as e:
            print(f"Failed to connect to MongoDB: {e}")
            self.client = None
            self.db = None
            self.users = None
            self.attendance = None
            self.leaves = None
            self.holidays = None
            self.payslip_releases = None
            self.kudos = None
            self.announcements = None
            self.offer_letter_templates = None
            self.workday_overrides = None
            self.comp_off_requests = None
            self.weekend_work_requests = None
            self.item_requests = None

mongo_db = MongoDBClient()
