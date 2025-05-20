import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Container,
  CircularProgress,
  Alert,
  AlertTitle,
  Snackbar,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ShoppingCartCheckout as MoveToIcon,
} from "@mui/icons-material";
import { ToBuyItem } from "../types";
import { getToBuyItems, addToBuyItem, deleteToBuyItem } from "../services/api";
import ErrorBoundary from "../components/ErrorBoundary";
import { GridItem } from "../components/GridItem";

const ToBuy: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [items, setItems] = useState<ToBuyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const [newItem, setNewItem] = useState<Omit<ToBuyItem, "id">>({
    name: "",
    quantity: 0,
    unit: "",
    category: "",
    last_used: "",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getToBuyItems();
      setItems(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while fetching shopping list items";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddItemSubmit = async () => {
    try {
      // Form validation
      if (
        !newItem.name ||
        newItem.quantity <= 0 ||
        !newItem.unit ||
        !newItem.category
      ) {
        setNotification({
          open: true,
          message: "Please fill in all required fields",
          severity: "error",
        });
        return;
      }

      await addToBuyItem(newItem);
      setOpenAdd(false);
      setNewItem({
        name: "",
        quantity: 0,
        unit: "",
        category: "",
        last_used: "",
      });

      setNotification({
        open: true,
        message: "Item added successfully",
        severity: "success",
      });

      fetchItems();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while adding the item";
      setNotification({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteToBuyItem(id);
      setNotification({
        open: true,
        message: "Item deleted successfully",
        severity: "success",
      });

      // Update the items list optimistically
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while deleting the item";
      setNotification({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  // Group items by category for better organization
  const groupedItems = items.reduce((groups, item) => {
    const category = item.category || "Uncategorized";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, ToBuyItem[]>);

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            Shopping List
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={fetchItems}
              startIcon={<RefreshIcon />}
              disabled={loading}
              size={isMobile ? "small" : "medium"}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenAdd(true)}
              startIcon={<AddIcon />}
              size={isMobile ? "small" : "medium"}
            >
              Add Item
            </Button>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {!loading && items.length === 0 && !error && (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              backgroundColor: "#f9f9f9",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Your shopping list is empty
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Add items manually or use recipes to automatically populate your
              shopping list
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenAdd(true)}
                startIcon={<AddIcon />}
              >
                Add Item
              </Button>
            </Box>
          </Paper>
        )}

        {!loading && items.length > 0 && (
          <Box>
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <Box key={category} sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 500 }}
                  >
                    {category}
                  </Typography>
                  <Divider sx={{ flex: 1, ml: 2 }} />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", margin: -1 }}>
                  {categoryItems.map((item) => (
                    <GridItem xs={12} sm={6} md={4} key={item.id}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          },
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                              {item.name}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteItem(item.id)}
                              aria-label={`Delete ${item.name}`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          <Typography variant="body1">
                            {item.quantity} {item.unit}
                          </Typography>

                          {item.last_used && (
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              sx={{
                                mt: 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <MoveToIcon fontSize="small" color="action" />
                              Last used in: {item.last_used}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </GridItem>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Add Item Dialog */}
        <Dialog
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Add to Shopping List</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              <TextField
                label="Name"
                fullWidth
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                required
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={newItem.quantity || ""}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  inputProps={{ min: 0, step: 0.1 }}
                />

                <TextField
                  label="Unit"
                  fullWidth
                  value={newItem.unit}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unit: e.target.value })
                  }
                  required
                />
              </Box>

              <TextField
                label="Category"
                fullWidth
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                required
              />

              <TextField
                label="Last Used In (Optional)"
                fullWidth
                value={newItem.last_used}
                onChange={(e) =>
                  setNewItem({ ...newItem, last_used: e.target.value })
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddItemSubmit}
            >
              Add Item
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </ErrorBoundary>
  );
};

export default ToBuy;
