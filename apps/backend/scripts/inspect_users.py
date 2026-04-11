from database.mongo_client import mongo_db
import json

def inspect_users():
    if mongo_db.users is None:
        print("Users collection missing")
        return
    
    users = list(mongo_db.users.find({}, {
        "employee_id": 1, 
        "name": 1, 
        "joining_date": 1, 
        "onboarding_completed_at": 1,
        "status": 1
    }))
    print(json.dumps(users, indent=2))

if __name__ == "__main__":
    inspect_users()
