import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


def main() -> int:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    mongo_uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB_NAME")
    if not mongo_uri or not db_name:
        print("Error: Missing MongoDB environment variables")
        return 1

    client = MongoClient(mongo_uri)
    db = client[db_name]
    users = db.users

    emails = [
        "salman.s@neuzenai.com",
        "raviteja.y@neuzenai.com",
        "sheetal@z-ninth.com",
    ]

    docs = list(
        users.find(
            {"email": {"$in": emails}},
            {
                "_id": 0,
                "employee_id": 1,
                "name": 1,
                "email": 1,
                "employment_type": 1,
                "position": 1,
                "role": 1,
                "status": 1,
            },
        )
    )

    print(f"FOUND {len(docs)}")
    for doc in sorted(docs, key=lambda item: item.get("email", "")):
        print(doc)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())