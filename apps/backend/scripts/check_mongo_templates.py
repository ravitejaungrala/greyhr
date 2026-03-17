import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from database.mongo_client import mongo_db

def check_mongo_templates():
    if mongo_db.offer_letter_templates is None:
        print("offer_letter_templates collection not found.")
        return
        
    print("Checking MongoDB templates...")
    templates = list(mongo_db.offer_letter_templates.find({}))
    for t in templates:
        print(f"Type: {t.get('employment_type')}")
        print(f"Placeholders: {t.get('placeholders')}")
        content = t.get('html_content', '')
        print(f"Content Length: {len(content)}")
        print("--- CONTENT PREVIEW ---")
        print(content[:500])
        print("-----------------------")

if __name__ == "__main__":
    check_mongo_templates()
