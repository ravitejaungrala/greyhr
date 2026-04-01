import os
import sys
from api.admin_agent import sync_all_to_vector_db
from api.router import mongo_db

if __name__ == "__main__":
    print("Initializing Database...")
    # Trigger connection if lazy
    mongo_db.get_status()
    print("Starting Mass Sync to Vector DB...")
    sync_all_to_vector_db(mongo_db)
    print("Mass Sync Completed.")
