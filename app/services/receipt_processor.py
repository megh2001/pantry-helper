import pytesseract
from PIL import Image
import io
from typing import List, Dict
import os
import re
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json
import base64

# Try to load LLM dependencies, with graceful fallback if missing
try:
    import openai
    from openai import AsyncOpenAI
    HAS_LLM_DEPS = True
except ImportError:
    HAS_LLM_DEPS = False
    AsyncOpenAI = None

# Load environment variables
load_dotenv()

# Add the ReceiptItem class back for compatibility with recipe_recommender.py
class ReceiptItem(BaseModel):
    name: str = Field(description="Name of the grocery item")
    quantity: float = Field(description="Quantity of the item")
    unit: str = Field(description="Unit of measurement")
    category: str = Field(description="Category of the item (e.g., pantry, dairy, produce, meat)")

class ReceiptProcessor:
    def __init__(self):
        self.client: AsyncOpenAI | None = None
        self.can_process = False
        
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and HAS_LLM_DEPS and AsyncOpenAI is not None:
            try:
                self.client = AsyncOpenAI(api_key=api_key)
                self.can_process = True
            except Exception as e:
                print(f"Failed to initialize OpenAI AsyncClient: {e}. Receipt processing will not be available.")
                self.can_process = False
        else:
            if not api_key:
                print("OPENAI_API_KEY not found. Receipt processing will not be available.")
            if not HAS_LLM_DEPS or AsyncOpenAI is None:
                print("OpenAI dependencies (including async support) not installed or import failed. Receipt processing will not be available.")
            self.can_process = False

    def _encode_image_to_base64(self, image_data: bytes) -> str:
        """Encode image to base64 for OpenAI vision model."""
        return base64.b64encode(image_data).decode('utf-8')

    async def process_receipt_image(self, image_data: bytes) -> List[Dict]:
        """Process a receipt image to extract grocery items using the OpenAI vision model."""
        if not self.can_process or not self.client:
            print("Receipt processor is not initialized or OpenAI client is not available.")
            return []

        try:
            items = await self._process_with_vision(image_data)
            
            return items
        except Exception as e:
            print(f"Error processing receipt image with vision model: {e}")
            return []

    async def _process_with_vision(self, image_data: bytes) -> List[Dict]:
        """Process receipt image using OpenAI vision model with image preprocessing."""
        try:
            # Use Pillow to preprocess the image for better results
            from PIL import Image, ImageEnhance
            import io
            
            image = Image.open(io.BytesIO(image_data))
            image = image.convert('L')
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            image = image.convert('RGB')
            
            processed_img_io = io.BytesIO()
            image.save(processed_img_io, format='JPEG', quality=95)
            processed_img_data = processed_img_io.getvalue()
            
            base64_image = self._encode_image_to_base64(processed_img_data)
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a receipt analyzer specialized in processing grocery receipts.
                        Your task is to extract grocery items as accurately as possible, including:
                        
                        1. Item name (generic product name, remove brand names)
                        2. Quantity (numeric value, default to 1.0 if unclear)
                        3. Unit of measurement (e.g., can, bottle, lb, oz, package, item)
                        4. Category (pantry, dairy, produce, meat, bakery, other)
                        
                        Standardize item names by removing brand names and using common terms:
                        - "HEINZ KETCHUP" → "ketchup"
                        - "COUNTRY HARVEST BREAD" → "wheat bread"
                        - "JIF PEANUT BUTTER" → "peanut butter"
                        
                        Focus only on food items and ignore:
                        - Store information, dates, receipt numbers
                        - Prices, totals, subtotals, taxes
                        - Discounts, loyalty information
                        - Non-food items
                        
                        Return ONLY a valid JSON array of items.
                        """
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Analyze this receipt image and extract only the grocery items.
                                The image may be a receipt from a grocery store.
                                
                                Return ONLY a JSON array of items with this exact format:
                                [
                                    {
                                        "name": "item name",
                                        "quantity": 1.0,
                                        "unit": "unit",
                                        "category": "category"
                                    },
                                    ...
                                ]
                                If no items are found or the image is not a receipt, return an empty array [].
                                Ensure all fields (name, quantity, unit, category) are present for each item.
                                Default quantity to 1.0 if not specified.
                                Default unit to 'item' if not specified.
                                Try to infer category, or use 'other' if unsure.
                                """
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"}
            )
            
            raw_response_content = response.choices[0].message.content
            if raw_response_content is None:
                print("OpenAI API returned None content.")
                return []

            try:
                parsed_json = json.loads(raw_response_content)
                if isinstance(parsed_json, list):
                    items = parsed_json
                elif isinstance(parsed_json, dict) and "items" in parsed_json and isinstance(parsed_json["items"], list):
                    items = parsed_json["items"]
                else:
                    print(f"Unexpected JSON structure from OpenAI: {parsed_json}")
                    found_list = None
                    for value in parsed_json.values():
                        if isinstance(value, list):
                            found_list = value
                            break
                    if found_list is not None:
                        items = found_list
                    else:
                        items = []
                        print("Could not extract items from the JSON response.")
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON from OpenAI: {e}")
                print(f"Raw response content was: {raw_response_content}")
                items = []
            
            validated_items = []
            for item in items:
                if isinstance(item, dict) and all(k in item for k in ["name", "quantity", "unit", "category"]):
                    validated_items.append(item)
                else:
                    print(f"Skipping malformed item: {item}")
            
            return validated_items

        except openai.APIError as e:
            print(f"OpenAI API Error: {e}")
            return []
        except Exception as e:
            print(f"Error in _process_with_vision: {e}")
            return []
