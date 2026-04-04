import os
import pymongo
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

approved_count = db.users.count_documents({"status": "approved"})
leave_count = db.leaves.count_documents({})

print(f"RESULTS: Approved={approved_count}, Leaves={leave_count}")
