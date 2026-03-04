# WeeNet - KPI Management Demo Guide

## Quick Reference for Your Demonstration

---

## 📋 Demo Flow (Recommended Order)

### **Step 1: Introduction (2 mins)**
```
"Weenet uses a weighted KPI system to evaluate employee performance across
multiple criteria, enabling optimal team allocation based on skills and experience."
```

**Key Points:**
- Multi-dimensional employee evaluation system
- Role-specific KPI criteria (8 different roles)
- Domain-specific experience tracking (Finance, Health, Education, E-Commerce)
- Automated team selection based on KPI scores

---

### **Step 2: System Overview (3 mins)**

**Supported Roles:**
1. Business Analyst
2. Backend Engineer
3. DevOps Engineer
4. Frontend Engineer
5. FullStack Engineer
6. Project Manager
7. Quality Assurance Engineer
8. Tech Lead

**KPI Categories:**
- 🎓 **Education**: Bachelor's/Master's Degree (Related/Unrelated)
- 💼 **Experience**: Years in role, Domain experience, Leadership
- 🛠️ **Skills**: Role-specific technical competencies (Novice/Intermediate/Advanced)

---

### **Step 3: KPI Calculation System (5 mins)**

**Formula:**
```
KPI Score = Σ (Criteria Weight × Level Value)

Where:
- Criteria Weight: Importance of each criterion (0.0 - 1.0)
- Level Value: Performance level score (varies by criterion)
- Total Weight = 1.0 (100%)
```

**Example: Business Analyst**

```
Criteria                  | Weight | Level      | Value | Contribution
--------------------------|--------|------------|-------|-------------
Analytical Skills         | 0.20   | Advanced   | 5     | 1.00
Technical Proficiency     | 0.10   | Advanced   | 10    | 1.00
Communication Skills      | 0.15   | Advanced   | 10    | 1.50
Problem Solving           | 0.05   | Advanced   | 20    | 1.00
Years of Experience       | 0.15   | 5+ years   | 10    | 1.50
Domain Experience         | 0.10   | 15+        | 10    | 1.00
Leadership                | 0.05   | Leadership | 20    | 1.00
Bachelor's Degree         | 0.10   | Related    | 10    | 1.00
Master's Degree           | 0.10   | Related    | 10    | 1.00
--------------------------|--------|------------|-------|-------------
TOTAL                     | 1.00   |            |       | 10.00
```

---

### **Step 4: Data Structure (4 mins)**

**File Organization:**
```
data/KPI/
├── employees.xlsx          # Employee data (multi-sheet)
│   ├── Business Analyst
│   ├── Backend Engineer
│   ├── DevOps Engineer
│   └── ... (8 sheets total)
├── weights/                # Criteria weights per role
│   ├── Business Analyst.xlsx
│   ├── Backend Engineer.xlsx
│   └── ...
├── jsons/                  # Level definitions per role
│   ├── Business Analyst.json
│   ├── Backend Engineer.json
│   └── ...
└── occupied.xlsx          # Employee availability status
```

**Employee Data Fields:**
```json
{
  "EMP ID": "BA1",
  "Name": "John Doe",
  "Age": 30,
  "Phone Number": "+1234567890",
  "Home Town": "New York",
  "Domain": "Finance",
  "Analytical Skills": "Advanced",
  "Technical Proficiency": "Advanced",
  "Communication Skills": "Advanced",
  "Problem Solving Skills": "Advanced",
  "Years of experience in Business Analysis": "5+ years",
  "Experience of related Domain": "15+",
  "Leadership/Team lead experience": "Leadership",
  "Bachelor's Degree": "related",
  "Master's Degree": "related"
}
```

---

### **Step 5: Loading Configuration Files (3 mins)**

**Load Criteria Definitions (JSON):**
```python
def load_json_files(data_path='data/KPI/jsons/'):
    json_arr = {}
    files = os.listdir(data_path)
    
    for file in files:
        if file.endswith('.json'):
            json_path = os.path.join(data_path, file)
            with open(json_path, 'r') as f:
                data = json.load(f)
                role = file.split('.')[0]
                json_arr[role] = [data, json_path]
    
    return json_arr
```

**Load Criteria Weights (Excel):**
```python
def load_csv_files(data_path='data/KPI/weights/'):
    df_arr = {}
    files = os.listdir(data_path)
    
    for file in files:
        if file.endswith('.xlsx'):
            excel_path = os.path.join(data_path, file)
            df = pd.read_excel(excel_path)
            df = df[['Criteria', 'Weight']]
            role = file.split('.')[0]
            df_arr[role] = df
    
    return df_arr
```

---

### **Step 6: KPI Calculation Functions (5 mins)**

**Step-by-Step Process:**

**1. Load Configurations:**
```python
df_arr = load_csv_files()      # Weights
json_arr = load_json_files()   # Level values
```

