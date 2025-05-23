import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Container,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { Recipe } from "../types";
import {
  getRecipeRecommendation,
  postRecommendation,
  callUseRecipe,
} from "../services/api";

// Simple message interface
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  recipe?: Recipe;
}

export const RecipeChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Welcome to Recipe Assistant! Ask me for recipe recommendations based on your pantry ingredients.",
      isUser: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await getRecipeRecommendation(input);
      console.log("Recipe API response:", response); // Keep for debugging the new structure

      if (response.recipes && response.recipes.length > 0) {
        const recipe = response.recipes[0]; // For simplicity, still taking the first recipe
        setSelectedRecipe(recipe);
        const botMessage: Message = {
          id: `bot-recipe-${Date.now()}`,
          content: "Here's a recipe recommendation:",
          isUser: false,
          recipe: recipe,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else if (response.message) {
        // Successfully received a chat message (or an error formatted as such by backend)
        const botMessage: Message = {
          id: `bot-chat-${Date.now()}`,
          content: response.message,
          isUser: false,
        };
        setMessages((prev) => [...prev, botMessage]);
        // If the backend itself signaled an error within its chat_response (which api.ts might pass as message if also error true)
        // we might want to show it in the error alert. For now, just showing in chat.
        // The primary error display is for errors caught by the frontend api.ts service via response.error.
      } else if (response.error) {
        // Error explicitly caught and formatted by the frontend api.ts service
        const botMessage: Message = {
          id: `bot-error-${Date.now()}`,
          content: response.error, // Display error message in chat
          isUser: false,
        };
        setMessages((prev) => [...prev, botMessage]);
        setError(response.error); // Also display in the main error Alert component
      } else {
        // Fallback: Neither recipes, nor a chat message, nor a service-level error.
        // This could be an empty recipes array from AI when it understood a recipe request but found nothing.
        const botMessage: Message = {
          id: `bot-no-specific-recipes-${Date.now()}`,
          content:
            "I couldn't find specific recipes for that, or your request was a bit general. Try asking something else or be more specific about a recipe!",
          isUser: false,
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error) {
      // This catch block handles network errors or other unexpected issues not caught by api.ts
      console.error("Error in handleSubmit catch block:", error);
      const errorMessageContent =
        error instanceof Error
          ? error.message
          : "Sorry, an unexpected error occurred. Please try again.";
      const errorMessage: Message = {
        id: `error-fallback-${Date.now()}`,
        content: errorMessageContent,
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError("Failed to communicate with the recipe service.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecipe = async (recipe: Recipe) => {
    setLoading(true);
    try {
      // Instead of using postRecommendation, directly add confirmation message
      // This avoids an unnecessary API call that might be causing issues
      const confirmMessage: Message = {
        id: `confirm-${Date.now()}`,
        content: `Do you want to use the recipe "${recipe.name}"? This will update your pantry and to-buy list.`,
        isUser: false,
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } catch (error) {
      console.error("Error confirming recipe:", error);
      setError("Failed to confirm recipe");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUseRecipe = async (recipe: Recipe) => {
    setLoading(true);
    try {
      // Call API to use the recipe - directly use the callUseRecipe function
      // which is known to be working, instead of postRecommendation
      const result = await callUseRecipe(recipe);

      // Create message content
      let messageContent = `Great! I've updated your pantry for recipe "${recipe.name}".`;

      // Add out-of-stock items info
      if (result.items_to_buy && result.items_to_buy.length) {
        messageContent += ` ${result.items_to_buy.length} out-of-stock ${
          result.items_to_buy.length === 1 ? "item has" : "items have"
        } been added to your shopping list.`;
      }

      // Add updated items info
      if (result.items_updated) {
        messageContent += ` Updated ${result.items_updated} ingredients in your pantry.`;
      }

      // Add success message
      const successMessage: Message = {
        id: `success-${Date.now()}`,
        content: messageContent,
        isUser: false,
      };
      setMessages((prev) => [...prev, successMessage]);
      setSelectedRecipe(null);
    } catch (error) {
      console.error("Error using recipe:", error);

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Sorry, I couldn't update your pantry. Please try again.",
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError("Failed to use recipe");
    } finally {
      setLoading(false);
    }
  };

  const renderRecipeCard = (recipe: Recipe) => (
    <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div">
          {recipe.name}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          {recipe.description}
        </Typography>

        {recipe.cooking_time && (
          <Typography sx={{ mb: 1 }} color="text.secondary">
            <strong>Time:</strong> {recipe.cooking_time} |{" "}
            <strong>Difficulty:</strong> {recipe.difficulty || "Medium"}
          </Typography>
        )}

        <Typography variant="h6" component="div" sx={{ mt: 2 }}>
          Ingredients:
        </Typography>
        <List dense>
          {recipe.ingredients.map((ingredient, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`${ingredient.name}`}
                secondary={`${ingredient.quantity} ${ingredient.unit}`}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" component="div">
          Instructions:
        </Typography>
        <List>
          {Array.isArray(recipe.instructions) ? (
            recipe.instructions.map((step, index) => (
              <ListItem key={index} sx={{ alignItems: "flex-start" }}>
                <Chip
                  label={index + 1}
                  size="small"
                  color="primary"
                  sx={{ mr: 1, mt: 0.5 }}
                />
                <ListItemText primary={step} />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary={recipe.instructions} />
            </ListItem>
          )}
        </List>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          variant="contained"
          onClick={() => handleUseRecipe(recipe)}
          disabled={loading}
        >
          Use This Recipe
        </Button>
      </CardActions>
    </Card>
  );

  const renderConfirmationButtons = (recipe: Recipe) => (
    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleConfirmUseRecipe(recipe)}
        disabled={loading}
      >
        Yes, Use Recipe
      </Button>
      <Button
        variant="outlined"
        onClick={() => {
          setSelectedRecipe(null);
          const cancelMessage: Message = {
            id: `cancel-${Date.now()}`,
            content: "Recipe has been cancelled.",
            isUser: false,
          };
          setMessages((prev) => [...prev, cancelMessage]);
        }}
      >
        Cancel
      </Button>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Recipe Assistant
      </Typography>

      {/* Error alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Chat messages */}
      <Paper
        elevation={2}
        sx={{
          height: "60vh",
          mb: 2,
          p: 2,
          overflow: "auto",
          borderRadius: 2,
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: "flex",
              justifyContent: message.isUser ? "flex-end" : "flex-start",
              mb: 2,
              flexDirection: "column",
              alignItems: message.isUser ? "flex-end" : "flex-start",
              width: "100%",
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: message.recipe ? "90%" : "70%",
                width: message.recipe ? "90%" : "auto",
                borderRadius: 2,
                bgcolor: message.isUser ? "primary.light" : "grey.100",
                color: message.isUser ? "white" : "text.primary",
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {message.content}
              </Typography>

              {message.recipe && renderRecipeCard(message.recipe)}

              {/* Show confirmation buttons for recipe confirmation message */}
              {message.content.startsWith("Do you want to use the recipe") &&
                selectedRecipe &&
                renderConfirmationButtons(selectedRecipe)}
            </Paper>
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Paper>

      {/* Input form */}
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Ask for recipe recommendations..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            sx={{ flexGrow: 1 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !input.trim()}
            sx={{ minWidth: 100 }}
          >
            {loading ? <CircularProgress size={24} /> : <SendIcon />}
          </Button>
        </Box>
      </form>
    </Container>
  );
};
