from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv("c:/Raviteja/NeuZen AI/grey-hr/apps/backend/.env")
client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_database(os.getenv("MONGODB_DB_NAME"))
users = db.users

# Promote UNGARALA NAGA VENKATA RAVITEJA (EMP193AFA)
result = users.update_one(
    {"employee_id": "EMP193AFA"},
    {"$set": {"role": "super_admin"}}
)

if result.modified_count > 0:
    print("Success: UNGARALA NAGA VENKATA RAVITEJA (EMP193AFA) promoted to super_admin!")
else:
    # Double check by email if ID failed
    result_email = users.update_one(
        {"email": "raviteja.ungarala2003@gmail.com"},
        {"$set": {"role": "super_admin"}}
    )
    if result_email.modified_count > 0:
        print("Success: raviteja.ungarala2003@gmail.com promoted to super_admin!")
    else:
        print("No changes made. User may already be super_admin or was not found.")
