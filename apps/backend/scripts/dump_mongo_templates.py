import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from database.mongo_client import mongo_db

def dump_all_templates():
    if mongo_db.offer_letter_templates is None:
        print("offer_letter_templates collection not found.")
        return
        
    print("Dumping all MongoDB templates...")
    cursor = mongo_db.offer_letter_templates.find({})
    count = 0
    for doc in cursor:
        count += 1
        print(f"\n--- DOCUMENT {count} ---")
        for key, value in doc.items():
            if key == "html_content":
                print(f"{key}: [Length: {len(str(value))}]")
                # print first and last 200 chars
                content = str(value)
                if len(content) > 400:
                    print(f"Content Preview: {content[:200]} ... {content[-200:]}")
                else:
                    print(f"Content: {content}")
            else:
                print(f"{key}: {value}")
    
    if count == 0:
        print("No documents found in the collection.")

if __name__ == "__main__":
    dump_all_templates()
