import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so we can import api and database modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.mongo_client import mongo_db
from api.admin_agent import sync_employee_to_vector_db

def main():
    print("Starting mass synchronization of employees to ChromaDB Cloud...")
    
    # 1. Fetch all approved employees from MongoDB
    if mongo_db.users is None:
        print("Error: Could not connect to MongoDB.")
        return

    employees = list(mongo_db.users.find({"status": "approved"}))
    total = len(employees)
    print(f"Found {total} approved employees to index.")

    # 2. Sync each employee
    success_count = 0
    fail_count = 0

    for emp in employees:
        emp_id = emp.get("employee_id")
        emp_name = emp.get("name", "Unknown")
        
        print(f"[{success_count + fail_count + 1}/{total}] Syncing {emp_name} ({emp_id})...", end=" ")
        
        result = sync_employee_to_vector_db(emp_id, mongo_db)
        
        if "status" in result and result["status"] == "success":
            print("DONE.")
            success_count += 1
        else:
            print(f"FAILED: {result.get('error', 'Unknown error')}")
            fail_count += 1

    print("\n--- Sync Summary ---")
    print(f"Total Processed: {total}")
    print(f"Successfully Synced: {success_count}")
    print(f"Failed: {fail_count}")
    print("--------------------")

if __name__ == "__main__":
    main()
