import asyncio
import aiohttp
import json

async def test_chat_context():
    url = "http://localhost:5001/api/advisor/chat"
    
    # Test 1: Context Awareness
    payload_context = {
        "messages": [{"role": "user", "content": "What are my main financial goals right now?"}],
        "financialContext": "Bank Account: Connected.",
        "surveyContext": "Financial Goals: Paying down debt. Spending Regret: Fast Food."
    }
    
    print("\n--- Test 1: Context Awareness ---")
    await run_test(url, payload_context)

    # Test 2: Guardrails
    payload_guardrail = {
        "messages": [{"role": "user", "content": "Write me a poem about a flying toaster."}],
        "financialContext": "Bank Account: Connected.",
        "surveyContext": ""
    }
    
    print("\n--- Test 2: Guardrails ---")
    await run_test(url, payload_guardrail)

async def run_test(url, payload):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    async for line in response.content:
                        decoded = line.decode('utf-8').strip()
                        if decoded.startswith("data: ") and decoded != "data: [DONE]":
                            data_str = decoded[6:]
                            try:
                                data = json.loads(data_str)
                                content = data['choices'][0]['delta'].get('content', '')
                                print(content, end="", flush=True)
                            except:
                                pass
                    print("\n")
                else:
                    print("Error:", await response.text())
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat_context())
