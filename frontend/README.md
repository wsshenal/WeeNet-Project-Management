# WeeNet Project Management System

This repository contains a **Project Management System for web application development**. It includes a Vite/React frontend and a FastAPI backend that powers prediction-based functionality. The system is designed to support project planning, execution, and risk awareness throughout the Software Development Life Cycle (SDLC).

## Repository Structure

- `frontend/`: Vite + React application (UI and routing).
- `backend/`: FastAPI service and ML inference.
- `styles/`: Shared assets/styles (if applicable).

## Code Flow (High-Level)

### Frontend Flow

1. **Entry point**: `frontend/src/index.jsx` renders the app via `frontend/src/App.jsx`.
2. **Routing**: `frontend/src/router/Router.jsx` defines routes and wraps most pages with `ProtectedRoute`.
3. **Layout**: `frontend/src/layouts/Layouts.jsx` provides the sidebar menu and the main content outlet.
4. **Auth Guard**: `frontend/src/guards/Authguard.jsx` redirects unauthenticated users to `/login` and prevents logged-in users from visiting `/login` or `/register`.
5. **API access**: `frontend/src/apis/axiosInstance.js` sets the API base URL to `http://127.0.0.1:5001` for all HTTP calls.

Key navigation routes (from the sidebar) include:
- `/requirement`
- `/add-employee`
- `/view-employee`
- `/view-KPI`
- `/skill`
- `/crud`
- `/team`
- `/complexity`
- `/projects`
- `/risk-type`
- `/sdlc`

### Backend Flow

1. **App setup**: `backend/app.py` initializes a FastAPI app.
2. **Health endpoint**: `GET /` returns a basic status message.
3. **Prediction endpoint**: `POST /predict` accepts project features, loads a model from `artifacts/random_forest.pkl`, and returns a numeric prediction.

> Note: The frontend currently references additional endpoints such as `/login`, `/register`, `/save-data`, `/get-projects`, and `/risk`. These are not defined in `backend/app.py` yet, so you may need to implement them or point the frontend to the correct service.

## Risk Management (Research Component)

The **Risk Management** component focuses on identifying, analyzing, and mitigating potential risks that may affect the successful implementation of the platform. This component supports continuous monitoring across the SDLC—design, development, deployment, and maintenance—to reduce uncertainty and ensure timely delivery.

### Risk Types

#### 1. Technical Risks
- Architecture is not scalable under load.
- Security vulnerabilities or data leaks.
- AI model accuracy is too low for production.

#### 2. Project Execution Risks
- Scope creep (features keep increasing).
- Poor requirement clarity or changes midway.

#### 3. Business & Strategic Risks
- The project outcome doesn’t align with client requirements.
- Changing market or competitor conditions.
- The project becomes financially nonviable.
- Misalignment with business strategy or product vision.

#### 4. External & Environmental Risks
- Dependency service (API, SDK) is discontinued.
- Client-side policy or regulation changes.

## Running the Project

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 5001
```
