import os
import dns.resolver
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Override DNS to Google (8.8.8.8) and Cloudflare (1.1.1.1)
# This handles cases where the local router/ISP DNS fails to resolve MongoDB Atlas SRV records.
try:
    custom_resolver = dns.resolver.Resolver(configure=False)
    custom_resolver.nameservers = ['8.8.8.8', '8.8.4.4', '1.1.1.1']
    dns.resolver.default_resolver = custom_resolver
except Exception as e:
    print(f"Warning: Failed to override DNS resolver: {e}")

class MongoDBClient:
    def __init__(self):
        self.uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.db_name = os.getenv("MONGODB_DB_NAME", "greyhr_db")
        self.last_error = None
        
        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
            self.db = self.client[self.db_name]
            
            # Test connection
            self.client.admin.command('ismaster')
            
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
            self.historical_employees = self.db["historical_employees"]
            
            print(f"Connected to MongoDB: {self.db_name}")
        except Exception as e:
            self.last_error = str(e)
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
            self.historical_employees = None

    def get_status(self):
        if self.client and self.db is not None:
            try:
                self.client.admin.command('ismaster')
                return {"status": "connected", "database": self.db_name}
            except Exception as e:
                return {"status": "disconnected", "error": str(e)}
        return {"status": "disconnected", "error": self.last_error or "Not initialized"}

mongo_db = MongoDBClient()
