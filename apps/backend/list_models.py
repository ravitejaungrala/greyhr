import os
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

with open("models_output.txt", "w") as f:
    try:
        f.write("Available Models:\n")
        models = client.models.list()
        for m in models.data:
            f.write(f"- {m.id}\n")
    except Exception as e:
        f.write(f"Error listing models: {e}\n")
print("Done")
