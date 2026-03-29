from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv("c:/Raviteja/NeuZen AI/grey-hr/apps/backend/.env")
client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_database(os.getenv("MONGODB_DB_NAME"))
users = db.users

all_users = list(users.find({}, {"_id": 0, "name": 1, "email": 1, "role": 1, "employee_id": 1, "status": 1}))
for u in all_users:
    print(u)
