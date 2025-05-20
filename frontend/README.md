# Pantry Tracker Frontend

A modern, secure React frontend for the Pantry Tracker application, built with TypeScript, Material UI, and React Router.

## Security Features

- **TypeScript** for type safety and preventing common runtime errors
- **Error Boundaries** for graceful error handling and recovery
- **Global Error Handling** to catch and log unhandled errors and promises
- **Input Validation** for all forms to prevent invalid data
- **Secure API Integration** with error handling and timeout limits
- **Content Security Controls** to prevent XSS attacks
- **File Upload Validation** with size and type restrictions
- **Modern React Patterns** including hooks and functional components

## Features

- **Pantry Management**

  - View all pantry items organized by category
  - Add items manually with validation
  - Upload and process receipt images securely
  - Delete individual items
  - Low stock warnings based on minimum quantities

- **Shopping List**

  - View needed items organized by category
  - Add items manually with validation
  - Track which recipes items were used in
  - Delete individual items

- **Recipe Assistant**
  - Chat interface for recipe recommendations
  - View detailed recipes with ingredients and instructions
  - Use recipes and automatically update pantry/shopping list
  - Real-time feedback on recipe usage

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Backend API running on http://localhost:8000

## Setup

1. Install dependencies:

```bash
# Clean install to avoid dependency conflicts
npm ci

# Or standard install
npm install
```

2. Start the development server:

```bash
npm start
```

The application will be available at http://localhost:3000

## Project Structure

```
frontend-new/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── Navbar.tsx
│   │   └── ReceiptUpload.tsx
│   ├── pages/
│   │   ├── Pantry.tsx
│   │   ├── ToBuy.tsx
│   │   └── RecipeChat.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── theme.ts
└── package.json
```

## Development

- Run linter:

```bash
npm run lint
```

- Build for production:

```bash
npm run build
```

## API Integration

The frontend connects to a FastAPI backend running at http://localhost:8000 with these endpoints:

- `GET /pantry/` - Get all pantry items
- `POST /pantry/add/` - Add item to pantry
- `DELETE /pantry/{id}` - Delete pantry item
- `POST /upload-receipt/` - Upload receipt image
- `GET /to-buy/` - Get shopping list
- `POST /to-buy/add/` - Add item to shopping list
- `DELETE /to-buy/{id}` - Delete shopping list item
- `GET /recipes/recommend` - Get recipe recommendations
- `POST /recipes/use/` - Use a recipe

## Troubleshooting

If you encounter npm registry errors:

1. Clear npm cache:

```bash
npm cache clean --force
```

2. Try using a different registry:

```bash
npm config set registry https://registry.npmjs.com/
```

3. If issues persist, try using yarn:

```bash
npm install -g yarn
yarn install
```
