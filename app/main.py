from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict
import os
from dotenv import load_dotenv
import json
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from . import models, schemas
from .database import engine, get_db
from .services.receipt_processor import ReceiptProcessor
from .services.recipe_recommender import RecipeRecommender

# Load environment variables
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pantry Tracker API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

receipt_processor = ReceiptProcessor()
recipe_recommender = RecipeRecommender()

@app.post("/upload-receipt/")
async def upload_receipt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process a receipt image to add items to the pantry."""
    if not receipt_processor.can_process:
        raise HTTPException(status_code=503, detail="Receipt processing service is not available. Check API key and dependencies.")
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Process the receipt with Vision model
        items = await receipt_processor.process_receipt_image(contents)
        
        # Method used is now always Vision model if processor is active
        method_used = "OpenAI GPT-4o mini Vision"
        
        # Add items to database
        added_items = []
        if items:
            for item in items:
                item_dict = item if isinstance(item, dict) else item.dict()
                
                # Check if ingredient already exists
                existing_ingredient = db.query(models.Ingredient).filter(
                    models.Ingredient.name == item_dict["name"]
                ).first()
                
                if existing_ingredient:
                    # Add to existing quantity
                    existing_ingredient.quantity += item_dict["quantity"]
                    added_items.append(existing_ingredient)
                else:
                    # Create new ingredient
                    new_ingredient = models.Ingredient(
                        name=item_dict["name"],
                        quantity=item_dict["quantity"],
                        unit=item_dict["unit"],
                        category=item_dict["category"],
                        min_quantity=round(item_dict["quantity"] * 0.2, 2)  # Set minimum quantity to 20% of initial quantity, rounded to 2 decimal places
                    )
                    db.add(new_ingredient)
                    added_items.append(new_ingredient)
            
            db.commit()
        
        return {
            "message": "Receipt processed successfully",
            "items_added": len(added_items),
            "items": [schemas.Ingredient.from_orm(item) for item in added_items],
            "debug": {
                "raw_items": items,
                "method_used": method_used
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()

@app.get("/recipes/recommend")
async def get_recipe_recommendations(
    user_prompt: str = None,
    db: Session = Depends(get_db)
):
    """Get recipe recommendations based on available ingredients in the pantry and optional user prompt."""
    # Get all ingredients from the database
    ingredients = db.query(models.Ingredient).all()
    
    # Common pantry staples that don't need to be in the pantry
    common_ingredients = {
        'olive oil', 'vegetable oil', 'salt', 'black pepper', 'garlic', 'onion',
        'sugar', 'flour', 'baking powder', 'baking soda', 'vanilla extract',
        'cinnamon', 'paprika', 'oregano', 'basil', 'thyme', 'rosemary',
        'butter', 'milk', 'eggs', 'water'
    }
    
    # Convert to dictionary format for easier lookup
    ingredients_dict = {
        ing.name.lower(): {
            "name": ing.name,
            "quantity": ing.quantity,
            "unit": ing.unit,
            "category": ing.category
        }
        for ing in ingredients
    }
    
    if not ingredients_dict:
        raise HTTPException(
            status_code=400,
            detail="No ingredients found in pantry. Please add some ingredients first."
        )
    
    # Convert ingredients to the format expected by the recommender
    ingredients_list = [
        {
            "name": ing.name,
            "quantity": ing.quantity,
            "unit": ing.unit,
            "category": ing.category
        }
        for ing in ingredients
    ]
    
    recommender = RecipeRecommender()
    service_response = await recommender.get_recipe_recommendations(ingredients_list, user_prompt)
    
    # Check if the response is a direct chat message or an error from the service
    if "chat_response" in service_response:
        if service_response.get("error"):
            # You might want a specific status code for errors from the recommender service
            raise HTTPException(status_code=502, detail=service_response["chat_response"])
        return {"message": service_response["chat_response"]}
    
    # If not a chat response, proceed with recipe processing
    if "recipes" not in service_response or not isinstance(service_response["recipes"], list):
        # This case should ideally be handled by the error state in chat_response,
        # but as a fallback:
        raise HTTPException(status_code=500, detail="Received an unexpected response format from the recipe service.")

    recipes = service_response["recipes"]
    
    if not recipes:
        # If the AI explicitly returns an empty recipe list, but not as a chat_response.
        # This could mean it understood a recipe request but found nothing based on strict criteria.
        raise HTTPException(
            status_code=404,
            detail="No recipes found matching your criteria. Try a different prompt or add more ingredients."
        )
    
    # Filter recipes to only include ingredients we have and adjust quantities
    filtered_recommendations = []
    for recipe in recipes:
        # Ensure recipe is a dictionary
        if not isinstance(recipe, dict):
            continue
            
        available_ingredients = []
        can_make_recipe = True
        missing_ingredients = []  # Track missing ingredients for debugging
        
        # Ensure recipe has ingredients
        if not isinstance(recipe.get("ingredients"), list):
            continue
            
        for ingredient in recipe["ingredients"]:
            # Ensure ingredient is a dictionary
            if not isinstance(ingredient, dict):
                continue
                
            item_name = ingredient.get("name", "").lower()
            if not item_name:
                continue
                
            # Skip if it's a common ingredient
            if item_name in common_ingredients:
                continue
                
            if item_name in ingredients_dict:
                available = ingredients_dict[item_name]
                # Only include ingredients we have and adjust quantity to what's available
                available_ingredients.append({
                    "name": ingredient["name"],
                    "quantity": min(ingredient.get("quantity", 0), available["quantity"]),
                    "unit": ingredient.get("unit", available["unit"])
                })
            else:
                missing_ingredients.append(item_name)
                
        
        if can_make_recipe and available_ingredients:
            recipe["ingredients"] = available_ingredients
            filtered_recommendations.append(recipe)
    
    if not filtered_recommendations:
        raise HTTPException(
            status_code=404,
            detail="No recipes found that can be made with your current pantry items. Try adding more ingredients or adjusting your search."
        )
    
    return filtered_recommendations

@app.post("/recipes/use/")
async def use_recipe(recipe: Dict, db: Session = Depends(get_db)):
    """
    Confirm recipe usage and update pantry quantities.
    Only uses available ingredients and quantities.
    Moves zero-quantity items to the to_buy list.
    """
    # Get all ingredients from the database
    ingredients = db.query(models.Ingredient).all()
    
    # Convert to dictionary format for easier lookup
    ingredients_dict = {
        ing.name.lower(): {
            "id": ing.id,
            "quantity": ing.quantity,
            "unit": ing.unit,
            "category": ing.category,
            "min_quantity": ing.min_quantity
        }
        for ing in ingredients
    }
    
    # Track items that need to be updated
    items_to_update = []
    items_to_buy = []
    
    # Process each ingredient in the recipe
    for item in recipe.get("ingredients", []):
        item_name = item["name"].lower()
        required_quantity = item["quantity"]
        
        # Only process ingredients we have in the pantry
        if item_name in ingredients_dict:
            available = ingredients_dict[item_name]
            
            # Calculate remaining quantity after using the recipe
            remaining_quantity = available["quantity"] - required_quantity
            
            if remaining_quantity <= 0:
                # Add to to_buy list only if we had the item and used it all
                items_to_buy.append({
                    "name": item["name"],
                    "quantity": abs(remaining_quantity),
                    "unit": item["unit"],
                    "category": available["category"],
                    "last_used": recipe["name"]
                })
                
                # Remove from pantry
                db.query(models.Ingredient).filter(
                    models.Ingredient.id == available["id"]
                ).delete()
            else:
                # Update quantity in pantry
                items_to_update.append({
                    "id": available["id"],
                    "quantity": remaining_quantity
                })
    
    # Update pantry quantities
    for item in items_to_update:
        db.query(models.Ingredient).filter(
            models.Ingredient.id == item["id"]
        ).update({"quantity": item["quantity"]})
    
    # Add items to to_buy list
    for item in items_to_buy:
        existing_item = db.query(models.ToBuy).filter(
            models.ToBuy.name == item["name"]
        ).first()
        
        if existing_item:
            # Update existing item
            existing_item.quantity = max(existing_item.quantity, item["quantity"])
            existing_item.last_used = item["last_used"]
        else:
            # Create new item
            to_buy_item = models.ToBuy(**item)
            db.add(to_buy_item)
    
    db.commit()
    
    return {
        "message": f"Successfully updated pantry for recipe: {recipe['name']}",
        "items_updated": len(items_to_update),
        "items_to_buy": items_to_buy
    }

# Pantry Management Endpoints
@app.get("/pantry/", response_model=List[schemas.Ingredient])
def view_pantry(db: Session = Depends(get_db)):
    """View all ingredients in the pantry."""
    return db.query(models.Ingredient).all()

@app.post("/pantry/add/", response_model=schemas.Ingredient)
def add_to_pantry(ingredient: schemas.IngredientCreate, db: Session = Depends(get_db)):
    """Manually add an item to the pantry."""
    # Round quantity to nearest whole number
    rounded_quantity = round(ingredient.quantity)
    
    # Check if ingredient already exists
    existing_ingredient = db.query(models.Ingredient).filter(
        models.Ingredient.name == ingredient.name
    ).first()
    
    if existing_ingredient:
        # Add to existing quantity and round
        new_quantity = round(existing_ingredient.quantity + rounded_quantity)
        
        # If quantity is less than 0.5, move to to_buy list
        if new_quantity < 0.5:
            # Add to to_buy list
            to_buy_item = db.query(models.ToBuy).filter(
                models.ToBuy.name == ingredient.name
            ).first()
            
            if to_buy_item:
                # Update existing to_buy item
                to_buy_item.quantity = max(to_buy_item.quantity, 1)  # At least 1 unit
            else:
                # Create new to_buy item
                to_buy_item = models.ToBuy(
                    name=ingredient.name,
                    quantity=1,  # At least 1 unit
                    unit=ingredient.unit,
                    category=ingredient.category,
                    last_used="Low quantity alert"
                )
                db.add(to_buy_item)
            
            # Remove from pantry
            db.delete(existing_ingredient)
        else:
            existing_ingredient.quantity = new_quantity
        
        db.commit()
        if new_quantity >= 0.5:
            db.refresh(existing_ingredient)
            return existing_ingredient
        return None
    
    # For new ingredients, if quantity is less than 0.5, add directly to to_buy list
    if rounded_quantity < 0.5:
        to_buy_item = models.ToBuy(
            name=ingredient.name,
            quantity=1,  # At least 1 unit
            unit=ingredient.unit,
            category=ingredient.category,
            last_used="Low quantity alert"
        )
        db.add(to_buy_item)
        db.commit()
        return None
    
    # Create new ingredient with rounded quantity
    db_ingredient = models.Ingredient(
        name=ingredient.name,
        quantity=rounded_quantity,
        unit=ingredient.unit,
        category=ingredient.category,
        min_quantity=round(ingredient.min_quantity if ingredient.min_quantity else rounded_quantity * 0.2)  # Use specified min_quantity or calculate it
    )
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient

@app.delete("/pantry/{item_id}")
def remove_from_pantry(item_id: int, db: Session = Depends(get_db)):
    """Remove an item from the pantry."""
    item = db.query(models.Ingredient).filter(models.Ingredient.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in pantry")
    
    db.delete(item)
    db.commit()
    return {"message": "Item removed from pantry"}

@app.delete("/pantry/clear/")
def clear_pantry(confirm: bool = False, db: Session = Depends(get_db)):
    """Clear all items from the pantry."""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Please set confirm=true to clear the pantry"
        )
    
    try:
        db.query(models.Ingredient).delete()
        db.commit()
        return {"message": "Pantry cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing pantry: {str(e)}"
        )

# To-Buy List Management Endpoints
@app.get("/to-buy/", response_model=List[schemas.ToBuy])
def view_to_buy(db: Session = Depends(get_db)):
    """View all items in the to-buy list."""
    return db.query(models.ToBuy).all()

@app.post("/to-buy/add/", response_model=schemas.ToBuy)
def add_to_buy_list(item: schemas.ToBuyCreate, db: Session = Depends(get_db)):
    """Manually add an item to the to-buy list."""
    # Check if item already exists
    existing_item = db.query(models.ToBuy).filter(
        models.ToBuy.name == item.name
    ).first()
    
    if existing_item:
        # Update existing item
        existing_item.quantity += item.quantity
        existing_item.last_used = item.last_used
        db.commit()
        db.refresh(existing_item)
        return existing_item
    
    # Create new item
    db_item = models.ToBuy(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/to-buy/{item_id}")
def remove_from_to_buy(item_id: int, db: Session = Depends(get_db)):
    """Remove an item from the to-buy list."""
    item = db.query(models.ToBuy).filter(models.ToBuy.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in to-buy list")
    
    db.delete(item)
    db.commit()
    return {"message": "Item removed from to-buy list"}

@app.delete("/to-buy/clear/")
def clear_to_buy_list(confirm: bool = False, db: Session = Depends(get_db)):
    """Clear all items from the to-buy list."""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Please set confirm=true to clear the to-buy list"
        )
    
    try:
        db.query(models.ToBuy).delete()
        db.commit()
        return {"message": "To-buy list cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing to-buy list: {str(e)}"
        ) 
