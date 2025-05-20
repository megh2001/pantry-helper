from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from .database import Base

# Association table for recipe ingredients
recipe_ingredients = Table(
    'recipe_ingredients',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id')),
    Column('ingredient_id', Integer, ForeignKey('ingredients.id')),
    Column('quantity', Float),
    Column('unit', String)
)

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    quantity = Column(Float)
    unit = Column(String)
    min_quantity = Column(Float)  # Minimum quantity before low stock alert
    category = Column(String)  # e.g., "pantry", "spice", "dairy"
    recipes = relationship("Recipe", secondary=recipe_ingredients, back_populates="ingredients")

class ToBuy(Base):
    __tablename__ = "to_buy"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    quantity = Column(Float)
    unit = Column(String)
    category = Column(String)
    last_used = Column(String)  # Recipe name where it was last used

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    instructions = Column(String)
    ingredients = relationship("Ingredient", secondary=recipe_ingredients, back_populates="recipes") 
