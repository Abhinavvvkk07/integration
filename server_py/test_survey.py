import asyncio
import aiohttp
import json

async def test_survey_analysis():
    url = "http://localhost:5001/api/advisor/survey-analysis"
    
    payload = {
        "answers": {
            "1": "Under $2,000",
            "2": 30,
            "3": "Food",
            "4": "Late night",
            "5": "Very little — mostly spontaneous",
            "6": 80,
            "7": "After a stressful day",
            "8": "Paying down debt",
            "9": ["Debt payments", "Rent or housing costs"],
            "10": "Day-to-day spending",
            "11": "Balanced — progress matters, but so does flexibility"
        },
        "financialContext": "Net Worth: $5,000. Accounts: Checking $500, Savings $1000, Credit Card -$6000."
    }
    
    print(f"Testing URL: {url}")
    print("Payload:", json.dumps(payload, indent=2))
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                print(f"Status Code: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print("Response:", json.dumps(data, indent=2))
                    
                    # Basic Validation
                    required_keys = ["spending_regret", "user_goals", "top_categories"]
                    if all(k in data for k in required_keys):
                        print("\n✅ Verification SUCCESS: Response contains all required keys.")
                    else:
                        print("\n❌ Verification FAILED: Missing keys.")
                else:
                    print("Error:", await response.text())
    except Exception as e:
        print(f"Connection failed: {e}")
        print("Make sure the server is running on port 5001.")

if __name__ == "__main__":
    asyncio.run(test_survey_analysis())
