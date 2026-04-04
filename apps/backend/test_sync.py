import os
import chromadb
import pymongo
from dotenv import load_dotenv

load_dotenv()

CHROMA_CLOUD_API_KEY = os.getenv("CHROMA_CLOUD_API_KEY", "").strip()
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "").strip()
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "").strip()
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "hrms").strip()

client = chromadb.HttpClient(
    host='https://api.trychroma.com', 
    headers={'X-Chroma-Token': CHROMA_CLOUD_API_KEY}, 
    tenant=CHROMA_TENANT, 
    database=CHROMA_DATABASE
)
collection = client.get_or_create_collection(name=CHROMA_COLLECTION)

print(f"Connected to ChromaDB: {CHROMA_COLLECTION}")

# Test sync one leaf
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME")
m_client = pymongo.MongoClient(MONGO_URI)
db = m_client[DB_NAME]

leaf = db.leaves.find_one({})
if leaf:
    print(f"Syncing leaf: {leaf.get('_id')}")
    leave_id = str(leaf.get("id") or leaf.get("_id"))
    emp_id = leaf.get("employee_id")
    
    doc_text = f"Test Leaf for {emp_id}"
    metadata = {"type": "leave_request", "employee_id": emp_id}
    
    try:
        collection.upsert(
            ids=[f"leave_{leave_id}"],
            documents=[doc_text],
            metadatas=[metadata]
        )
        print("Upsert Successful")
    except Exception as e:
        print(f"UPSERT ERROR: {e}")
else:
    print("No leaves found in MongoDB to test sync.")

print(f"Final Count: {collection.count()}")
