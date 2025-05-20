from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from typing import List, Dict
import os
from dotenv import load_dotenv
from .receipt_processor import ReceiptItem
import json

load_dotenv()

class RecipeRecommender:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="o4-mini-2025-04-16",
            temperature=1,
            api_key=os.getenv("OPENAI_API_KEY")
        )

    async def get_recipe_recommendations(self, available_ingredients: List[Dict], user_prompt: str = None) -> Dict:
        """Get recipe recommendations based on available ingredients and optional user prompt."""
        # Format ingredients for the prompt
        ingredients_text = "\n".join([
            f"- {ing['name']}: {ing['quantity']} {ing['unit']}"
            for ing in available_ingredients
        ])
        # Base prompt for ingredients
        base_prompt = f"""
        Based on these available ingredients, suggest a recipes:
        
        {ingredients_text}
        
        Consider:
        1. Suggest recipes that are practical and delicious
        2. Do not try to use all ingredients from the pantry unless required by the recipe
        3. Include basic pantry staples (salt, pepper, oil) in the ingredients list
        4. For the ingredients specified above only use the right quantities
        5. If you cannot find a recipe that the user is asking for suggest an alternative with the ingredients that are available
        6. Provide clear, step-by-step instructions
        """

        # Add user prompt if provided
        if user_prompt:
            base_prompt += f"\n\nAdditional requirements: {user_prompt}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful cooking assistant that suggests recipes based on available ingredients.
            For each recipe, provide:
            1. A descriptive name
            2. A brief description
            3. List of required ingredients with quantities
            4. Step-by-step instructions
            5. Estimated cooking time
            6. Difficulty level
            7. A confidence score (0-1) indicating how well the recipe matches available ingredients
            
            Format your response as a JSON object with this structure:
            {{
                "recipes": [
                    {{
                        "name": "Recipe Name",
                        "description": "Brief description",
                        "ingredients": [
                            {{
                                "name": "ingredient name",
                                "quantity": 1.0,
                                "unit": "unit"
                            }}
                        ],
                        "instructions": ["step 1", "step 2", "..."],
                        "cooking_time": "30 minutes",
                        "difficulty": "easy/medium/hard",
                        "confidence_score": 0.9
                    }}
                ]
            }}"""),
            ("user", base_prompt)
        ])

        try:
            response = await self.llm.ainvoke(prompt.format())
            content = response.content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith("```") and "```" in content:
                # Extract content between markdown code blocks
                content = content.split("```", 2)[1]
                # If it starts with a language identifier like "json", remove it
                if "\n" in content:
                    content = content.split("\n", 1)[1]
                # Remove trailing code block if present
                if "```" in content:
                    content = content.split("```")[0]
            
            # Parse the response content as JSON
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            print(f"Raw response: {response.content}")
            return {"recipes": []}
        except Exception as e:
            print(f"Error getting recipe recommendations: {e}")
            return {"recipes": []}

    async def confirm_recipe_usage(self, recipe: Dict, available_ingredients: List[Dict]) -> Dict:
        """Confirm recipe usage and calculate remaining ingredients."""
        # Format ingredients for the prompt
        available_text = "\n".join([
            f"- {ing['name']}: {ing['quantity']} {ing['unit']}"
            for ing in available_ingredients
        ])

        recipe_text = f"""
        Recipe: {recipe['name']}
        Ingredients needed:
        {chr(10).join([f'- {ing["name"]}: {ing["quantity"]} {ing["unit"]}' for ing in recipe['ingredients']])}
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful cooking assistant that helps track ingredient usage.
            Calculate the remaining quantities of ingredients after using this recipe.
            Consider:
            1. Subtract used quantities from available quantities
            2. Handle unit conversions if necessary
            3. Return 0 for ingredients that are completely used
            4. Keep track of ingredients that weren't used in the recipe
            5. If there is an extra ingredient not from avialable ingredients ignore it
            
            IMPORTANT: Return ONLY a JSON object with this exact structure, no explanations or additional text:
            {{
                "remaining_ingredients": [
                    {{
                        "name": "ingredient name",
                        "quantity": 1.0,
                        "unit": "unit",
                        "category": "category name"
                    }}
                ]
            }}"""),
            ("user", f"""
            Available ingredients:
            {available_text}
            
            Recipe to prepare:
            {recipe_text}
            
            Calculate remaining ingredients after preparing this recipe.
            Return ONLY the JSON object with remaining ingredients, no explanations.
            Make sure to include the category field for each ingredient.
            """)
        ])

        try:
            response = await self.llm.ainvoke(prompt.format())
            content = response.content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith("```") and "```" in content:
                # Extract content between markdown code blocks
                content = content.split("```", 2)[1]
                # If it starts with a language identifier like "json", remove it
                if "\n" in content:
                    content = content.split("\n", 1)[1]
                # Remove trailing code block if present
                if "```" in content:
                    content = content.split("```")[0]
            
            # Parse the response content as JSON
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            print(f"Raw response: {response.content}")
            return {"remaining_ingredients": []}
        except Exception as e:
            print(f"Error calculating remaining ingredients: {e}")
            return {"remaining_ingredients": []} 
