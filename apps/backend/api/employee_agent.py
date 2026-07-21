import os
import datetime
from anthropic import AsyncAnthropic
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from contextvars import ContextVar
from api.employee_agent_prompt import EMPLOYEE_AGENT_MASTER_PROMPT

# Load environment variables
load_dotenv()

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
MODEL_NAME = os.getenv("CLAUDE_MODEL", "claude-opus-4-8").strip()

# --- Context Variables for Secure, Stateless Tool Execution ---
current_employee_id: ContextVar[str] = ContextVar("current_employee_id")
current_mongo_db: ContextVar[Any] = ContextVar("current_mongo_db")
current_employee_name: ContextVar[str] = ContextVar("current_employee_name")

# --- Manual Tool Schema Definitions (The 'Dictionary' Fix for broad compatibility) ---

employee_tools_schema = [
    {
        "name": "apply_leave_tool",
        "description": "Submits a formal leave request (Casual, Sick, or Privilege) to the HR system with optional session selection for half-day leaves.",
        "input_schema": {
            "type": "object",
            "properties": {
                "leave_type": {"type": "string", "description": "Type of leave: 'Casual', 'Sick', or 'Privilege'."},
                "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format."},
                "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format."},
                "start_session": {"type": "string", "description": "Session for start date: 'Full Day', 'Session 1' (morning), or 'Session 2' (afternoon)."},
                "end_session": {"type": "string", "description": "Session for end date: 'Full Day', 'Session 1' (morning), or 'Session 2' (afternoon)."},
                "reason": {"type": "string", "description": "Short explanation for the leave request."}
            },
            "required": ["leave_type", "start_date", "end_date", "reason"]
        }
    },
    {
        "name": "withdraw_leave_tool",
        "description": "Withdraws a pending leave request that has not yet been approved or rejected.",
        "input_schema": {
            "type": "object",
            "properties": {
                "leave_id": {"type": "string", "description": "The ID of the leave request to withdraw."}
            },
            "required": ["leave_id"]
        }
    },
    {
        "name": "request_item_tool",
        "description": "Submits a requisition for hardware (monitor, chair, laptop) or office supplies.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {"type": "string", "description": "Name of the requested item (e.g., 'Ergonomic Chair', '27-inch Monitor')."},
                "reason": {"type": "string", "description": "Justification for the equipment request."}
            },
            "required": ["item_name", "reason"]
        }
    },
    {
        "name": "get_my_status_tool",
        "description": "Instantly retrieves the current leave balances and recent request statuses for the logged-in employee.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_my_salary_tool",
        "description": "Retrieves the salary breakdown for a specific month. Use this when the employee asks about their pay, salary, or earnings.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_name": {"type": "string", "description": "Full name of the month (e.g., 'March')."},
                "year": {"type": "integer", "description": "Year (e.g., 2026)."}
            },
            "required": ["month_name", "year"]
        }
    }
]

# --- Tool Request Handler Logic ---

def execute_apply_leave(leave_type: str, start_date: str, end_date: str, reason: str, start_session: str = "Full Day", end_session: str = "Full Day"):
    from api.router import apply_leave # Avoid circular dependency
    from pydantic import BaseModel
    
    emp_id = current_employee_id.get()
    
    class LeaveReq(BaseModel):
        employee_id: str
        leave_type: str
        start_date: str
        end_date: str
        start_session: str
        end_session: str
        reason: str

    req = LeaveReq(
        employee_id=emp_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        start_session=start_session,
        end_session=end_session,
        reason=reason
    )
    res = apply_leave(req)
    return str(res)

def execute_withdraw_leave(leave_id: str):
    from api.router import withdraw_leave # Avoid circular dependency
    
    emp_id = current_employee_id.get()
    res = withdraw_leave(leave_id, emp_id)
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
    "withdraw_leave_tool": execute_withdraw_leave,
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

        # Initialize Anthropic Async client
        self.client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        self.history = []

    async def get_response(self, query: str) -> str:
        """Processes the employee's message and returns the AI response."""
        # Ensure context is re-established for this async execution
        current_employee_id.set(self.employee_id)
        current_mongo_db.set(self.mongo_db)
        current_employee_name.set(self.employee_name)
        
        context = f"Employee {self.employee_name} ({self.employee_id}) is logged in."
        system_prompt = EMPLOYEE_AGENT_MASTER_PROMPT.format(
            employee_id=self.employee_id,
            employee_name=self.employee_name,
            context=context,
            query=query
        )
        
        self.history.append({"role": "user", "content": query})
        
        try:
            while True:
                response = await self.client.messages.create(
                    model=MODEL_NAME,
                    max_tokens=4000,
                    system=system_prompt,
                    messages=self.history,
                    tools=employee_tools_schema
                )
                
                # Convert response content into the API history message structure
                assistant_content = []
                tool_uses = []
                text_response = ""
                for block in response.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                        text_response += block.text
                    elif block.type == "tool_use":
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input
                        })
                        tool_uses.append(block)
                
                self.history.append({"role": "assistant", "content": assistant_content})
                
                if not tool_uses:
                    return text_response
                
                tool_results = []
                for tool_use in tool_uses:
                    func = TOOL_MAP.get(tool_use.name)
                    if func:
                        try:
                            # Execute the tool function
                            result = func(**tool_use.input)
                        except Exception as e:
                            result = f"Error executing tool: {str(e)}"
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use.id,
                            "content": str(result)
                        })
                
                self.history.append({"role": "user", "content": tool_results})
                
        except Exception as e:
            print(f"Employee Agent Error: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
