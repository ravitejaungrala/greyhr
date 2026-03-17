import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from database.mongo_client import mongo_db

def list_collections():
    try:
        db = mongo_db.client.get_database("greyhr") # Try the corpus name as DB name
        print(f"Collections in 'greyhr': {db.list_collection_names()}")
    except:
        pass
        
    try:
        # Check current DB from mongo_client
        db_name = mongo_db.db.name
        print(f"Collections in '{db_name}': {mongo_db.db.list_collection_names()}")
    except:
        pass

if __name__ == "__main__":
    list_collections()
