import axios, { AxiosResponse, AxiosError } from 'axios';
import { Ingredient, ToBuyItem, Recipe, RecipeResponse, UseRecipeResponse, RecipeRecommendationResponse } from '../types';

// Define the new union type for the response
export type RecipeOrChatResponse = 
  | { recipes: Recipe[]; message?: never; error?: never }
  | { message: string; recipes?: never; error?: never }
  | { error: string; message?: never; recipes?: never }; // If error is present, message and recipes are not.

// Create an Axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased from 10 seconds to 60 seconds
});

// Request interceptor for adding authorization headers if needed
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors here
    if (error.response) {
      // Server responded with an error status
      console.error('API Error:', error.response.status, error.response.data);
      
      // Handle specific status codes
      if (error.response.status === 401) {
        // Unauthorized, redirect to login
        // window.location.href = '/login';
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Error setting up the request
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Pantry API functions
export const getPantryItems = async (): Promise<Ingredient[]> => {
  const response: AxiosResponse<Ingredient[]> = await api.get('/pantry/');
  return response.data;
};

export const addPantryItem = async (item: Omit<Ingredient, 'id'>): Promise<Ingredient> => {
  const response: AxiosResponse<Ingredient> = await api.post('/pantry/add/', item);
  return response.data;
};

export const deletePantryItem = async (id: number): Promise<void> => {
  await api.delete(`/pantry/${id}`);
};

// To Buy API functions
export const getToBuyItems = async (): Promise<ToBuyItem[]> => {
  const response: AxiosResponse<ToBuyItem[]> = await api.get('/to-buy/');
  return response.data;
};

export const addToBuyItem = async (item: Omit<ToBuyItem, 'id'>): Promise<ToBuyItem> => {
  const response: AxiosResponse<ToBuyItem> = await api.post('/to-buy/add/', item);
  return response.data;
};

export const deleteToBuyItem = async (id: number): Promise<void> => {
  await api.delete(`/to-buy/${id}`);
};

// Receipt upload
interface ReceiptResponse {
  message: string;
  items_added: number;
  items: Ingredient[];
  debug?: {
    ocr_text: string;
    raw_items: any[];
    method_used: string;
  }
}

export const uploadReceipt = async (file: File): Promise<ReceiptResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response: AxiosResponse<ReceiptResponse> = await api.post('/upload-receipt/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000, // 2 minute timeout specifically for receipt uploads
  });
  
  return response.data;
};

// Recipe API functions
export const getRecipeRecommendation = async (userPrompt: string): Promise<RecipeOrChatResponse> => {
  try {
    const response: AxiosResponse<any> = await api.get('/recipes/recommend', {
      params: { user_prompt: userPrompt },
    });
    
    console.log("Raw API response from /recipes/recommend:", response.data);

    if (response.data && Array.isArray(response.data)) {
      return { recipes: response.data as Recipe[] };
    } else if (response.data && response.data.recipes) {
      return { recipes: response.data.recipes as Recipe[] };
    } else if (response.data && response.data.message) {
      // This is a successful chat message from the backend (not an error)
      return { message: response.data.message as string };
    }
    
    console.warn("Unexpected response structure from /recipes/recommend:", response.data);
    return { error: "Received an unexpected response from the server." }; 

  } catch (error) {
    console.error("API error details in getRecipeRecommendation:", error);
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data;
      if (errorData && errorData.detail) {
        return { error: errorData.detail as string };
      }
      if (errorData && errorData.message) {
        // This could be a message from our backend (like 502 error with chat_response)
        // or another error structure. Let's prioritize error.detail if it was from HTTPException
        return { error: errorData.message as string }; 
      }
    }
    return { error: "Failed to get recommendations. Please try again." };
  }
};

export const selectRecipe = async (recipeIndex: number, userPrompt?: string): Promise<Recipe> => {
  const response: AxiosResponse<{recipe: Recipe, confirmation_required: boolean}> = await api.post('/recipes/select/', null, {
    params: { recipe_index: recipeIndex, user_prompt: userPrompt },
  });
  
  return response.data.recipe;
};

export const postRecommendation = async (recipe: Recipe, confirmUse: boolean = false): Promise<RecipeRecommendationResponse> => {
  const response: AxiosResponse<RecipeRecommendationResponse> = await api.post('/recommendation/', {
    recipe: recipe,
    confirm_use: confirmUse
  });
  
  return response.data;
};

export const callUseRecipe = async (recipe: Recipe): Promise<UseRecipeResponse> => {
  try {
    console.log("Calling use recipe with:", recipe);
    const response: AxiosResponse<UseRecipeResponse> = await api.post('/recipes/use/', recipe);
    console.log("Use recipe response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Use recipe error:", error);
    throw error;
  }
};

export default api; 
