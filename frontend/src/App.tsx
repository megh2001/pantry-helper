import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline, Box, Container } from "@mui/material";
import theme from "./theme";
import { Navbar } from "./components/Navbar";
import Pantry from "./pages/Pantry";
import ToBuy from "./pages/ToBuy";
import { RecipeChat } from "./pages/RecipeChat";
import ErrorBoundary from "./components/ErrorBoundary";

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}
          >
            <Navbar />
            <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
              <Routes>
                <Route path="/" element={<Pantry />} />
                <Route path="/pantry" element={<Pantry />} />
                <Route path="/to-buy" element={<ToBuy />} />
                <Route path="/recipes" element={<RecipeChat />} />
              </Routes>
            </Container>
          </Box>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
