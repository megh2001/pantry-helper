# Pantry Tracker & Recipe Bot

An LLM application that tracks your pantry, recommends recipes and automatically manages your shopping lists.  
This project uses OpenAI's API for the LLM served with a FastAPI backend and React for the frontend.

### Features:

- **Receipt Processing:** Upload images of your grocery receipts to automatically add items to your pantry using OpenAI's GPT-4o mini model.
- **Inventory Management:** Keep track of item quantities, units, and categories.
- **Recipe Recommendations:** Get intelligent recipe suggestions based on your current pantry stock and optional user prompts (e.g., "quick dinner ideas", "vegetarian meals").
- **Ingredient Usage Tracking:** When you decide to make a recipe, the app can automatically deduct the used ingredients from your pantry.
- **Low Stock Alerts:** (Implicitly through pantry view) Manage minimum quantities to know when to restock.
- **Shopping List ("To-Buy"):** Items that run out or are manually added can be tracked in a separate to-buy list.

## Motivation:
I'm personally really bad at keeping track of my groceries. I first started working on this project because I would've liked an app that could automatically track my groceiries and let me know when I'm running out.  
  
I decided that using an LLM to parse text from an image of a reciept would be the easiest and quickest way to record the groceries I bought. I figured if I was going to keep a track of groceries used anyways, using an LLM to suggest recipes based on my current inventory was a great way to track grocery usage and also make it a feauture. You can ask the recipe bot for recipe suggestions anad if you decide to use the recipe, the AI will automatically deduct that inventory from you pantry and notify you if any item is too low in quantity.    

The current implementation is a minimal proof of concept of this application.  
You can find the limitations and future ideas listed below.


## Design and Implementation:  

### Technologies Used

- **Backend:**
  - Python
  - FastAPI: For building the endpoints.
  - SQLAlchemy: For ORM with SQLite.
  - OpenAI API: For receipt processing and recipe recommendations (GPT o4-mini model).
  - Langchain: Setting up prompt layers and parsing input/output
- **Frontend:**
  - React (with TypeScript)
- **Database:**
  - SQLite (for simplicity in this project)

### Project Structure

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
│       ├── receipt_processor.py  # Handles item extraction from receipts
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
└── pantry.db               # SQLite database file
```

## Results:
The current implementation is capable of parsing through complex grocery reciepts, understanding generic item specfications and keeping a tracak of one's groceries. 
It is also able to recommend dishes based on specfically those items present inthe grocery table and upon selection it can update the grocery table based on used items, at the same time keeping a track of items that are running low and adding them to a shopping list.

### Limitations:
- The model sometimes sturggles with recognizing the quantity of the ingedients and default to some value. 
- The recipes recommended are also not always particularly unique or special. A robust agentic approach with access to a source of recipes would fair better. 
- APIs and core logic is currently untested.

### Future developements:
- The easiest progression from here design wise would be an expense tracker. Since we are alreaady parsing a reciept, obtaining the user's spending data and helping them budget would be a useful next feature.
- Create a more robust architecture: An agentic apporach equipped with tool caalling and with access to a database of recipes and ingredient types would be useful in creatin more refined recipes and giving more accurate results

## Setup and Installation

### Prerequisites

- Python
- Node.js and npm (for the frontend)
- An OpenAI API Key

### Backend Setup

1.  **Clone the repository (if you haven't already):**

    ```bash
    git clone https://github.com/megh2001/pantry-helper.git
    cd pantry-helpe
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
      OPENAI_API_KEY=your_openai_api_key_here
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
