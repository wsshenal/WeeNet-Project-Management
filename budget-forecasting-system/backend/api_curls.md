# Postman cURL Commands for Budget Forecasting API

Import these commands into Postman by clicking **Import** > **Raw Text** and pasting the cURL command.

### 1. Health Check
Check if the API is running and the model is loaded.

```bash
curl --location 'http://127.0.0.1:5002/health'
```

### 2. Predict Budget
Generate a budget forecast.

```bash
curl --location 'http://127.0.0.1:5002/predict' \
--header 'Content-Type: application/json' \
--data '{
    "Domain": "E-Commerce",
    "Mobile": 1,
    "Desktop": 0,
    "Web": 1,
    "IoT": 0,
    "Expected_Team_Size": 12,
    "Expected_Budget": 75000,
    "Risk": 2,
    "Complexity_Level": "Medium",
    "Date_Difference": 0
}'
```

### 3. Get Sample Projects
Retrieve a list of sample projects from the dataset.

```bash
curl --location 'http://127.0.0.1:5002/projects'
```

### 4. API Info
Get version and endpoint information.

```bash
curl --location 'http://127.0.0.1:5002/'
```
