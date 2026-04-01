from api.router import mongo_db
import json

def check_all_leaves(emp_id):
    leaves = list(mongo_db.leaves.find({"employee_id": emp_id}))
    print(f"Total Leaves for {emp_id}: {len(leaves)}")
    for l in leaves:
        print(f"ID: {l.get('_id')}")
        print(f"Type: {l.get('leave_type')}")
        print(f"Status: {l.get('status')}")
        print(f"Range: {l.get('start_date')} to {l.get('end_date')}")
        print("-" * 20)

if __name__ == "__main__":
    check_all_leaves("EMPBB2319")
