import os
import datetime
import google.generativeai as genai
import google.ai.generativelanguage as glm
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from contextvars import ContextVar
from api.employee_agent_prompt import EMPLOYEE_AGENT_MASTER_PROMPT

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Context Variables for Secure, Stateless Tool Execution ---
current_employee_id: ContextVar[str] = ContextVar("current_employee_id")
current_mongo_db: ContextVar[Any] = ContextVar("current_mongo_db")
current_employee_name: ContextVar[str] = ContextVar("current_employee_name")

# --- Manual Tool Schema Definitions (The 'Dictionary' Fix for broad compatibility) ---

employee_tools_schema = [
    {
        "function_declarations": [
            {
                "name": "apply_leave_tool",
                "description": "Submits a formal leave request (Casual, Sick, or Privilege) to the HR system.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "leave_type": {"type": "STRING", "description": "Type of leave: 'Casual', 'Sick', or 'Privilege'."},
                        "start_date": {"type": "STRING", "description": "Start date in YYYY-MM-DD format."},
                        "end_date": {"type": "STRING", "description": "End date in YYYY-MM-DD format."},
                        "reason": {"type": "STRING", "description": "Short explanation for the leave request."}
                    },
                    "required": ["leave_type", "start_date", "end_date", "reason"]
                }
            },
            {
                "name": "request_item_tool",
                "description": "Submits a requisition for hardware (monitor, chair, laptop) or office supplies.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "item_name": {"type": "STRING", "description": "Name of the requested item (e.g., 'Ergonomic Chair', '27-inch Monitor')."},
                        "reason": {"type": "STRING", "description": "Justification for the equipment request."}
                    },
                    "required": ["item_name", "reason"]
                }
            },
            {
                "name": "get_my_status_tool",
                "description": "Instantly retrieves the current leave balances and recent request statuses for the logged-in employee.",
                "parameters": {"type": "OBJECT", "properties": {}}
            },
            {
                "name": "get_my_salary_tool",
                "description": "Retrieves the salary breakdown for a specific month. Use this when the employee asks about their pay, salary, or earnings.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "month_name": {"type": "STRING", "description": "Full name of the month (e.g., 'March')."},
                        "year": {"type": "INTEGER", "description": "Year (e.g., 2026)."}
                    },
                    "required": ["month_name", "year"]
                }
            }
        ]
    }
]

# --- Tool Request Handler Logic ---

def execute_apply_leave(leave_type: str, start_date: str, end_date: str, reason: str):
    from api.router import apply_leave # Avoid circular dependency
    from pydantic import BaseModel
    
    emp_id = current_employee_id.get()
    
    class LeaveReq(BaseModel):
        employee_id: str
        leave_type: str
        start_date: str
        end_date: str
        reason: str

    req = LeaveReq(
        employee_id=emp_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason
    )
    res = apply_leave(req)
    return str(res)

def execute_request_item(item_name: str, reason: str):
    db_wrapper = current_mongo_db.get()
    emp_id = current_employee_id.get()
    
    if db_wrapper.db is None:
        return "Internal Error: MongoDB offline."
        
    new_item = {
        "employee_id": emp_id,
        "item_name": item_name,
        "reason": reason,
        "status": "Pending",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    db_wrapper.db.items.insert_one(new_item)
    return f"Successfully requested {item_name} for {emp_id}."

def execute_get_status():
    from api.router import get_leave_balance
    db_wrapper = current_mongo_db.get()
    emp_id = current_employee_id.get()
    emp_name = current_employee_name.get()
    
    balance = get_leave_balance(emp_id)
    items = list(db_wrapper.db.items.find({"employee_id": emp_id}).sort("created_at", -1).limit(3))
    item_summary = ", ".join([f"{i['item_name']} ({i['status']})" for i in items]) if items else "No recent items."
    
    return {
        "leave_balance": balance.get("types", []),
        "recent_items": item_summary,
        "emp_name": emp_name,
        "emp_id": emp_id
    }

def execute_get_salary(month_name: str, year: int):
    from api.router import calculate_month_salary, get_company_settings
    db_wrapper = current_mongo_db.get()
    emp_id = current_employee_id.get()
    
    user_doc = db_wrapper.db.users.find_one({"employee_id": emp_id})
    if not user_doc:
        return "Employee record not found."
        
    try:
        month_num = datetime.datetime.strptime(month_name, "%B").month
        settings = get_company_settings()
        salary_info = calculate_month_salary(user_doc, year, month_num, settings)
        
        return {
            "month": month_name,
            "year": year,
            "gross_salary": salary_info["gross_salary"],
            "lop_days": salary_info["lop_days"],
            "lop_deduction": salary_info["lop_deduction"],
            "net_salary": salary_info["net_salary"],
            "currency": "INR"
        }
    except Exception as e:
        return f"Error calculating salary: {str(e)}"

TOOL_MAP = {
    "apply_leave_tool": execute_apply_leave,
    "request_item_tool": execute_request_item,
    "get_my_status_tool": execute_get_status,
    "get_my_salary_tool": execute_get_salary
}

# --- Employee Agent Class ---

class EmployeeAgent:
    def __init__(self, employee_id: str, mongo_db):
        self.employee_id = employee_id
        self.mongo_db = mongo_db
        user_doc = mongo_db.users.find_one({"employee_id": employee_id})
        self.employee_name = user_doc.get("name", "Employee") if user_doc else "Employee"
        
        # Set context variables
        current_employee_id.set(self.employee_id)
        current_mongo_db.set(self.mongo_db)
        current_employee_name.set(self.employee_name)

        # Initialize the model using dictionary-based schemas
        self.model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            tools=employee_tools_schema
        )
        self.chat = self.model.start_chat()

    async def get_response(self, query: str) -> str:
        """Processes the employee's message and returns the AI response."""
        # Ensure context is re-established for this async execution
        current_employee_id.set(self.employee_id)
        current_mongo_db.set(self.mongo_db)
        current_employee_name.set(self.employee_name)
        
        context = f"Employee {self.employee_name} ({self.employee_id}) is logged in."
        prompt = EMPLOYEE_AGENT_MASTER_PROMPT.format(
            employee_id=self.employee_id,
            employee_name=self.employee_name,
            context=context,
            query=query
        )
        
        try:
            # Initial AI message
            response = await self.chat.send_message_async(prompt)
            
            # Decisive Tool Execution Loop using 'glm' Proto Messages
            # This bypasses SDK-level validation errors by speaking the raw Proto language.
            for part in response.candidates[0].content.parts:
                if fn := part.function_call:
                    func = TOOL_MAP.get(fn.name)
                    if func:
                        # 1. Execute implementation
                        result = func(**{k: v for k, v in fn.args.items()})
                        
                        # 2. Build the exact Protobuf structure the AI requires
                        # We use 'glm' (google.ai.generativelanguage) directly here.
                        f_response = glm.FunctionResponse(
                            name=fn.name,
                            response={'result': result}
                        )
                        
                        # 3. Create a Content message with the tool result part
                        # Role MUST be 'function' for tools
                        content = glm.Content(
                            role="function",
                            parts=[glm.Part(function_response=f_response)]
                        )
                        
                        # 4. Dispatch the result back for final generation
                        response = await self.chat.send_message_async(content)
            
            return response.text
        except Exception as e:
            print(f"Employee Agent Error: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
