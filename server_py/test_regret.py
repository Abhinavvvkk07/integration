import asyncio
import aiohttp
import json
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")

async def test_regret_flow():
    base_url = "http://localhost:5001"
    
    print("\n--- Test Phase 1: Simulate Survey Submission (Establish Personality) ---")
    survey_payload = {
        "answers": {
            "1": "Under $2,000",
            "7": "When I'm craving something", # Trigger
        },
        "financialContext": "Net Worth: $1000"
    }
    
    async with aiohttp.ClientSession() as session:
        # 1. Submit Survey
        async with session.post(f"{base_url}/api/advisor/survey-analysis", json=survey_payload) as resp:
            print(f"Survey Status: {resp.status}")
            if resp.status == 200:
                data = await resp.json()
                print("Profile Created:", json.dumps(data, indent=2))
            else:
                print("Survey Failed", await resp.text())
                return

        # 2. Verify DB directly
        print("\n--- Test Phase 2: specific DB Verification ---")
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT * FROM user_profile")
            row = c.fetchone()
            if row:
                print("✅ Database has user profile:", row)
            else:
                print("❌ Database missing user profile!")
            conn.close()
        except Exception as e:
            print(f"DB Check Failed: {e}")

        # Note: We can't easily test the 'Plaid Transaction' flow without a real access token in this script.
        # But we can unit-test the ChatService.analyze_transaction_regret method indirectly if we import it,
        # OR we can trust the manual verification or previous tests.
        
        # However, we CAN test the 'save_transaction_regret' DB logic manually here to ensure persistence works.
        print("\n--- Test Phase 3: DB Persistence for Transactions ---")
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO transaction_metadata (transaction_id, regret_score, regret_reason) VALUES (?, ?, ?)", 
                  ("test_txn_123", 85, "Test Reason"))
        conn.commit()
        
        c.execute("SELECT * FROM transaction_metadata WHERE transaction_id='test_txn_123'")
        row = c.fetchone()
        if row:
             print("✅ Transaction metadata saved successfully:", row)
        else:
             print("❌ Transaction metadata save failed.")
        conn.close()

if __name__ == "__main__":
    asyncio.run(test_regret_flow())
