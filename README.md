# Pantry Tracker and Recipe Assistant

A web application that helps users track their pantry items and get recipe recommendations based on available ingredients.

## Features

- Upload grocery receipts or manually input items
- Track pantry inventory
- Get recipe recommendations based on available ingredients
- Track ingredient usage
- Get notifications for low stock items

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your OpenAI API key:

```
OPENAI_API_KEY=your_api_key_here
```

4. Run the application:

```bash
uvicorn app.main:app --reload
```

## Project Structure

- `app/` - Main application directory
  - `main.py` - FastAPI application entry point
  - `models/` - Database models
  - `schemas/` - Pydantic schemas
  - `services/` - Business logic
  - `database.py` - Database configuration
