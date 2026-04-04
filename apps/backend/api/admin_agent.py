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
GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.4"))

# Initialize Clients
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"--- Admin Agent AI Initialized ---")
    print(f"Model: {MODEL_NAME} | Temp: {GEMINI_TEMPERATURE}")
else:
    print("WARNING: GEMINI_API_KEY not found in environment.")

model = genai.GenerativeModel(
    MODEL_NAME,
    generation_config={"temperature": GEMINI_TEMPERATURE}
)

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

    # Fetch Unified Leave Balance Insight (Standalone calculation to avoid circular import)
    leave_context = "Leave Balance Status: Information not yet processed."
    try:
        # Avoid import from api.router here. We can calculate simple balance context directly.
        all_leaves = list(mongo_db_client.leaves.find({"employee_id": employee_id}))
        if all_leaves:
            # Group by type and count
            types = {}
            for l in all_leaves:
                lt = l.get("leave_type", "Other")
                types[lt] = types.get(lt, 0) + 1
            
            leave_info = [f"{k}: {v} records" for k, v in types.items()]
            leave_context = f"Leave History Context: {', '.join(leave_info)}."
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
        print(f"   [SYNC] Profile Success: {employee_id}")
        return {"status": "success", "message": f"Employee {employee_id} synced to ChromaDB"}
    except Exception as e:
        print(f"Error upserting to ChromaDB: {e}")
        return {"error": f"Failed to sync to ChromaDB: {str(e)}"}

def sync_leave_request_to_vector_db(leave_record: Dict[str, Any], mongo_db_client):
    """
    Indexes an individual leave request in ChromaDB.
    This allows the AI to answer specifically 'Who is on leave' and 'When'.
    """
    if not collection:
        return {"error": "ChromaDB connection unavailable"}

    # Robust ID Handling (Fallback to MongoDB _id if custom 'id' is missing)
    leave_id = str(leave_record.get("id") or leave_record.get("_id"))
    emp_id = leave_record.get("employee_id")
    
    # Fetch human-readable name for the document
    user = mongo_db_client.users.find_one({"employee_id": emp_id}, {"name": 1})
    emp_name = user.get("name", "Unknown Employee") if user else "Unknown Employee"

    doc_text = f"""
    [LEAVE_EVENT_RECORD]
    *** STATUS: {leave_record.get("status", "Pending")} ***
    Employee: {emp_name} (ID: {emp_id})
    Leave Type: {leave_record.get("leave_type")}
    Date Range: {leave_record.get("start_date")} to {leave_record.get("end_date")}
    *** REASON: {leave_record.get("reason", "No reason provided")} ***
    Applied On: {leave_record.get("applied_on", "N/A")}
    [SEARCH_KEYWORDS]: {emp_name}, {emp_id}, {leave_record.get("leave_type")}, {leave_record.get("status")}, REASON, STATUS, RECORD
    """.strip()

    metadata = {
        "employee_id": emp_id,
        "name": emp_name,
        "type": "leave_request",
        "leave_id": leave_id,
        "status": leave_record.get("status", "Pending"),
        "start_date": leave_record.get("start_date", ""),
        "last_updated": datetime.datetime.now().isoformat()
    }

    try:
        collection.upsert(
            ids=[f"leave_{leave_id}"],
            documents=[doc_text],
            metadatas=[metadata]
        )
        print(f"   [SYNC] Leave Success: {leave_id} ({emp_name})")
        return {"status": "success", "message": f"Leave {leave_id} synced to ChromaDB"}
    except Exception as e:
        print(f"Error indexing leave {leave_id}: {e}")
        return {"error": str(e)}

def sync_all_leaves_to_vector_db(mongo_db_client):
    """Backfills all leave records into the vector DB. Returns success count."""
    if not collection: return 0
    print("--- Syncing All Leaves to ChromaDB ---")
    try:
        leaves = list(mongo_db_client.leaves.find({}))
        count = 0
        for leaf in leaves:
            try:
                res = sync_leave_request_to_vector_db(leaf, mongo_db_client)
                if "status" in res and res["status"] == "success":
                    count += 1
            except Exception as inner_e:
                print(f"Failed to sync leaf individual record: {inner_e}")
        print(f"Finished syncing {count}/{len(leaves)} leaves.")
        return count
    except Exception as outer_e:
        print(f"Critical failure during leaves sync: {outer_e}")
        return 0

def clear_vector_db():
    """Purges all documents from the vector collection. Returns status."""
    if not collection: return False
    try:
        print("--- Purging Vector Collection ---")
        # ChromaDB delete with empty filter deletes all
        collection.delete(where={}) 
        return True
    except Exception as e:
        print(f"Error purging ChromaDB: {e}")
        return False

def sync_all_to_vector_db(mongo_db_client):
    """
    Mass synchronization of all approved employees to ChromaDB.
    Returns success count.
    """
    if not collection:
        print("ChromaDB connection unavailable. Skipping sync.")
        return 0

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
    return success_count

def get_vector_inventory():
    """Returns a summary of what is currently in ChromaDB."""
    if not collection: return {"error": "ChromaDB offline"}
    try:
        results = collection.get(include=["metadatas", "documents"], limit=50)
        inventory = []
        if results and "metadatas" in results:
            for i in range(len(results["metadatas"])):
                meta = results["metadatas"][i]
                inventory.append({
                    "id": results["ids"][i],
                    "type": meta.get("type", "unknown"),
                    "name": meta.get("name", "N/A"),
                    "snippet": results["documents"][i][:100] + "..." if results["documents"] else ""
                })
        return inventory
    except Exception as e:
        return {"error": str(e)}

async def process_admin_query(query: str) -> str:
    """
    Main entry point for the Admin Agent logic.
    1. Retrieval from ChromaDB
    2. Generation with Gemini
    """
    if not collection:
        return "System configuration error: ChromaDB connection offline."

    # 1. Retrieval (Boost context depth for wide queries)
    try:
        search_depth = 50 if ("leave" in query.lower() or "all" in query.lower()) else 25
        results = collection.query(
            query_texts=[query],
            n_results=search_depth
        )
        # Flatten retrieved documents into a context block
        context_parts = []
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][i] if results['metadatas'] else {}
                doc_type = meta.get("type", "unknown")
                context_parts.append(f"Source {i+1} [{doc_type}]:\n{doc}")
        
        context = "\n---\n".join(context_parts) if context_parts else "No relevant records found in the database."
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        context = "An error occurred during information retrieval."

    # 2. Generation (Inject Today's Date and ESCAPE context to protect against curly-braces)
    today_str = datetime.datetime.now().strftime("%B %d, %Y")
    
    # Escape any existing curly braces in the context so .format() doesn't fail
    safe_context = context.replace("{", "{{").replace("}", "}}")
    
    prompt = ADMIN_AGENT_MASTER_PROMPT.format(
        today=today_str,
        query=query, 
        context=safe_context
    )
    
    try:
        print(f"--- Admin Agent processing query with model: {MODEL_NAME} ---")
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return f"I encountered an error while processing your request: {str(e)}"
