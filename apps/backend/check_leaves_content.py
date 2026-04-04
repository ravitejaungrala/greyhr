import os
import pymongo
from dotenv import load_dotenv

load_dotenv()

client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('MONGODB_DB_NAME')]

leaves = list(db.leaves.find({}, {'status': 1, 'reason': 1, 'employee_id': 1}))
print(f"Total Leaves Checked: {len(leaves)}")
for i, l in enumerate(leaves):
    print(f"Record {i}: ID={l.get('employee_id')}, Status={l.get('status')}, Reason={l.get('reason')}")
