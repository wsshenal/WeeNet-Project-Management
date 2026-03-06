# PM-Pulse Backend Setup

## Prerequisites
- Python 3.9 or higher
- pip (Python package installer)

## Installation

1. Install Python dependencies:
```bash
cd "PM Pulse 3"
pip3 install -r requirements.txt
```

2. Configure Environment Variables:
   - Open the `.env` file
   - Replace `your_openai_api_key_here` with your actual OpenAI API key
   - You can get an API key from: https://platform.openai.com/api-keys

## Running the Application

### Option 1: Using app.py (Main application)
```bash
cd "PM Pulse 3"
python3 app.py
```

### Option 2: Using app_2.py (Alternative version)
```bash
cd "PM Pulse 3"
python3 app_2.py
```

The server will start on `http://localhost:5000`

## API Endpoints

- POST `/register` - User registration
- POST `/login` - User login
- POST `/risk` - Risk prediction
- GET `/employee/all` - Get all employees
- POST `/complexity` - Complexity analysis
- POST `/sdlc` - SDLC prediction
- POST `/kpi/crud` - KPI CRUD operations
- DELETE `/delete-row` - Delete a row
- POST `/kpi/role` - Get KPI by role
- POST `/kpi/employee` - Get KPI by employee
- POST `/employee/insert` - Insert employee
- POST `/save-data` - Save project data
- GET `/get-data` - Get all data
- GET `/get-projects` - Get all projects

## Notes

- Make sure all required artifacts are present in the `artifacts/` directory
- User data is stored in `data/users.json`
- Project data is stored in `data/` directory
