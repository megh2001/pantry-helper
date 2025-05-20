export interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  min_quantity?: number;
}

export interface ToBuyItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  last_used: string;
}

export interface Recipe {
  name: string;
  description: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  instructions: string[];
  cooking_time?: string;
  difficulty?: string;
  confidence_score?: number;
}

export interface RecipeResponse {
  recipes: Recipe[];
  message?: string;
}

export interface UseRecipeResponse {
  message: string;
  items_updated: number;
  items_to_buy: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    last_used: string;
  }[];
}

export interface RecipeRecommendationResponse {
  recipe: Recipe;
  confirmation_required: boolean;
  message?: string;
  moved_to_buy?: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }[];
  remaining_ingredients?: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }[];
} 
