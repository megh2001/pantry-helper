# Pantry Tracker & Recipe Bot

A full-stack web application designed to help you manage your pantry inventory efficiently and discover new recipes based on the ingredients you already have. This project uses FastAPI for the backend and React for the frontend.

## Features

- **Receipt Processing:** Upload images of your grocery receipts to automatically add items to your pantry using OpenAI's GPT-4o mini Vision model.
- **Inventory Management:** Keep track of item quantities, units, and categories.
- **Recipe Recommendations:** Get intelligent recipe suggestions based on your current pantry stock and optional user prompts (e.g., "quick dinner ideas", "vegetarian meals").
- **Ingredient Usage Tracking:** When you decide to make a recipe, the app can automatically deduct the used ingredients from your pantry.
- **Low Stock Alerts:** (Implicitly through pantry view) Manage minimum quantities to know when to restock.
- **Shopping List ("To-Buy"):** Items that run out or are manually added can be tracked in a separate to-buy list.

## Technologies Used

- **Backend:**
  - Python
  - FastAPI: For building the robust and fast API.
  - SQLAlchemy: For ORM (Object Relational Mapping) with SQLite.
  - Pydantic: For data validation and settings management.
  - OpenAI API: For receipt processing (GPT-4o mini Vision) and recipe recommendations.
  - Uvicorn: As an ASGI server for development.
- **Frontend:**
  - React (with TypeScript)
- **Database:**
  - SQLite (for simplicity in this project)

## Project Structure

```
pantry_tracker/
├── app/                    # Backend FastAPI application
│   ├── __init__.py
│   ├── database.py         # SQLAlchemy setup and database session
│   ├── main.py             # FastAPI application, endpoints
│   ├── models.py           # SQLAlchemy ORM models
│   ├── schemas.py          # Pydantic schemas for request/response validation
│   └── services/           # Business logic
│       ├── __init__.py
│       ├── receipt_processor.py  # Handles OCR and item extraction from receipts
│       └── recipe_recommender.py # Generates recipe suggestions
├── frontend/               # Frontend React application
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/       # API service for frontend
│   │   └── ...
│   ├── package.json
│   └── ...
├── .gitignore
├── README.md               # This file
├── requirements.txt        # Python backend dependencies
├── .env.example            # Example environment variables file
└── pantry.db               # SQLite database file (ensure it's in .gitignore for public repos if it contains sensitive data)
```

## Setup and Installation

### Prerequisites

- Python
- Node.js and npm (for the frontend)
- An OpenAI API Key

### Backend Setup

1.  **Clone the repository (if you haven't already):**

    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
    cd YOUR_REPOSITORY_NAME
    ```

2.  **Navigate to the project root directory.**

3.  **Create and activate a Python virtual environment:**

    ```bash
    python -m venv venv
    ```

    - On macOS/Linux: `source venv/bin/activate`
    - On Windows: `venv\Scripts\activate`

4.  **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

5.  **Set up environment variables:**

    - Create a file named `.env` in the project root directory and add
      ```
      OPENAI_API_KEY=your_actual_openai_api_key_here
      ```

6.  **Initialize the database:**
    The database and tables will be created automatically when you first run the backend application.

7.  **Run the backend server:**
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    The backend API will be accessible at `http://localhost:8000`. You can see the auto-generated API documentation at `http://localhost:8000/docs`.

### Frontend Setup

1.  **Navigate to the `frontend` directory:**

    ```bash
    cd frontend
    ```

2.  **Install Node.js dependencies:**

    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm start
    ```
    The frontend application will usually open automatically in your browser at `http://localhost:3000`.

## API Endpoints Overview

The backend provides several endpoints to manage pantry items, process receipts, and get recipe recommendations. Refer to the FastAPI documentation at `/docs` (once the server is running) for a detailed and interactive API specification.

- `/upload-receipt/`: (POST) Uploads a receipt image for processing.
- `/pantry/`: (GET) View all items in the pantry.
- `/pantry/add/`: (POST) Manually add an item to the pantry.
- `/pantry/{item_id}`: (DELETE) Remove an item from the pantry.
- `/recipes/recommend/`: (GET) Get recipe recommendations.
- `/recipes/use/`: (POST) Confirm usage of a recipe and update pantry.
- `/to-buy/`: (GET, POST, DELETE) Manage the shopping list.
