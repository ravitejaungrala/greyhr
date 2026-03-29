from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv("c:/Raviteja/NeuZen AI/grey-hr/apps/backend/.env")
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client.get_database("greyhr")
users = db.users

user = users.find_one({"email": "raviteja.ungarala2003@gmail.com"})
print(f"User Email: raviteja.ungarala2003@gmail.com")
if user:
    print(f"Name: {user.get('name')}")
    print(f"Role: {user.get('role')}")
    print(f"Employee ID: {user.get('employee_id')}")
else:
    print("User not found")