**2. Prepare Employee Data:**
```python
# Convert employee record to criteria dictionary
criteria_json = {
    "Analytical Skills": "Advanced",
    "Technical Proficiency": "Advanced",
    # ... other criteria
}
```

**3. Calculate KPI:**
```python
def calculate_kpi_value(role, criteria_json):
    # Get weight table for role
    df_role = df_arr[role]
    
    # Get level values for role
    json_role = json_arr[role][0]
    
    # Create criteria dataframe
    criteria_df = pd.DataFrame(criteria_json, index=[0]).T
    criteria_df.columns = ['Criteria', 'Level']
    
    # Merge with weights
    criteria_df = criteria_df.merge(df_role, on='Criteria', how='left')
    
    # Calculate weighted scores
    criteria_df['KPI'] = criteria_df.apply(
        lambda row: json_role[row['Criteria']][row['Level']] * row['Weight'],
        axis=1
    )
    
    return criteria_df['KPI'].sum()
```

---

### **Step 7: CRUD Operations (4 mins)**

**Add New Criteria:**
```python
crud_json = {
    "type": "skills",
    "criteria": "Data Visualization",
    "level": {
        "Novice": 1,
        "Intermediate": 3,
        "Advanced": 5
    },
    "weight": 0.10
}

crud_kpi_criterias(crud_json, 'Business Analyst', operation='add')
```

**Update Existing Criteria:**
```python
crud_json = {
    "type": "skills",
    "criteria": "Analytical Skills",
    "level": {
        "Novice": 2,
        "Intermediate": 5,
        "Advanced": 10
    },
    "weight": 0.25  # Increased importance
}

crud_kpi_criterias(crud_json, 'Business Analyst', operation='update')
```

**Delete Criteria:**
```python
crud_json = {
    "type": "skills",
    "criteria": "Analytical Skills NEWWW",
}

crud_kpi_criterias(crud_json, 'Business Analyst', operation='delete')
```

---

### **Step 8: Team Selection Integration (5 mins)**

**Workflow:**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  COMPLEXITY  │    │     KPI      │    │   EMPLOYEE   │
│  PREDICTION  │───▶│ CALCULATION  │───▶│  SELECTION   │
│  (GPT-4)     │    │   (Python)   │    │  (Top KPI)   │
└──────────────┘    └──────────────┘    └──────────────┘
       │                                        │
       │                                        │
       ▼                                        ▼
┌──────────────────────────────────────────────────────┐
│  Team Allocation:                                     │
│  • Backend Engineer: 2 (Emp IDs: BE3, BE7)          │
│  • Frontend Engineer: 2 (Emp IDs: FE1, FE5)         │
│  • Project Manager: 1 (Emp ID: PM2)                 │
│  • QA Engineer: 1 (Emp ID: QA4)                     │
└──────────────────────────────────────────────────────┘
```

**Team Selection Algorithm:**
```python
def calculate_kpi_sheet(role, domain):
    # Get all employees for this role and domain
    df_role_values = pd.read_excel('data/KPI/employees.xlsx', sheet_name=role)
    df_role_values = df_role_values[df_role_values['Domain'] == domain]
    
    # Calculate KPI for each employee
    kpi_list = []
    for i in range(df_role_values.shape[0]):
        criteria_json = eval(df_role_values.loc[i, :].to_json())
        emp_id = criteria_json['EMP ID']
        kpi_value = calculate_kpi_value(role, criteria_json)
        kpi_list.append({'EmpID': emp_id, 'KPI': kpi_value})
    
    # Sort by KPI (descending)
    df_kpi = pd.DataFrame(kpi_list)
    df_kpi = df_kpi.sort_values(by='KPI', ascending=False)
    
    return df_kpi
```

**Selection Process:**
1. GPT-4 determines team composition (e.g., "Need 2 Backend Engineers, 3 Frontend Engineers...")
2. System filters unoccupied employees
3. Calculate KPI for each role in the required domain
4. Select top N employees based on KPI scores
5. Return selected team with KPI values

---

### **Step 9: API Integration (3 mins)**

**Calculate KPI for Single Employee:**
```bash
curl -X POST http://127.0.0.1:5001/kpi/employee \
  -H "Content-Type: application/json" \
  -d '{
    "emp_id": "BA1",
    "role": "Business Analyst"
  }'
```

**Response:**
```json
{
  "kpis": [
    {
      "KPI": 10.0,
      "Domain": "Finance",
      "Name": "John Doe",
      "Age": 30,
      "Home Town": "New York",
      "Phone Number": "+1234567890"
    }
  ]
}
```

**Calculate KPI for All Employees (Role + Domain):**
```bash
curl -X POST http://127.0.0.1:5001/kpi/role \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Business Analyst",
    "domain": "Finance"
  }'
```

**CRUD Operations:**
```bash
curl -X POST http://127.0.0.1:5001/kpi/crud \
  -H "Content-Type: application/json" \
  -d '{
    "crud_json": {
      "type": "skills",
      "criteria": "Data Visualization",
      "level": {
        "Novice": 1,
        "Intermediate": 3,
        "Advanced": 5
      },
      "weight": 0.10
    },
    "role": "Business Analyst",
    "operation": "add"
  }'
