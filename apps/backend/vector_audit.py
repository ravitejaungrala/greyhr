import os
import chromadb
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
col = client.get_or_create_collection(CHROMA_COLLECTION)
res = col.get(include=["metadatas"])

ids = res.get("ids", [])
metas = res.get("metadatas", [])

leave_count = sum(1 for m in metas if m.get("type") == "leave_request")
profile_count = sum(1 for m in metas if m.get("type") == "employee_profile")

print(f"Inventory Summary for collection '{CHROMA_COLLECTION}':")
print(f"Total Items: {len(ids)}")
print(f"Employee Profiles: {profile_count}")
print(f"Leave Requests: {leave_count}")
