import argparse
import datetime
import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


def derive_company_metadata(email: str) -> tuple[str, str]:
    domain = (email or "").split("@")[-1].strip().lower()
    if not domain:
        return "", ""
    name = domain.split(".")[0].replace("-", " ").replace("_", " ").strip().title()
    return domain, name


def load_env() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()


def parse_args() -> argparse.Namespace:
    backend_dir = Path(__file__).resolve().parents[1]
    default_file = backend_dir / "scripts" / "data" / "employees_seed.json"
    parser = argparse.ArgumentParser(description="Import employees from JSON into MongoDB users collection")
    parser.add_argument("--file", default=str(default_file), help="Path to JSON file containing employee records")
    parser.add_argument(
        "--password",
        default=os.getenv("EMPLOYEE_IMPORT_PASSWORD"),
        help="Password to set for all imported users (or set EMPLOYEE_IMPORT_PASSWORD)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_env()

    mongo_uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB_NAME")
    if not mongo_uri or not db_name:
        print("Error: MONGODB_URI or MONGODB_DB_NAME is missing in environment")
        return 1

    if not args.password:
        print("Error: Missing password. Provide --password or set EMPLOYEE_IMPORT_PASSWORD")
        return 1

    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: JSON file not found: {file_path}")
        return 1

    with file_path.open("r", encoding="utf-8") as f:
        records = json.load(f)

    if not isinstance(records, list):
        print("Error: Input JSON must be an array of employee objects")
        return 1

    client = MongoClient(mongo_uri)
    db = client[db_name]
    users = db.users

    inserted = 0
    updated = 0

    for item in records:
        name = str(item.get("name", "")).strip()
        email = str(item.get("email", "")).strip().lower()
        position = str(item.get("position", "Employee")).strip() or "Employee"
        employment_type = str(item.get("employment_type", "Full-Time")).strip() or "Full-Time"
        role = str(item.get("role", "employee")).strip() or "employee"

        if not name or not email:
            print(f"Skipping invalid row: {item}")
            continue

        existing = users.find_one({"email": email}, {"employee_id": 1})
        employee_id = existing.get("employee_id") if existing else f"EMP{uuid.uuid4().hex[:6].upper()}"
        company_key, company_name = derive_company_metadata(email)
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        set_values = {
            "name": name,
            "full_name": name,
            "email": email,
            "password": args.password,
            "role": role,
            "status": "approved",
            "employment_type": employment_type,
            "position": position,
            "company_key": company_key,
            "company_name": company_name,
            "accessible_companies": [company_key] if company_key else [],
            "updated_at": timestamp,
        }

        set_on_insert = {
            "employee_id": employee_id,
            "created_at": timestamp,
            "joining_date": timestamp,
        }

        result = users.update_one(
            {"email": email},
            {
                "$set": set_values,
                "$setOnInsert": set_on_insert,
            },
            upsert=True,
        )

        if result.upserted_id is not None:
            inserted += 1
            print(f"Inserted: {email} ({employee_id})")
        else:
            updated += 1
            print(f"Updated: {email} ({employee_id})")

    print(f"Completed. Inserted: {inserted}, Updated: {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())