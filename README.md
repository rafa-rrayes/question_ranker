# Question Ranker

A web application that ranks questions based on your query and challenges you to answer as many as you can in 30 seconds!

## Features

- User authentication (signup/login)
- Query-based question ranking using embeddings
- 30-second timed game
- Score tracking

## Setup Instructions

### Backend (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies (if not already done):
   ```bash
   uv sync
   ```

3. Make sure you have a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Run migrations (if not already done):
   ```bash
   .venv/bin/python manage.py migrate
   ```

5. Load questions data (if not already done):
   ```bash
   .venv/bin/python manage.py load_questions
   ```

6. Start the Django development server:
   ```bash
   .venv/bin/python manage.py runserver
   ```

The backend will run at `http://localhost:8000`

### Frontend (React)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run at `http://localhost:5173`

## How to Play

1. Sign up or login to your account
2. Enter a query/topic (e.g., "science", "history", "geography")
3. Click "Start Game" to get 10 questions ranked by relevance
4. Answer as many questions as you can in 30 seconds
5. Submit to see your score!

## API Endpoints

- `POST /api/auth/signup/` - Create a new user account
- `POST /api/auth/login/` - Login to existing account
- `POST /api/questions/ranked/` - Get ranked questions based on query
- `POST /api/questions/submit/` - Submit answers and get score

## Tech Stack

- **Backend**: Django 6.0, Django REST Framework, JWT Authentication
- **Frontend**: React 19, TypeScript, Vite
- **Database**: SQLite (default)
- **ML**: OpenAI Embeddings API for question ranking
