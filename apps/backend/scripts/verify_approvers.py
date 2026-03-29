import requests
import os
from dotenv import load_dotenv

load_dotenv("c:/Raviteja/NeuZen AI/grey-hr/apps/backend/.env")
api_url = "http://localhost:8000/api"

try:
    res = requests.get(f"{api_url}/employee/approvers")
    if res.status_code == 200:
        data = res.json()
        approvers = data.get("approvers", [])
        print("Approvers found:")
        for app in approvers:
            print(f"- {app['name']} ({app['role']})")
    else:
        print(f"Error: {res.status_code}")
except Exception as e:
    print(f"Connection error: {e}")
