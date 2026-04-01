from api.router import get_leave_balance
import json

def test_balance(emp_id):
    res = get_leave_balance(emp_id)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    # From debug_user we know Vennala's ID is EMPBB2319
    test_balance("EMPBB2319")
