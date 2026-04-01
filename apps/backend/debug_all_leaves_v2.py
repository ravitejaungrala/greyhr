from api.router import mongo_db
import json

def check_all_leaves(emp_id):
    leaves = list(mongo_db.leaves.find({"employee_id": emp_id}))
    print(f"Total Leaves found in DB: {len(leaves)}")
    for l in leaves:
        l["_id"] = str(l["_id"])
        print(json.dumps(l, indent=2))

if __name__ == "__main__":
    check_all_leaves("EMPBB2319")
