import os
import json
import datetime
import chromadb
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from api.admin_agent_prompt import ADMIN_AGENT_MASTER_PROMPT

# Load environment variables
load_dotenv()

# Configuration
CHROMA_CLOUD_API_KEY = os.getenv("CHROMA_CLOUD_API_KEY", "").strip()
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "").strip()
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "").strip()
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "hrms").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

# Initialize Clients
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"--- Admin Agent AI Initialized ---")
    print(f"Model: {MODEL_NAME}")
    print(f"Key (masked): ...{GEMINI_API_KEY[-4:] if len(GEMINI_API_KEY) > 4 else 'INVALID'}")
else:
    print("WARNING: GEMINI_API_KEY not found in environment.")

model = genai.GenerativeModel(MODEL_NAME)

# ChromaDB Cloud Client
try:
    chroma_client = chromadb.CloudClient(
        api_key=CHROMA_CLOUD_API_KEY,
        tenant=CHROMA_TENANT,
        database=CHROMA_DATABASE
    )
    collection = chroma_client.get_or_create_collection(name=CHROMA_COLLECTION)
except Exception as e:
    print(f"Error initializing ChromaDB Cloud: {e}")
    chroma_client = None
    collection = None

def get_employee_document(employee_data: Dict[str, Any], extra_context: str = "") -> str:
    """
    Creates a detailed text document summarizing an employee's data for vector indexing.
    Includes personal, bank, financial info, and extra context like leave balances.
    """
    emp_id = employee_data.get("employee_id", "N/A")
    name = employee_data.get("name", "N/A")
    email = employee_data.get("email", "N/A")
    status = employee_data.get("status", "N/A")
    role = employee_data.get("role", "N/A")
    designation = employee_data.get("position", "N/A")
    joining_date = employee_data.get("joining_date", "N/A")
    monthly_salary = employee_data.get("monthly_salary", 0)
    in_hand_salary = employee_data.get("in_hand_salary", 0)
    
    bank = employee_data.get("bank_details", {})
    bank_name = bank.get("bank_name", "N/A")
    acc_num = bank.get("account_number", "N/A")
    ifsc = bank.get("ifsc", "N/A")

    # Education & Exp
    edu = employee_data.get("education", {}).get("degree", "N/A")
    exp_years = employee_data.get("experience", {}).get("years", "0") if employee_data.get("is_experienced") else "0"
    prev_company = employee_data.get("experience", {}).get("prev_company", "N/A") if employee_data.get("is_experienced") else "N/A"
    prev_role = employee_data.get("experience", {}).get("prev_role", "N/A") if employee_data.get("is_experienced") else "N/A"

    doc = f"""
    Employee ID: {emp_id}
    Name: {name}
    Email: {email}
    Role: {role}
    Designation: {designation}
    Status: {status}
    Joining Date: {joining_date}
    
    Financial Details:
    Monthly Salary: {monthly_salary}
    In-hand Salary: {in_hand_salary}
    Bank Name: {bank_name}
    Account Number (Obfuscated): ***{str(acc_num)[-4:] if acc_num else 'N/A'}
    IFSC: {ifsc}
    
    Qualifications & History:
    Degree: {edu}
    Experience Years: {exp_years}
    Previous Company: {prev_company}
    Previous Role: {prev_role}
    
    {extra_context}
    """.strip()
    
    return doc

def sync_employee_to_vector_db(employee_id: str, mongo_db_client):
    """
    Fetches an employee from MongoDB, generates a textual representation,
    and indexes it in ChromaDB Cloud.
    """
    if not collection:
        return {"error": "ChromaDB connection unavailable"}

    user_doc = mongo_db_client.users.find_one({"employee_id": employee_id})
    if not user_doc:
        return {"error": "Employee not found in MongoDB"}

    # Fetch Unified Leave Balance Insight
    leave_context = "Leave Balance Status: Information not yet processed."
    try:
        # Move import inside function to avoid circular dependency with router.py
        from api.router import get_leave_balance
        
        # Use the same logic as the main dashboard for parity
        balance = get_leave_balance(employee_id)
        if "types" in balance:
            leave_info = []
            for t in balance["types"]:
                leave_info.append(f"{t['name']}: {t['remaining']} Days Remaining")
            
            leave_context = f"Leave Balance Insight (Real-time): {', '.join(leave_info)}."
        elif "error" in balance:
            leave_context = f"Leave Balance Insight: [Error] {balance['error']}"
    except Exception as e:
        print(f"Error calculating leave context for sync: {e}")

    # Generate document and metadata
    doc_text = get_employee_document(user_doc, extra_context=leave_context)
    metadata = {
        "employee_id": employee_id,
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "type": "employee_profile",
        "last_updated": datetime.datetime.now().isoformat()
    }

    try:
        collection.upsert(
            ids=[employee_id],
            documents=[doc_text],
            metadatas=[metadata]
        )
        return {"status": "success", "message": f"Employee {employee_id} synced to ChromaDB"}
    except Exception as e:
        print(f"Error upserting to ChromaDB: {e}")
        return {"error": f"Failed to sync to ChromaDB: {str(e)}"}

def sync_all_to_vector_db(mongo_db_client):
    """
    Mass synchronization of all approved employees to ChromaDB.
    Can be run at startup to ensure the vector DB is current.
    """
    if not collection:
        print("ChromaDB connection unavailable. Skipping sync.")
        return

    print("--- Starting ChromaDB Synchronization ---")
    employees = list(mongo_db_client.users.find({"status": "approved"}))
    total = len(employees)
    print(f"Syncing {total} employees...")

    success_count = 0
    for emp in employees:
        emp_id = emp.get("employee_id")
        res = sync_employee_to_vector_db(emp_id, mongo_db_client)
        if "status" in res and res["status"] == "success":
            success_count += 1
    
    print(f"Synchronization complete: {success_count}/{total} succeeded.")
    print("-----------------------------------------")

async def process_admin_query(query: str) -> str:
    """
    Main entry point for the Admin Agent logic.
    1. Retrieval from ChromaDB
    2. Generation with Gemini
    """
    if not collection:
        return "System configuration error: ChromaDB connection offline."

    # 1. Retrieval
    try:
        results = collection.query(
            query_texts=[query],
            n_results=5
        )
        # Flatten retrieved documents into a context block
        context_parts = []
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                context_parts.append(f"Result {i+1}:\n{doc}")
        
        context = "\n---\n".join(context_parts) if context_parts else "No relevant records found in the database."
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        context = "An error occurred during information retrieval."

    # 2. Generation
    prompt = ADMIN_AGENT_MASTER_PROMPT.format(query=query, context=context)
    
    try:
        print(f"--- Admin Agent processing query with model: {MODEL_NAME} ---")
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return f"I encountered an error while processing your request: {str(e)}"
