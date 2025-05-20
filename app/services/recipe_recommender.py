from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from typing import List, Dict, Literal
import os
from dotenv import load_dotenv
# from .receipt_processor import ReceiptItem # This seems unused here
import json

load_dotenv()

UserIntent = Literal["RECIPE_REQUEST", "GENERAL_FOOD_QUESTION", "GENERAL_CHAT", "UNKNOWN_INTENT"]

class RecipeRecommender:
    def __init__(self):
        # Main LLM for recipe generation and more creative/detailed responses
        self.llm_creative = ChatOpenAI(
            model="o4-mini-2025-04-16",
            temperature=1,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        # LLM for classification and more direct/factual chat
        self.llm_direct = ChatOpenAI(
            model="gpt-4.1-nano-2025-04-14", 
            temperature=0.3, 
            api_key=os.getenv("OPENAI_API_KEY")
        )

    async def _get_user_intent(self, user_prompt: str) -> UserIntent:
        if not user_prompt or user_prompt.strip() == "":
            return "GENERAL_CHAT" # Treat empty prompt as general chat / greeting

        # Create the prompt template with user_prompt as an input variable for clarity
        intent_prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are an intent classifier for a kitchen assistant chatbot.
            Analyze the user's message and classify it into one of the following categories:
            - RECIPE_REQUEST: If the user is asking for recipes, meal ideas, what to cook with ingredients, or how to prepare something.
            - GENERAL_FOOD_QUESTION: If the user is asking about cooking techniques, ingredient properties, substitutions, food storage, food safety, or other general food-related advice that isn\'t a direct recipe request.
            - GENERAL_CHAT: If the user is making a simple greeting, engaging in small talk, or asking a question clearly unrelated to food, cooking, or recipes.

            Respond with ONLY one of the following category strings: RECIPE_REQUEST, GENERAL_FOOD_QUESTION, or GENERAL_CHAT.
            Do not add any other text or explanation.
            Example User: Hi there!
            Example Assistant: GENERAL_CHAT
            Example User: What can I make with chicken and rice?
            Example Assistant: RECIPE_REQUEST
            Example User: How do I store avocados?
            Example Assistant: GENERAL_FOOD_QUESTION
            """),
            ("user", "{user_input}") # Use a named input variable
        ])
        
        try:
            # Format the prompt with the actual user input
            formatted_prompt = intent_prompt_template.format_prompt(user_input=user_prompt)
            # Convert to a list of messages for ainvoke
            messages = formatted_prompt.to_messages()
            response = await self.llm_direct.ainvoke(messages)
            content = response.content.strip()
            
            if content in ["RECIPE_REQUEST", "GENERAL_FOOD_QUESTION", "GENERAL_CHAT"]:
                return content
            print(f"Unexpected intent classification: {content} for prompt: {user_prompt}") # Log unexpected output
            return "UNKNOWN_INTENT"
        except Exception as e:
            print(f"Error in _get_user_intent: {e}")
            return "UNKNOWN_INTENT"

    async def _handle_general_response(self, user_prompt: str, intent: UserIntent) -> Dict:
        system_message_content = "You are a friendly and helpful kitchen assistant. Respond conversationally to the user."
        if intent == "GENERAL_CHAT":
            system_message_content = "You are a friendly and helpful kitchen assistant. The user might be making small talk or asking a general question. Respond conversationally. If the question is very off-topic from kitchen/food, you can gently guide back or answer briefly."
        elif intent == "GENERAL_FOOD_QUESTION":
            system_message_content = "You are a knowledgeable and helpful kitchen assistant. The user has a general question about food or cooking. Provide a clear, concise, and informative answer."

        chat_prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_message_content),
            ("user", "{user_input}")
        ])
        try:
            formatted_prompt = chat_prompt_template.format_prompt(user_input=user_prompt)
            messages = formatted_prompt.to_messages()
            response = await self.llm_direct.ainvoke(messages)
            return {"chat_response": response.content.strip()}
        except Exception as e:
            print(f"Error in _handle_general_response: {e}")
            return {"chat_response": "I had a little trouble thinking about that. Could you try asking differently?", "error": True}

    async def get_recipe_recommendations(self, available_ingredients: List[Dict], user_prompt: str = None) -> Dict:
        # Ensure user_prompt is not None for intent detection, provide a default if it is.
        current_user_prompt = user_prompt if user_prompt and user_prompt.strip() else "Hello"
        user_intent = await self._get_user_intent(current_user_prompt)

        if user_intent == "GENERAL_CHAT" or user_intent == "GENERAL_FOOD_QUESTION":
            return await self._handle_general_response(current_user_prompt, user_intent)
        
        if user_intent == "UNKNOWN_INTENT":
            print(f"Unknown intent for prompt: '{current_user_prompt}'. Proceeding with recipe search as fallback.")

        ingredients_text = "\n".join([
            f"- {ing['name']}: {ing['quantity']} {ing['unit']}"
            for ing in available_ingredients
        ])
        
        # For recipe requests, construct the detailed prompt
        # Use current_user_prompt which is guaranteed to be non-empty here for user's actual request
        base_prompt_text = f"""
        Available ingredients in pantry:
        {ingredients_text}
        
        User's request: "{current_user_prompt}"

        Consider these guidelines when suggesting recipes:
        1. Prioritize recipes that best match the user's request and utilize the available ingredients.
        2. If the user's request is vague, suggest diverse and practical recipes.
        3. Include common pantry staples (like salt, pepper, oil, basic spices) in the recipe's ingredient list if they are typically assumed and not explicitly in the pantry list. Do not list them if the recipe doesn't need them.
        4. Only list the quantities of provided pantry ingredients that are actually needed for the recipe if a specific quantity is mentioned in the pantry.
        5. If a specific recipe is requested but ingredients are insufficient, politely explain what's missing or suggest alternatives.
        6. Provide clear, step-by-step instructions.
        """

        recipe_system_prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful and friendly cooking and kitchen assistant.
            
            If the user's request, combined with any provided ingredients, seems to be asking for specific RECIPES, 
            then you MUST respond with a JSON object adhering to this exact structure:
            {{
                "recipes": [
                    {{
                        "name": "Recipe Name",
                        "description": "Brief description",
                        "ingredients": [
                            {{"name": "ingredient name", "quantity": 1.0, "unit": "unit"}}
                        ],
                        "instructions": ["step 1", "step 2", "..."],
                        "cooking_time": "30 minutes (e.g., '20-25 minutes', 'About 1 hour')",
                        "difficulty": "Easy/Medium/Hard",
                        "confidence_score": 0.9 (a float between 0.0 and 1.0 indicating match with available ingredients and request)
                    }}
                ]
            }}
            Ensure the ingredients list in the JSON only contains items needed for the recipe. The confidence_score should reflect how well the recipe aligns with the user's available ingredients and specific request.
            
            If the user's request is food-related but not a clear recipe request (e.g., asking for variations of a dish, advice on a partially described recipe, or a follow-up question about a previously suggested recipe that doesn't require a new full recipe JSON),
            then you MAY respond conversationally in plain text. DO NOT use the JSON format for these specific conversational follow-ups or advice if a full new recipe JSON is not appropriate.
            Be friendly and informative in your conversational replies.
            """),
            ("user", "{user_recipe_request_and_ingredients}") # Using a named variable for the combined context
        ])

        try:
            formatted_recipe_prompt = recipe_system_prompt_template.format_prompt(user_recipe_request_and_ingredients=base_prompt_text)
            recipe_messages = formatted_recipe_prompt.to_messages()
            response = await self.llm_creative.ainvoke(recipe_messages)
            content = response.content.strip()
            
            if content.startswith("```json"):
                content = content[len("```json"):].strip()
                if content.endswith("```"):
                    content = content[:-len("```")]
            elif content.startswith("```") and content.endswith("```"):
                content = content[len("```"):-(len("```"))].strip()

            try:
                parsed_json = json.loads(content)
                if isinstance(parsed_json, dict) and "recipes" in parsed_json and isinstance(parsed_json["recipes"], list):
                    return parsed_json 
                else:
                    # If JSON is valid but not recipe structure, or AI gave conversational response to recipe request
                    return {"chat_response": content} 
            except json.JSONDecodeError:
                # If JSON parsing fails, it's a plain text conversational response to a recipe request
                return {"chat_response": content}

        except Exception as e:
            print(f"Error in recipe recommendation stage: {e}") 
            error_message = "I encountered an issue trying to find recipes or answer your food question. Please try again."
            if 'response' in locals() and hasattr(response, 'content') and response.content:
                 error_message = f"An error occurred with recipes. Raw AI response: {response.content}"
            return {"chat_response": error_message, "error": True}

    async def confirm_recipe_usage(self, recipe: Dict, available_ingredients: List[Dict]) -> Dict:
        available_text = "\n".join([
            f"- {ing['name']}: {ing['quantity']} {ing['unit']}"
            for ing in available_ingredients
        ])
        recipe_text = f"""
        Recipe: {recipe['name']}
        Ingredients needed:
        {chr(10).join([f'- {ing["name"]}: {ing["quantity"]} {ing["unit"]}' for ing in recipe['ingredients']])}
        """

        usage_prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful cooking assistant that helps track ingredient usage.
            Calculate the remaining quantities of ingredients after using this recipe.
            Consider:
            1. Subtract used quantities from available quantities
            2. Handle unit conversions if necessary (though the input units should generally be consistent)
            3. Return 0 for ingredients that are completely used
            4. Keep track of ingredients that weren't used in the recipe (these should be returned with their original quantities)
            5. If there is an extra ingredient in the recipe that is not from available ingredients, ignore it for calculation purposes.
            
            IMPORTANT: Return ONLY a JSON object with this exact structure, no explanations or additional text:
            {{
                "remaining_ingredients": [
                    {{
                        "name": "ingredient name",
                        "quantity": 1.0, // or remaining quantity
                        "unit": "unit",
                        "category": "category name" // ensure to pass through category from available_ingredients
                    }}
                ]
            }}
            Include ALL ingredients from the original 'available_ingredients' list in the 'remaining_ingredients' output, \
            updating quantities for those used, and keeping original quantities for those not used.
            """),
            ("user", """Available ingredients (with categories):
{available_text_input}

Recipe to prepare:
{recipe_text_input}

Calculate remaining ingredients after preparing this recipe.
Return ONLY the JSON object with ALL original ingredients, updated quantities for used ones.
Preserve the category for each ingredient as provided in the available list.""")
        ])

        try:
            formatted_usage_prompt = usage_prompt_template.format_prompt(
                available_text_input=available_text,
                recipe_text_input=recipe_text
            )
            usage_messages = formatted_usage_prompt.to_messages()
            response = await self.llm_direct.ainvoke(usage_messages)
            content = response.content.strip()
            
            if content.startswith("```json"):
                content = content[len("```json"):].strip()
                if content.endswith("```"):
                    content = content[:-len("```")]
            elif content.startswith("```") and content.endswith("```"):
                content = content[len("```"):-(len("```"))].strip()
            
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response in confirm_recipe_usage: {e}")
            print(f"Raw response from confirm_recipe_usage: {response.content}")
            return {"remaining_ingredients": [], "error": "Failed to parse ingredient update response."}
        except Exception as e:
            print(f"Error calculating remaining ingredients: {e}")
            return {"remaining_ingredients": [], "error": "Failed to calculate remaining ingredients."} 
