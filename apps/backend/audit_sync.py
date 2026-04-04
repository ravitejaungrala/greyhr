import os
import chromadb
import pymongo
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME")
client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

CHROMA_CLOUD_API_KEY = os.getenv("CHROMA_CLOUD_API_KEY", "").strip()
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "").strip()
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "").strip()
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "hrms").strip()

cc = chromadb.HttpClient(
    host='https://api.trychroma.com', 
    headers={'X-Chroma-Token': CHROMA_CLOUD_API_KEY}, 
    tenant=CHROMA_TENANT, 
    database=CHROMA_DATABASE
)
col = cc.get_or_create_collection(CHROMA_COLLECTION)

print(f"--- STARTING AUDIT SYNC ---")
leaves = list(db.leaves.find({}))
print(f"Leaves found in MongoDB: {len(leaves)}")

success = 0
failed = 0
for i, leaf in enumerate(leaves):
    leave_id = str(leaf.get("id") or leaf.get("_id"))
    emp_id = leaf.get("employee_id")
    
    # Try to find user
    user = db.users.find_one({"employee_id": emp_id})
    emp_name = user.get("name") if user else "Unknown"
    
    doc_text = f"Leave for {emp_name} ({emp_id}). Type: {leaf.get('leave_type')}. Dates: {leaf.get('start_date')} to {leaf.get('end_date')}"
    metadata = {"type": "leave_request", "id": leave_id, "name": emp_name}
    
    try:
        col.upsert(
            ids=[f"leave_{leave_id}"],
            documents=[doc_text],
            metadatas=[metadata]
        )
        success += 1
    except Exception as e:
        print(f"FAILED record {i} (ID: {leave_id}): {e}")
        failed += 1

print(f"--- AUDIT FINISHED ---")
print(f"Succeeded: {success}")
print(f"Failed: {failed}")
print(f"New Count in Chroma: {col.count()}")
