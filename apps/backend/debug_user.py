from api.router import mongo_db
import json

def check_user(email):
    user = mongo_db.users.find_one({"email": email})
    if not user:
        print(f"User {email} not found.")
        return
    # Convert ObjectId and other non-serializable fields
    user["_id"] = str(user["_id"])
    print(json.dumps(user, indent=2))

if __name__ == "__main__":
    check_user("vennala@dhanadurga.com")