```

---

### **Step 10: Sample Demonstration (5 mins)**

**Scenario: Finance Project Needs Business Analysts**

**Step 1: View All Finance Business Analysts**
```python
df_kpi = calculate_kpi_sheet('Business Analyst', 'Finance')
print(df_kpi)
```

**Output:**
```
  EmpID    KPI
0   BA1  10.00
1   BA4   7.80
2   BA9   7.35
3   BA2   7.20
4   BA6   7.10
5   BA8   7.05
6  BA10   5.95
7   BA7   5.60
8   BA5   4.85
9   BA3   3.00
```

**Step 2: Select Top 3 for Project**
```python
top_3 = df_kpi.head(3)
print("Selected Team:")
print(top_3)
```

**Output:**
```
Selected Team:
  EmpID    KPI
0   BA1  10.00  ⭐ Highest performing
1   BA4   7.80
2   BA9   7.35
```

**Step 3: View Individual Employee Details**
```python
kpi_details = kpi_for_employee('BA1', 'Business Analyst')
pprint(kpi_details)
```

---

## 🖥️ Commands to Run Demo

### Start Backend Server:
```bash
cd C:\Weenet\pm-pulse-FE\backend
python app_2.py
```

### Open Demo Notebook:
```bash
# In VS Code, open:
kpi_management.ipynb
```

### Test KPI Calculation:
```python
# In Jupyter Notebook
criteria_json = {
    "Analytical Skills": "Advanced",
    "Technical Proficiency": "Advanced",
    "Communication Skills": "Advanced",
    "Problem Solving Skills": "Advanced",
    "Years of experience in Business Analysis": "5+ years",
    "Experience of related Domain": "15+",
    "Leadership/Team lead experience": "Leadership",
    "Bachelor's Degree": "related",
    "Master's Degree": "related"
}

kpi_score = calculate_kpi_value('Business Analyst', criteria_json)
print(f"KPI Score: {kpi_score}")
```

---

## 📁 File Structure

```
pm-pulse-FE/backend/
├── app_2.py                        # Main Flask API
├── kpi_management.ipynb            # Demo notebook ⭐
├── data/
│   └── KPI/
│       ├── employees.xlsx          # Employee database (8 sheets)
│       ├── weights/                # Criteria weights
│       │   ├── Business Analyst.xlsx
│       │   ├── Backend Engineer.xlsx
│       │   └── ... (8 files)
│       ├── jsons/                  # Level definitions
│       │   ├── Business Analyst.json
│       │   ├── Backend Engineer.json
│       │   └── ... (8 files)
│       └── occupied.xlsx           # Employee availability
```

---

## 🎓 KPI Criteria Examples by Role

### **Business Analyst**
- Analytical Skills (20%)
- Technical Proficiency (10%)
- Communication Skills (15%)
- Problem Solving Skills (5%)
- Years of Experience (15%)
- Domain Experience (10%)
- Leadership Experience (5%)
- Bachelor's Degree (10%)
- Master's Degree (10%)

### **Backend Engineer**
- Programming Languages (15%)
- Database Management (15%)
- API Development (10%)
- Framework Knowledge (10%)
- Microservices Architecture (5%)
- Years of Experience (15%)
- Domain Experience (10%)
- Bachelor's Degree (10%)
- Master's Degree (10%)

### **Frontend Engineer**
- HTML/CSS Proficiency (15%)
- JavaScript/TypeScript (10%)
- Frontend Frameworks (15%)
- UI/UX Design (10%)
- Responsive Design (5%)
- Years of Experience (15%)
- Domain Experience (10%)
- Bachelor's Degree (10%)
- Master's Degree (10%)

---

## ❓ FAQ for Demo

**Q: How are weights determined?**

A: Weights are assigned by project managers based on role requirements. Total must sum to 1.0 (100%).

**Q: Can criteria be customized per project?**

A: Yes! Use CRUD operations to add/update/delete criteria and adjust weights.

**Q: How is domain experience tracked?**

A: Each employee has experience entries for all 4 domains (Finance, Health, Education, E-Commerce).

**Q: What if an employee has no domain experience?**

A: They receive a low score (0-5 years = 3 points) for that domain.

**Q: How does this integrate with team selection?**

A: The complexity model suggests team composition, then KPI scores determine which specific employees are selected.

**Q: What happens if there aren't enough employees with high KPI?**

A: System selects all available employees and flags insufficient team capacity.

---

## 🎬 Demo Checklist

- [ ] Backend server running (`python app_2.py`)
- [ ] Demo notebook open in VS Code
- [ ] Sample employee data loaded
- [ ] API testing tool ready (Postman/curl)
- [ ] Example CRUD operations prepared
- [ ] Team selection scenario ready

---