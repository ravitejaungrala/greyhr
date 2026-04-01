import os
import sys
import asyncio
import pymongo
from dotenv import load_dotenv

# Add the parent directory to sys.path so we can import from 'api'
sys.path.append(os.path.join(os.getcwd(), 'apps', 'backend'))

from api.admin_agent import sync_all_to_vector_db

def main():
    load_dotenv(os.path.join('apps', 'backend', '.env'))
    
    # MongoDB Connection
    MONGODB_URI = os.getenv("MONGODB_URI")
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in environment.")
        return

    try:
        client = pymongo.MongoClient(MONGODB_URI)
        db = client['greyhr'] # Target database
        
        print("--- Starting Manual AI Memory Sync ---")
        sync_all_to_vector_db(db)
        print("--- Sync Process Complete ---")
        
    except Exception as e:
        print(f"Error during sync: {e}")

if __name__ == "__main__":
    main()
