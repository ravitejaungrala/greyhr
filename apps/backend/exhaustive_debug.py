import datetime
from api.router import mongo_db

def exhaustive_debug(employee_id):
    user = mongo_db.users.find_one({"employee_id": employee_id})
    if not user:
        print("User not found.")
        return

    joining_date_str = user.get("joining_date")
    joining_date = datetime.datetime.fromisoformat(joining_date_str.replace('Z', '+00:00'))
    # Make joining_date naive to match utcnow if that's what we use
    j_date_naive = joining_date.replace(tzinfo=None)
    now = datetime.datetime.utcnow()
    
    months_passed = (now.year - j_date_naive.year) * 12 + (now.month - j_date_naive.month) + 1
    cl_rate = user.get("casual_leave_rate", 1.0)
    accrued_cl = months_passed * cl_rate
    
    print(f"Months Passed: {months_passed}")
    print(f"Accrued Casual Leaves: {accrued_cl}")
    
    used_cl = 0
    approved_leaves = list(mongo_db.leaves.find({
        "employee_id": employee_id,
        "status": {"$regex": "Approved", "$options": "i"}
    }))
    
    print(f"Approved Leaves Count: {len(approved_leaves)}")
    for leaf in approved_leaves:
        start = datetime.datetime.fromisoformat(leaf["start_date"].replace('Z', '+00:00')).replace(tzinfo=None)
        end = datetime.datetime.fromisoformat(leaf["end_date"].replace('Z', '+00:00')).replace(tzinfo=None)
        days = (end - start).days + 1
        l_type = leaf.get("leave_type", "")
        print(f"Processing Leaf: {l_type}, Range: {start} to {end}, Days: {days}")
        
        if "Casual" in l_type:
            used_cl += days
            print(f"  --> Casual Leave detected. Total used_cl now: {used_cl}")

    rem_cl = max(0, accrued_cl - used_cl)
    print(f"\nFinal Result: {rem_cl} Days remaining.")

if __name__ == "__main__":
    exhaustive_debug("EMPBB2319")
