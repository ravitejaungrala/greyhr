import os
import sys
import asyncio
from dotenv import load_dotenv

# Add parent directory to path so we can import api and database modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.mongo_client import mongo_db
from api.admin_agent import sync_employee_to_vector_db, process_admin_query

async def test_admin_agent():
    print("--- Admin Agent Verification Script ---")
    
    # 1. Test Sync Trigger
    print("\n1. Testing Data Sync Trigger...")
    test_emp_id = "EMPB9F564" # A known employee from router.py example
    
    # Check if employee exists in Mongo
    user_doc = mongo_db.users.find_one({"employee_id": test_emp_id})
    if not user_doc:
        print(f"Skipping sync test: Employee {test_emp_id} not found in MongoDB.")
    else:
        print(f"Syncing employee {user_doc.get('name')} ({test_emp_id})...")
        sync_result = sync_employee_to_vector_db(test_emp_id, mongo_db)
        print(f"Sync Result: {sync_result}")

    # 2. Test Admin Query
    print("\n2. Testing Admin Query via Agent...")
    test_query = "Summarize the details for employee EMPB9F564 and show their salary breakdown."
    print(f"Query: '{test_query}'")
    
    try:
        response = await process_admin_query(test_query)
        print("\nAgent Response:")
        print("-" * 20)
        print(response)
        print("-" * 20)
    except Exception as e:
        print(f"Agent Query Failed: {e}")

    print("\n--- Verification Finished ---")

if __name__ == "__main__":
    asyncio.run(test_admin_agent())
