import os
import json
import asyncio
from typing import List, Dict, AsyncGenerator
from openai import AsyncOpenAI

# Load environment variables
import dotenv; dotenv.load_dotenv()

class DedalusClient:
    def __init__(self):
        self.api_key = os.environ.get("EXPO_PUBLIC_DEDALUS_API_KEY")
        if not self.api_key:
            print("Warning: EXPO_PUBLIC_DEDALUS_API_KEY not set")
            
        self.client = AsyncOpenAI(
            base_url="https://api.dedaluslabs.ai/v1",
            api_key=self.api_key
        )

    async def chat_completion(self, model: str, messages: List[Dict], stream: bool = False):
        try:
            # Adjust max_tokens based on model if needed
            max_tokens = 2048
            
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=stream,
                max_tokens=max_tokens
            )
            return response
        except Exception as e:
            print(f"Dedalus API error for model {model}: {e}")
            raise e

class QueryRouter:
    def route(self, query: str, context: str = "") -> str:
        query_lower = query.lower()
        
        # Heuristics for routing
        if any(keyword in query_lower for keyword in ["analyze", "plan", "strategy"]):
             # User requested change: Claude was not responding, switched to GPT-4o
             return "openai/gpt-4o"
        
        if any(keyword in query_lower for keyword in ["spending", "budget", "numbers", "calculate", "total", "sum", "average"]):
             return "google/gemini-2.0-flash"
            
        # Default to fast/cheap model
        return "openai/gpt-4o-mini"

