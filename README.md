# WeeNet Project Management System

WeeNet Project Management is an AI-powered project planning and tracking platform. It analyzes project requirements and provides data-driven estimates for team composition, hardware resource allocation, and Software Development Life Cycle (SDLC) timelines, adjusting for potential project risks.

## Core Modules

### 1. Team & Hardware Resource Allocation
- **Team Composition:** Predicts the required number of team members across various roles (Backend, Frontend, FullStack, QA, DevOps, PM, etc.) based on project domain, tech stack, budget, and scope.
- **Hardware Optimization:** Automatically calculates the necessary hardware infrastructure required for the recommended team.
  - Generates a quantified bill of materials (e.g., Developer Laptops, Testing Machines, CI/CD Servers, Software Licenses).
  - Displays a detailed visual breakdown of the total hardware cost and its percentage against the total project budget using dynamic progress bars.

### 2. Time Management & SDLC Predictions (AI Engine)
- **Base Estimation (`XGBoost Model`):** The engine uses an **XGBoost** Machine Learning model (`xgb_sdlc.pkl`) trained on historical data to predict the base number of days required for each of the 7 phases of the SDLC:
  1. Planning
  2. Requirements Analysis
  3. Design
  4. Coding
  5. Testing
  6. Deployment
  7. Maintenance
- **Risk Inference:** Evaluates project parameters to predict the risk level (High, Medium, Low).
- **Risk-Adjusted Timelines (`LLM Integration`):** Uses **OpenAI's Large Language Model (LLM)** to analyze the predicted risk and identify potential bottlenecks or issues at each specific SDLC phase. It recalculates the base time, adding "delays" (Risk-Adjusted time) to phases susceptible to identified risks.
- **Visualization:** Displays the comparative timeline in a custom sequential **Gantt Chart**, overlaying the Risk-Adjusted schedule over the Base Estimate. 

### 3. Complexity Analysis
- Evaluates project attributes to classify the project's overall technical and operational complexity.
- Validates that the expected budget and timeline align with the predicted complexity.

## Tech Stack
- **Frontend:** React, Vite, Ant Design (UI Framework), SweetAlert2
- **Backend:** Python, Flask, XGBoost, Scikit-Learn
- **AI/LLM:** LlamaIndex (OpenAI Integration)

## Getting Started

### Prerequisites
- Node.js & npm (for frontend)
- Python 3.10+ (for backend)
- OpenAI API Key (only if using OpenAI mode)

### Backend Setup
1. Navigate to the `backend` directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory.
   - OpenAI mode:
   ```
   LLM_PROVIDER="openai"
   OPENAI_API_KEY="your-api-key-here"
   ```
   - Local model mode (GPT4All):
   ```
   LLM_PROVIDER="local"
   LOCAL_MODEL="Llama-3.2-1B-Instruct-Q4_0.gguf"
   LOCAL_MODEL_DIR="./models"
   LOCAL_ALLOW_DOWNLOAD="0"
   ```
   - Auto mode (try OpenAI first, then local):
   ```
   LLM_PROVIDER="auto"
   OPENAI_API_KEY="your-api-key-here"
   LOCAL_MODEL="Llama-3.2-1B-Instruct-Q4_0.gguf"
   LOCAL_MODEL_DIR="./models"
   ```
5. Run the server (runs on port `5002`):
   ```bash
   python app_2.py
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create frontend env from template (no code edits needed):
   ```bash
   cp .env.example .env
   ```
   - If backend is `app_2.py`, keep:
   ```
   VITE_API_BASE_URL="http://127.0.0.1:5002"
   ```
   - If backend is `app.py`, set:
   ```
   VITE_API_BASE_URL="http://127.0.0.1:5001"
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Access the application at `http://localhost:5173`.
