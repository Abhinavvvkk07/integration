import asyncio
import os
import sys

# Add the server_py directory to the python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from server_py.chat import ChatService

async def verify_chat():
    print("Initializing ChatService...")
    chat_service = ChatService()
    
    # Mock data
    transactions = [
        {"date": "2023-10-27", "name": "Starbucks", "amount": 5.50, "category": ["Food & Drink"]},
        {"date": "2023-10-26", "name": "Uber", "amount": 25.00, "category": ["Travel"]},
        {"date": "2023-10-25", "name": "Target", "amount": 100.00, "category": ["Shopping"]}
    ]
    
    user_profile = {
        "user_goals": "Save for a house",
        "spending_regret": "Eating out too much"
    }
    
    print("\nTesting generate_behavioral_summary...")
    try:
        summary = await chat_service.generate_behavioral_summary(transactions, user_profile)
        print("\n--- Summary Output ---")
        print(summary)
        print("----------------------")
        print("\nSUCCESS: Method exists and returned a result.")
    except Exception as e:
        print(f"\nFAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_chat())
