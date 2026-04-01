import asyncio
from api.admin_agent import process_admin_query

async def test():
    query = "Give me a full overview of employee vennala"
    print(f"Testing Query: {query}")
    response = await process_admin_query(query)
    print("\n--- AI Agent Response ---")
    print(response)
    print("------------------------")

if __name__ == "__main__":
    asyncio.run(test())
