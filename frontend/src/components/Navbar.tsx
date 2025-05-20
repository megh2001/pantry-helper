import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  Button,
  Typography,
  Container,
  useTheme,
} from "@mui/material";
import KitchenIcon from "@mui/icons-material/Kitchen";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ChatIcon from "@mui/icons-material/Chat";

export const Navbar = () => {
  const location = useLocation();
  const theme = useTheme();

  const menuItems = [
    { text: "Pantry", path: "/pantry", icon: <KitchenIcon /> },
    { text: "Shopping List", path: "/to-buy", icon: <ShoppingCartIcon /> },
    { text: "Recipe Chat", path: "/recipes", icon: <ChatIcon /> },
  ];

  const isActive = (path: string) => {
    if (
      path === "/pantry" &&
      (location.pathname === "/" || location.pathname === "/pantry")
    ) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: "flex", alignItems: "center" }}
          >
            Pantry Tracker
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            {menuItems.map((item) => (
              <Button
                key={item.text}
                component={RouterLink}
                to={item.path}
                sx={{
                  my: 2,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  textTransform: "none",
                  px: 3,
                  backgroundColor: isActive(item.path)
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                  },
                }}
                startIcon={item.icon}
              >
                {item.text}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
