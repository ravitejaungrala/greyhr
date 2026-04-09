import os
import sys
import json
from api.router import mongo_db
from bson import ObjectId

def check_user(email):
    try:
        user = mongo_db.users.find_one({"email": email})
        if not user:
            print(f"User {email} not found.")
            return
        
        fields = ["employee_id", "joining_date", "status", "role", "employment_type", 
                  "privilege_leave_rate", "sick_leave_rate", "casual_leave_rate", "comp_off_balance"]
        
        data = {f: user.get(f) for f in fields}
        print("User Data:")
        print(json.dumps(data, indent=2))
        
        # Also check approved leaves
        leaves = list(mongo_db.leaves.find({"employee_id": user["employee_id"], "status": {"$regex": "Approved", "$options": "i"}}))
        print(f"\nApproved Leaves Count: {len(leaves)}")
        for l in leaves:
            print(f"- {l['leave_type']}: {l['start_date']} to {l['end_date']}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user("vennala@neuzenai.com")
