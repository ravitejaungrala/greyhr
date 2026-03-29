import os
import sys
import datetime
from dotenv import load_dotenv

# Add the backend directory to sys.path to import local modules
sys.path.append(os.path.join(os.getcwd(), "apps", "backend"))

from database.mongo_client import mongo_db

def test_overview():
    try:
        print("Testing Admin Overview Logic...")
        
        if mongo_db.db is None or mongo_db.users is None:
            print("Error: Database not connected")
            return
        
        # Staffing
        print("Fetching staffing counts...")
        total_employees = mongo_db.users.count_documents({"status": "approved"})
        pending_approvals = mongo_db.users.count_documents({"status": "pending"})
        print(f"Total: {total_employees}, Pending: {pending_approvals}")
        
        # Leaves (Today)
        print("Fetching leave counts...")
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        active_leaves = mongo_db.db.leaves.count_documents({
            "status": "Approved",
            "start_date": {"$lte": today_str},
            "end_date": {"$gte": today_str}
        })
        pending_leaves = mongo_db.db.leaves.count_documents({"status": "Pending"})
        print(f"Active Leaves: {active_leaves}, Pending Leaves: {pending_leaves}")

        # Requests
        print("Fetching item requests...")
        item_requests = mongo_db.db.item_requests.count_documents({"status": "Pending"})
        print(f"Item Requests: {item_requests}")
        
        # Recent Activity (Last 5)
        print("Fetching recent users...")
        recent_users = list(mongo_db.users.find({}, {"name": 1, "employee_id": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5))
        print(f"Recent Users Count: {len(recent_users)}")
        
        # Announcement
        print("Fetching announcement...")
        announcement = mongo_db.db.announcements.find_one({}, {"_id": 0})
        print(f"Announcement: {announcement}")
        
        print("SUCCESS: All logic executed correctly.")
        
    except Exception as e:
        print(f"FAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_overview()
