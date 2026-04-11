import os
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "greyhr_db")

def repair():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    notifications = db["notifications"]
    attendance = db["attendance"]

    print(f"Connecting to {DB_NAME}...")
    
    # Process all attendance notifications
    notes = list(notifications.find({"type": "attendance"}))
    print(f"Found {len(notes)} attendance notifications to check.")
    
    repaired_count = 0
    
    for note in notes:
        emp_id = note.get("employee_id")
        created_at = note.get("created_at")
        
        if not emp_id or not created_at:
            continue
            
        # Match with attendance record (timestamp match first 16 chars: YYYY-MM-DDTHH:MM)
        # We use a small window because notifications and attendance might be off by a second
        prefix = created_at[:16]
        
        att_record = attendance.find_one({
            "employee_id": emp_id,
            "timestamp": {"$regex": f"^{prefix}"}
        })
        
        if att_record:
            action = att_record["action"] # sign_in or sign_out
            verb = "signed in" if action == "sign_in" else "signed out"
            new_message = f"Employee {emp_id} {verb}."
            
            # Update the record if message is wrong or action field is missing
            if note.get("message") != new_message or "action" not in note:
                notifications.update_one(
                    {"_id": note["_id"]},
                    {"$set": {
                        "message": new_message,
                        "action": action
                    }}
                )
                repaired_count += 1
                print(f"Repaired: {emp_id} at {created_at} -> {action}")
    
    print(f"Done. Repaired {repaired_count} records.")

if __name__ == "__main__":
    repair()
