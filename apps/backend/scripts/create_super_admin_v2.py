from pymongo import MongoClient
import os
import datetime
from dotenv import load_dotenv

# Load .env file
load_dotenv("c:/Raviteja/NeuZen AI/grey-hr/apps/backend/.env")

# Connect to MongoDB
uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_DB_NAME", "greyhr_db")
client = MongoClient(uri)
db = client[db_name]
users = db.users

def create_or_promote_super_admin():
    target_email = "raviteja.u@neuzenai.com"
    target_name = "Chakravarthi"
    target_password = "Raviteja@2003"
    
    # Check if user exists
    user = users.find_one({"email": target_email})
    
    if user:
        # Update existing user
        result = users.update_one(
            {"email": target_email},
            {"$set": {
                "name": target_name,
                "password": target_password,
                "role": "super_admin",
                "status": "approved"
            }}
        )
        if result.modified_count > 0:
            print(f"Success: Existing user {target_email} updated and promoted to super_admin!")
        else:
            print(f"User {target_email} already exists with these settings.")
    else:
        # Create new user
        new_user = {
            "employee_id": "EMP999SUP",
            "name": target_name,
            "email": target_email,
            "password": target_password,
            "role": "super_admin",
            "status": "approved",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "joining_date": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        users.insert_one(new_user)
        print(f"Success: New super_admin user created: {target_email}")

if __name__ == "__main__":
    create_or_promote_super_admin()
