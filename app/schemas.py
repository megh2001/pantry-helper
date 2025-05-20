from pydantic import BaseModel
from typing import List, Optional

class IngredientBase(BaseModel):
    name: str
    quantity: float
    unit: str
    category: str

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int
    min_quantity: float

    class Config:
        from_attributes = True

class ToBuyBase(BaseModel):
    name: str
    quantity: float
    unit: str
    category: str
    last_used: str

class ToBuyCreate(ToBuyBase):
    pass

class ToBuy(ToBuyBase):
    id: int

    class Config:
        from_attributes = True

class RecipeBase(BaseModel):
    name: str
    description: str
    instructions: str

class RecipeCreate(RecipeBase):
    ingredients: List[dict]  # List of {ingredient_id: int, quantity: float, unit: str}

class Recipe(RecipeBase):
    id: int
    ingredients: List[Ingredient]

    class Config:
        from_attributes = True

class RecipeRecommendation(BaseModel):
    recipe: Recipe
    missing_ingredients: List[Ingredient]
    confidence_score: float 
