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
- OpenAI API Key

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
4. Create a `.env` file in the `backend` directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY="your-api-key-here"
   ```
5. Run the server (runs on port `5001`):
   ```bash
   python app_2.py
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:5173`.
