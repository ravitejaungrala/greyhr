import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "greyhr_db")

def debug():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    print(f"--- Notifications for EMPBB2319 ---")
    notes = list(db.notifications.find({"employee_id": "EMPBB2319"}).sort("created_at", -1).limit(15))
    for n in notes:
        print(f"{n.get('created_at')} | {n.get('action')} | {n.get('message')}")

    print(f"\n--- Attendance Records for EMPBB2319 ---")
    att = list(db.attendance.find({"employee_id": "EMPBB2319"}).sort("timestamp", -1).limit(15))
    for a in att:
        print(f"{a.get('timestamp')} | {a.get('action')}")

if __name__ == "__main__":
    debug()
