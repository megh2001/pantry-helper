import { createTheme } from '@mui/material/styles';

// New color palette from the image
// #4B352A - Dark brown
// #CD8052 - Terracotta orange
// #BDC79E - Sage green
// #F4EFC1 - Cream/pale yellow

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4B352A', // Dark brown
      light: '#5a4439',
      dark: '#3c2a21',
    },
    secondary: {
      main: '#CD8052', // Terracotta orange
      light: '#d8936a',
      dark: '#b06e46',
    },
    success: {
      main: '#BDC79E', // Sage green
      light: '#cad2b1',
      dark: '#a0aa85',
    },
    warning: {
      main: '#CD8052', // Terracotta as warning
    },
    error: {
      main: '#d32f2f', // Keep standard error color
    },
    background: {
      default: '#F4EFC1', // Cream background
      paper: '#fff',
    },
    text: {
      primary: '#4B352A', // Dark brown for text
      secondary: '#6c5648', // Lighter brown for secondary text
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
      color: '#4B352A',
    },
    h2: {
      fontWeight: 500,
      color: '#4B352A',
    },
    h3: {
      fontWeight: 500,
      color: '#4B352A',
    },
    h4: {
      fontWeight: 500,
      color: '#4B352A',
    },
    h5: {
      fontWeight: 500,
      color: '#4B352A',
    },
    h6: {
      fontWeight: 500,
      color: '#4B352A',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#4B352A',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        containedPrimary: {
          backgroundColor: '#4B352A',
          '&:hover': {
            backgroundColor: '#3c2a21',
          },
        },
        containedSecondary: {
          backgroundColor: '#CD8052',
          '&:hover': {
            backgroundColor: '#b06e46',
          },
        },
        outlinedPrimary: {
          borderColor: '#4B352A',
          color: '#4B352A',
        },
        outlinedSecondary: {
          borderColor: '#CD8052',
          color: '#CD8052',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme; 