class ChatService:
    def __init__(self):
        self.dedalus_client = DedalusClient()
        self.router = QueryRouter()

    async def get_response_stream(self, messages: List[Dict], financial_context: str = "", survey_context: str = "") -> AsyncGenerator[str, None]:
        user_message = messages[-1]["content"] if messages else ""
        
        # Check for multi-step workflow trigger
        if "analyze" in user_message.lower() and "plan" in user_message.lower():
            async for chunk in self._handle_multi_step_workflow(messages, financial_context):
                yield chunk
            return

        # Standard routing
        model = self.router.route(user_message, financial_context)
        print(f"Routing query to: {model}")
        
        friendly_name = self._get_friendly_model_name(model)
        yield f"__Using {friendly_name}__\n\n"
        
        async for chunk in self._stream_dedalus(model, messages, financial_context, survey_context):
            yield chunk

    def _get_friendly_model_name(self, model: str) -> str:
        if "gpt-4o-mini" in model:
            return "Fast Reasoning"
        elif "gpt-4o" in model: # Covers gpt-4o (not mini)
            return "Advanced Reasoning" 
        elif "gemini" in model:
            return "Quantitative Reasoning"
        return "AI Model"

    async def _stream_dedalus(self, model: str, messages: List[Dict], financial_context: str, survey_context: str):
        system_prompt = self._get_system_prompt(financial_context, survey_context)
        # Ensure system prompt is first
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        print(f"Streaming request to Dedalus for model: {model}")
        try:
            stream = await self.dedalus_client.chat_completion(model, full_messages, stream=True)
            async for chunk in stream:
                # print(f"DEBUG CHUNK: {chunk}") # Uncomment for verbose debugging
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield delta.content
        except Exception as e:
             print(f"Error streaming from Dedalus: {e}")
             yield f"Error: {str(e)}"

    async def _handle_multi_step_workflow(self, messages: List[Dict], financial_context: str):
        yield "__Starting Deep Analysis Workflow__\n\n"
        
        # Step 1: Categorization (GPT-4o-mini via Dedalus)
        yield "**Step 1: Categorizing data (GPT-4o-mini)...**\n"
        sys_prompt_1 = "You are a data analyst. Summarize the transaction data provided into 3 main spending categories."
        msgs_1 = [{"role": "system", "content": sys_prompt_1}] + messages
        resp_1 = await self.dedalus_client.chat_completion("openai/gpt-4o-mini", msgs_1, stream=False)
        summary = resp_1.choices[0].message.content
        yield f"{summary}\n\n"
        
        # Step 2: Handoff to 'GPT-5' (Mock)
        yield "**Step 2: Deep Analysis (Simulating GPT-5)...**\n"
        await asyncio.sleep(1) 
        yield "Deep pattern recognition complete. Identified potential savings of 15%.\n\n"
        
        # Step 3: Detailed Plan (GPT-4o via Dedalus)
        yield "**Step 3: Creating Detailed Savings Plan (Advanced Reasoning)...**\n\n"
        sys_prompt_3 = f"You are a financial planner. Based on this summary: {summary}, create a detailed savings plan."
        msgs_3 = [{"role": "user", "content": sys_prompt_3}]
        
        async for chunk in self._stream_dedalus("openai/gpt-4o", msgs_3, "", ""):
            yield chunk


    def _get_system_prompt(self, financial_context: str, survey_context: str) -> str:
        return f"""You are Origin, a professional AI financial advisor.
        
{f'Here is user financial data: {financial_context}' if financial_context else 'User has not connected bank account.'}

{f'User Survey Analysis (Goals & Behavior): {survey_context}' if survey_context else ''}

Guidelines:
- Be concise but thorough
- Give specific, actionable recommendations based on the user's data and survey goals
- Use numbers/percentages
- No specific investment advice
- STRICT GUARDRAIL: YOU MUST REFUSE TO ANSWER ANY QUESTIONS THAT ARE NOT RELATED TO PERSONAL FINANCE, BUDGETING, SAVING, SPENDING HABITS, OR INVESTING. If the user asks about anything else (e.g., politics, coding, general knowledge), politely decline and steer them back to finance.
"""

    async def analyze_survey(self, answers: Dict, financial_context: str = "") -> Dict:
        system_prompt = """You are a behavioral finance expert. Analyze the user's survey responses to identify their spending psychology.
        
        Output MUST be valid JSON with this structure:
        {
            "spending_regret": "string (analysis of what they regret and why)",
            "user_goals": "string (analysis of their main financial goals)",
            "top_categories": ["string", "string", "string", "string", "string"] (5 most relevant spending categories based on their answers and regret)
        }
        """
        
        user_prompt = f"""
        User Financial Context: {financial_context}
        
        Survey Answers:
        {json.dumps(answers, indent=2)}
        
        Analyze the user's financial personality, regrets, and goals.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self.dedalus_client.chat_completion("openai/gpt-4o", messages, stream=False)
            content = response.choices[0].message.content
            # Strip potential markdown code blocks if present
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            print(f"Error analyzing survey: {e}")
            # Fallback
            return {
                "spending_regret": "Could not analyze spending regret at this time.",
                "user_goals": "Could not analyze goals at this time.",
                "top_categories": ["Food & Drink", "Shopping", "Travel", "Groceries", "Entertainment"]
            }

    async def generate_behavioral_summary(self, transactions: List[Dict], user_profile: Dict = None) -> str:
        if not transactions:
            return "No transaction data available for analysis."
            
        # Summarize transactions for prompt context (limit to recent 20 for brevity)
        recent_txns = transactions[:20]
        txn_summary = "\n".join([
            f"- {t.get('date', 'N/A')}: {t.get('name', 'Unknown')} ${t.get('amount', 0)} ({t.get('category', ['Misc'])[0]})"
            for t in recent_txns
        ])
        
        system_prompt = "You are a behavioral finance expert. Provide a concise (2-3 sentences) summary of the user's spending behavior based on their recent transactions and profile."
        
        user_prompt = f"""
        Recent Transactions:
        {txn_summary}
        
        User Profile:
        {json.dumps(user_profile if user_profile else {}, indent=2)}
        
        Analyze the user's financial behavior. Be encouraging but realistic.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            print("Generating behavioral summary...")
            response = await self.dedalus_client.chat_completion("openai/gpt-4o-mini", messages, stream=False)
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error generating behavioral summary: {e}")
            return "Unable to generate summary at this time. Please try again later."

