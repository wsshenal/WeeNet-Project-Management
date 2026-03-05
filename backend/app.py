import numpy as np
import pandas as pd
import os, pickle, json, ast
from flask_cors import CORS
from flask import Flask, request, jsonify
from functools import wraps
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
try:
    import jwt  # PyJWT
    HAS_PYJWT = True
except Exception:
    jwt = None
    HAS_PYJWT = False
# We'll use an open-source model locally rather than calling an external API.
# `gpt4all` provides a small quantized CPU-friendly chat model.
from llama_index.core.llms import ChatMessage, MessageRole

# local model support
from gpt4all import GPT4All

app = Flask(__name__)
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", "8"))
token_serializer = URLSafeTimedSerializer(JWT_SECRET)
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}
CORS(app, resources={r"/*": {"origins": list(ALLOWED_ORIGINS)}})

def issue_token(email):
    if HAS_PYJWT:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": email,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=JWT_EXPIRES_HOURS)).timestamp()),
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    # Fallback when PyJWT is not installed.
    return token_serializer.dumps({"sub": email})

def decode_token(token):
    if HAS_PYJWT:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return token_serializer.loads(token, max_age=JWT_EXPIRES_HOURS * 3600)

def _extract_bearer():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return auth.split(" ", 1)[1].strip()

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # allow CORS preflight
        if request.method == "OPTIONS":
            return ("", 204)
        token = _extract_bearer()
        if not token:
            return jsonify({"error": "Missing auth token"}), 401
        try:
            claims = decode_token(token)
            request.user_email = claims.get("sub")
        except Exception as e:
            if HAS_PYJWT and isinstance(e, jwt.ExpiredSignatureError):
                return jsonify({"error": "Token expired"}), 401
            if HAS_PYJWT and isinstance(e, jwt.InvalidTokenError):
                return jsonify({"error": "Invalid token"}), 401
            if isinstance(e, SignatureExpired):
                return jsonify({"error": "Token expired"}), 401
            if isinstance(e, BadSignature):
                return jsonify({"error": "Invalid token"}), 401
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper

# mimic the simple .chat interface that llama_index.OpenAI provided
class LocalLLM:
    def __init__(self, model):
        self.model = model

    def chat(self, messages, **kwargs):
        if len(messages) >= 2:
            prompt = messages[0].content + "\n" + messages[1].content
        else:
            prompt = "\n".join(m.content for m in messages)
        prompt += "\n\n### RESPONSE:\n"

        # allow more tokens to ensure we capture the mitigation section
        out = self.model.generate(prompt, max_tokens=1024)
        text = out or ""

        if "### RESPONSE:" in text:
            text = text.split("### RESPONSE:", 1)[1].strip()
        elif text.startswith(prompt):
            text = text[len(prompt) :]

        if not text.strip():
            print("Warning: gpt4all produced empty continuation")

        class Dummy:
            pass
        response = Dummy()
        response.message = Dummy()
        response.message.content = text
        return response

def load_local_llm():
    # load only from local disk; do not attempt download at startup
    local_model_name = os.environ.get("LOCAL_MODEL", "Llama-3.2-1B-Instruct-Q4_0.gguf")
    local_model_dir = os.environ.get("LOCAL_MODEL_DIR", os.path.join(os.getcwd(), "models"))
    try:
        print(
            f"loading gpt4all model '{local_model_name}' from '{local_model_dir}' "
            "(downloads disabled)"
        )
        model = GPT4All(
            local_model_name,
            model_path=local_model_dir,
            allow_download=False,
        )
        return LocalLLM(model)
    except Exception as e:
        print(f"GPT4All unavailable; continuing with fallback risk text: {e}")
        return None

llm = load_local_llm()
USE_LLM = os.environ.get("USE_LLM", "0").lower() in {"1", "true", "yes"}
if not USE_LLM:
    llm = None
    print("USE_LLM disabled; running deterministic/fallback mode for team consistency.")

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response


roles = [
        'Business Analyst',
        'Backend Engineer',
        'DevOps Engineer',
        'Frontend Engineer',
        'FullStack Engineer',
        'Project Manager',
        'Quality Assurance Engineer', 'Tech Lead'
        ]

with open('artifacts/xgb.pkl', 'rb') as f:
    xgb = pickle.load(f)

with open('artifacts/xgb_sdlc.pkl', 'rb') as f:
    xgb_sdlc = pickle.load(f)

with open('artifacts/random_forest.pkl', 'rb') as f:
    rfc = pickle.load(f)

with open('artifacts/label_encoder.pkl', 'rb') as f:
    encoder_dict = pickle.load(f)

with open('artifacts/label_encoder_sdlc.pkl', 'rb') as f:
    encoder_dict_sdlc = pickle.load(f)

def inference_risk(
                data_json,
                # better to return simple risk level names so the frontend can
                # colour and display them without needing to strip " Risk".
                class_dict  = {
                                0 : 'Low', 
                                1 : 'Medium', 
                                2 : 'High'
                                },
                dataset_path = 'data/project_details.xlsx'
                ):
    raw_payload = data_json.copy() if isinstance(data_json, dict) else {}
    domain_norm = {
        "E-Commerce": "E-commerce",
        "Ecommerce": "E-commerce",
    }
    if isinstance(data_json, dict):
        data_json = data_json.copy()
        data_json["Domain"] = domain_norm.get(data_json.get("Domain"), data_json.get("Domain"))
        # normalize field aliases from frontend payloads
        if "Project Scope" in data_json and "project_scope" not in data_json:
            data_json["project_scope"] = data_json.get("Project Scope")
        if "Requirement specifity" in data_json and "requirement_specifity" not in data_json:
            data_json["requirement_specifity"] = data_json.get("Requirement specifity")
        if "Team Experience" in data_json and "team_experience" not in data_json:
            data_json["team_experience"] = data_json.get("Team Experience")
        if "ML Components" in data_json and "ML_Components" not in data_json:
            data_json["ML_Components"] = data_json.get("ML Components")
        if "Tech Stack" in data_json and "Tech_Stack" not in data_json:
            data_json["Tech_Stack"] = data_json.get("Tech Stack")
        if "Core Features" in data_json and "Core_Features" not in data_json:
            data_json["Core_Features"] = data_json.get("Core Features")
        if "Expected Team Size" in data_json and "Expected_Team_Size" not in data_json:
            data_json["Expected_Team_Size"] = data_json.get("Expected Team Size")
        if "Expected Budget" in data_json and "Expected_Budget" not in data_json:
            data_json["Expected_Budget"] = data_json.get("Expected Budget")
        if "ML Components" in raw_payload and "ML_Components" not in raw_payload:
            raw_payload["ML_Components"] = raw_payload.get("ML Components")
        if "Tech Stack" in raw_payload and "Tech_Stack" not in raw_payload:
            raw_payload["Tech_Stack"] = raw_payload.get("Tech Stack")
        if "Core Features" in raw_payload and "Core_Features" not in raw_payload:
            raw_payload["Core_Features"] = raw_payload.get("Core Features")
        if "Project Scope" in raw_payload and "project_scope" not in raw_payload:
            raw_payload["project_scope"] = raw_payload.get("Project Scope")
        if "Requirement specifity" in raw_payload and "requirement_specifity" not in raw_payload:
            raw_payload["requirement_specifity"] = raw_payload.get("Requirement specifity")
        if "Team Experience" in raw_payload and "team_experience" not in raw_payload:
            raw_payload["team_experience"] = raw_payload.get("Team Experience")

    data = pd.DataFrame(data_json, index=[0])
    data = data[[
                'Domain', 'Mobile', 'Desktop', 
                'Web', 'IoT', 'Expected Team Size', 'Expected Budget'
                ]]
        
    data_json = {k : v for k, v in data_json.items() if k in data.columns}
    data['Domain'] = data['Domain'].map({
                                        'E-commerce':1,
                                        'Health':2, 'Education':3,
                                        'Finance':4
                                        })

    df_pj = pd.read_excel(dataset_path)
    df_pj = df_pj[[
                'Domain', 'Mobile', 'Desktop',              
                'Web', 'IoT', 'Expected Team Size',
                'Expected Budget', 'Risk'
                ]]
    data_to_json = data.to_dict(orient='records')[0] 
    match_flag = df_pj[[
                'Domain', 'Mobile', 'Desktop',              
                'Web', 'IoT', 'Expected Team Size',
                'Expected Budget']] == data_to_json
    # find the row index that all inndices are true
    match_index = match_flag[match_flag.all(axis=1)].index.values
    if len(match_index) > 0:
        match_index = match_index[0]
        row = df_pj.iloc[match_index]
        risk = int(row['Risk']) -1
        prediction = class_dict[risk]

    else:
        prediction = xgb.predict(data)[0]
        prediction = class_dict[prediction]

    data_json_updated = data_json.copy()
    data_json_updated['Risk'] = prediction

    def build_risk_sections(payload, level):
        budget = float(
            payload.get("Expected Budget")
            or payload.get("Expected_Budget")
            or 0
        )
        team_size = float(
            payload.get("Expected Team Size")
            or payload.get("Expected_Team_Size")
            or 0
        )
        platform_count = sum(
            int(payload.get(k, 0) or 0) for k in ["Mobile", "Desktop", "Web", "IoT"]
        )
        domain = str(payload.get("Domain", "") or "").strip()
        project_scope = str(payload.get("project_scope", "") or "").strip().lower()
        requirement_specificity = str(payload.get("requirement_specifity", "") or "").strip().lower()
        team_experience = str(payload.get("team_experience", "") or "").strip().lower()
        ml_component = str(payload.get("ML_Components", "") or "").strip()
        tech_stack = str(payload.get("Tech_Stack", "") or "").strip()
        backend = str(payload.get("Backend", "") or "").strip()
        frontend = str(payload.get("Frontend", "") or "").strip()

        factors = []
        actions = []

        # Budget and team capacity
        if budget and budget <= 20000:
            factors.append(
                f"- Budget pressure: expected budget ({int(budget)}) is critically low for delivery risk."
            )
            actions.append("- Increase project budget baseline to a realistic level before full-scope execution.")
            actions.append("- Freeze scope to a strict MVP and defer all non-critical features.")
            actions.append("- Allocate a hard contingency reserve (10-15%) before starting development.")
        elif budget and budget < 150000:
            factors.append(f"- Budget pressure: expected budget ({int(budget)}) may limit contingency.")
            actions.append("- Prioritize MVP features and stage the roadmap in funded phases.")

        if team_size and team_size <= 2:
            factors.append(f"- Team capacity: team size ({int(team_size)}) is critically low for scope.")
            actions.append("- Increase core team size (engineering, QA, and PM coverage) before scaling delivery.")
            actions.append("- Reduce active workstreams to one platform and one release at a time.")
            actions.append("- Add minimum external support/part-time specialists for QA and DevOps.")
        elif team_size and team_size < 25:
            factors.append(f"- Team capacity: team size ({int(team_size)}) may be tight for scope.")
            actions.append("- Add weekly capacity checks and rebalance workload by priority.")

        # Platform breadth
        if platform_count >= 3:
            factors.append(
                f"- Platform breadth: {platform_count} platforms increase coordination and testing overhead."
            )
            actions.append("- Deliver single-platform MVP first, then expand in sequenced releases.")
        elif platform_count == 2:
            factors.append("- Multi-platform scope: two platforms require tighter planning and shared components.")
            actions.append("- Use shared APIs/components and lock interface contracts early.")

        # Scope, requirements, and experience quality
        if project_scope in {"wide", "large"}:
            factors.append("- Scope breadth: wide scope raises delivery and integration complexity.")
            actions.append("- Split scope into phased milestones with acceptance criteria per phase.")

        if requirement_specificity in {"poor", "unclear"}:
            factors.append("- Requirement clarity: low specificity can cause rework and late changes.")
            actions.append("- Run requirement workshops and baseline signed user stories before build.")
        elif requirement_specificity == "average":
            factors.append("- Requirement clarity: average specificity still carries moderate rework risk.")
            actions.append("- Add early prototype reviews and requirement freeze gates.")

        if team_experience in {"low"}:
            factors.append("- Team experience: lower experience may increase defect leakage and cycle time.")
            actions.append("- Add senior technical oversight, code reviews, and tighter QA gates.")
        elif team_experience in {"mixed", "medium"}:
            factors.append("- Team experience: mixed capability requires stronger coordination and mentoring.")
            actions.append("- Pair less experienced members with seniors on critical modules.")

        # Technology and domain complexity
        if ml_component in {"Recommendation Engine", "Classification Model", "Prediction Model"}:
            factors.append(f"- ML complexity: {ml_component} requires additional validation and monitoring effort.")
            actions.append("- Plan model validation metrics, drift checks, and staged rollout.")

        if tech_stack in {"Serverless", "MEAN"}:
            factors.append(f"- Stack adoption: {tech_stack} may increase integration/operational learning curve.")
            actions.append("- Allocate a technical spike and define architecture guardrails early.")

        if backend and frontend and (
            (backend == "Spring Boot" and frontend == "Svelte")
            or (backend == "Django" and frontend == "Angular")
        ):
            factors.append("- Cross-stack integration: selected frontend/backend pair may need extra integration effort.")
            actions.append("- Define API contracts early and validate integration with an end-to-end spike.")

        if domain in {"Finance", "Health"}:
            factors.append(f"- Domain constraints: {domain} projects typically face stronger compliance and quality demands.")
            actions.append("- Include compliance/security reviews in every milestone plan.")

        # execution guardrails for strongly constrained projects
        if budget and budget <= 20000 and team_size and team_size <= 2:
            actions.append("- Re-baseline timeline and secure stakeholder sign-off on reduced scope.")
            actions.append("- Add weekly go/no-go checkpoints with explicit risk acceptance decisions.")

        if not factors:
            factors.append("- Inputs indicate manageable constraints with standard delivery risk.")
            actions.append("- Maintain standard QA, milestone reviews, and stakeholder updates.")

        # De-duplicate while preserving order
        factors = list(dict.fromkeys(factors))
        actions = list(dict.fromkeys(actions))

        analysis = (
            f"The risk model predicted **{level}** risk. The drivers above are computed from the "
            "submitted profile (domain, scope, requirements, team experience, stack, ML component, "
            "platform breadth, budget, and team size)."
        )
        risk_section = "\n".join(
            [
                "### Risk Factors",
                *factors,
                "",
                "### Analysis",
                analysis,
            ]
        )
        mitigation_steps = "\n".join(
            [
                "### Mitigation Steps",
                *actions,
            ]
        )
        return risk_section, mitigation_steps

    explain_payload = {**raw_payload, **data_json_updated}
    risk_section, mitigation_steps = build_risk_sections(explain_payload, prediction)

    return risk_section, prediction, mitigation_steps

def load_json_files(data_path = 'data/KPI/jsons/'):
    json_arr = {}
    files = os.listdir(data_path)
    for file in files:
        if file.endswith('.json'):
            json_path = os.path.join(data_path, file)
            with open(json_path, 'r') as f:
                data = json.load(f)
                data_updated = {}
                for type, criteria in data.items():
                    data_iter = {}
                    for cri, levels in criteria.items():
                        cri = cri.replace('/', '-')
                        data_iter[cri] = levels
                    data_updated[type] = data_iter

                role = file.split('.')[0]
                json_arr[role] = [data_updated, json_path]
    return json_arr

def load_json_files(data_path = 'data/KPI/jsons/'):
    json_arr = {}
    files = os.listdir(data_path)
    for file in files:
        if file.endswith('.json'):
            json_path = os.path.join(data_path, file)
            with open(json_path, 'r') as f:
                data = json.load(f)
                data_updated = {}
                for type, criteria in data.items():
                    data_iter = {}
                    for cri, levels in criteria.items():
                        cri = cri.replace('/', '-')
                        data_iter[cri] = levels
                    data_updated[type] = data_iter

                role = file.split('.')[0]
                json_arr[role] = [data_updated, json_path]
    return json_arr

def load_csv_files(data_path = 'data/KPI/weights/'):
    df_arr = {}
    files = os.listdir(data_path)
    for file in files:
        if file.endswith('.xlsx'):
            excel_path = os.path.join(data_path, file)
            with open(excel_path, 'r') as f:
                df = pd.read_excel(excel_path)
                df = df[['Criteria', 'Weight','Type','Level']]
                role = file.split('.')[0]
                df_arr[role] = df
    return df_arr

def crud_kpi_criterias(
                        crud_json, role, 
                        operation = 'add' # ['add', 'delete', 'update']
                        ):
    try:
        json_arr = load_json_files()
        df_arr = load_csv_files()
        if operation == 'add':
            df_role = df_arr[role]
            if crud_json['criteria'] in df_role['Criteria'].values:
                return "Criteria Already Exists !!!"
            
            df_weights = pd.DataFrame({
                                    'Criteria' : [crud_json['criteria']],
                                    'Weight' : [crud_json['weight']],
                                    'Level' : [crud_json['level']],
                                    'Type' : [crud_json['type']]
                                    })
            df_role = pd.concat([df_role, df_weights], axis = 0)
            
            json_role, json_role_path = json_arr[role]
            json_role[crud_json["type"]][crud_json["criteria"]] = crud_json["level"]


        elif operation == 'delete':
            df_role = df_arr[role]
            if crud_json['criteria'] not in df_role['Criteria'].values:
                return "Criteria Does Not Exists !!!"
            
            df_role = df_role[df_role['Criteria'] != crud_json['criteria']]
            
            json_role, json_role_path = json_arr[role]
            del json_role[crud_json["type"]][crud_json["criteria"]]
            

        elif operation == 'update':
            df_role = df_arr[role]
            if crud_json['criteria'] not in df_role['Criteria'].values:
                return "Criteria Does Not Exists !!!"
            
            df_role.loc[df_role['Criteria'] == crud_json['criteria'], 'Weight'] = crud_json['weight']
            
            json_role, json_role_path = json_arr[role]
            json_role[crud_json["type"]][crud_json["criteria"]] = crud_json["level"]
            

        with open(json_role_path, 'w') as f:
            json.dump(json_role, f)

        # recalculate the weights
        # df_role['Weight'] = df_role['Weight'] / df_role['Weight'].sum()
        df_role.to_excel(
                        f'data/KPI/weights/{role}.xlsx', 
                        index = False
                        )
        return "CRUD Operation Successful !!!"

    except Exception as e:
        return str(e)

def apply_kpi_level(
        row, 
        json_role_updated=None
):
    weight = row['Weight']
    criteria = row['Criteria'].replace('\\/', '-').replace('\\', '').replace('/', '-')
    level = row['Level']

    # List of criteria to skip calculation
    skip_criteria = ["Name", "Phone Number", "Home Town", "Age"]

    # Check if criteria is in the skip list
    if criteria in skip_criteria:
        return 0  # or return None, depending on your requirements

    # Perform the calculation
    value = json_role_updated.get(criteria, {}).get(level, 0)  # Use .get() for safety
    return value * weight

def apply_kpi_level_2(
                    row, 
                    json_role_updated=None
                    ):
    weight = row['Weight']
    criteria = row['Criteria'].replace('\\/', '-').replace('\\', '').replace('/', '-')
    level = row['Level']
    value = json_role_updated[criteria][level]
    return value * weight


def calculate_kpi_value(
                        role,
                        criteria_json
                        ):

    df_arr = load_csv_files()
        
    json_arr = load_json_files()

    df_role = df_arr[role]
    df_role['Criteria'] = df_role['Criteria'].str.replace('\\/', '-').str.replace('\\', '').str.replace('/', '-')
    json_role = json_arr[role][0]
    json_role_updated = {}
    for _, value in json_role.items():
        for k, v in value.items():
            json_role_updated[k] = v
    criteria_df = pd.DataFrame(
                                criteria_json, 
                                index=[0]
                                ).T
    criteria_df = criteria_df.reset_index()
    criteria_df.columns = ['Criteria', 'Level']
    criteria_df['Criteria'] = criteria_df['Criteria'].str.strip()
    criteria_df['Level'] = criteria_df['Level'].str.strip()
    criteria_df = criteria_df.merge(
                                    df_role, 
                                    on = 'Criteria', 
                                    how = 'left'
                                    )
    criteria_df['Weight'] = criteria_df['Weight'].fillna(0)
    criteria_df['KPI'] = criteria_df.apply(apply_kpi_level, axis = 1, json_role_updated=json_role_updated)
    kpi_value = criteria_df['KPI'].sum()
    return kpi_value

def calculate_kpi_sheet(
                        role, domain,
                        employee_file_path = 'data/KPI/employees.xlsx'
                        ):
    df_kpi = {}
    df_kpi['EmpID'] = []
    df_kpi['Domain'] = []
    df_kpi['Role'] = []
    df_kpi['KPI'] = []

    df_role_values = pd.read_excel(
                                    employee_file_path,
                                    sheet_name=role
                                    )
    df_role_values = df_role_values[df_role_values['Domain'] == domain]
    df_role_values.reset_index(drop=True, inplace=True)

    for i in range(df_role_values.shape[0]):

        criteria_json = eval(df_role_values.loc[i, :].to_json())
         # Remove specified fields
        for key in ['Name', 'Home Town', 'Phone Number', 'Age']:
            if key in criteria_json:
                del criteria_json[key]
        criteria_json = {k.replace('\\/', '-').replace('\\', '').replace('/', '-'): v for k, v in criteria_json.items()}
        emp_id = criteria_json['EMP ID']
        domain = criteria_json['Domain']
        del criteria_json['EMP ID'], criteria_json['Domain']

        kpi_value = calculate_kpi_value(
                                        role,
                                        criteria_json
                                        )
        df_kpi['KPI'].append(kpi_value)
        df_kpi['Domain'].append(domain)
        df_kpi['EmpID'].append(emp_id)
        df_kpi['Role'].append(role)

    df_kpi = pd.DataFrame(df_kpi)
    df_kpi = df_kpi[[
                    'EmpID',
                    'Role',
                    'KPI'
                    ]]
    return df_kpi
        
def inference_complexity(data_json):
    # Normalize known UI variants before encoding.
    # Encoder classes expect "E-commerce" (lowercase c), while UI uses "E-Commerce".
    domain_norm = {
        "E-Commerce": "E-commerce",
        "Ecommerce": "E-commerce",
    }
    if isinstance(data_json, dict):
        data_json = data_json.copy()
        data_json["Domain"] = domain_norm.get(data_json.get("Domain"), data_json.get("Domain"))

    complexity_prompt_template = [
                            ChatMessage(
                                role=MessageRole.SYSTEM,
                                content="""
                                        You are a helpful AI assistant that expertise in project management. You have provided below infomation about the project. The fileds in the data contains the following information
                                        
                                        Domain : E-Commerce / Health / Education / Finance}
                                        ML Components : Prediction Model / Recommendation Engine / Classification Model / Clustering Algorithm
                                        Backend : Node.js / Django / Flask / Spring Boot
                                        Frontend : React / Angular / Vue.js / Svelte
                                        Core Features : User Management / Payment Gateway / Product Catalog / Appointment Booking
                                        Tech Stack : MERN / MEAN / LAMP / Serverless
                                        Project Scope : Small / Medium / Large
                                        Mobile : {0 : No Mobile App Development, 1 : Mobile App Development Included}
                                        Desktop : {0 : No Desktop App Development, 1 : Desktop App Development Included}
                                        Web : {0 : No Web App Development, 1 : Web App Development Included}
                                        IoT : {0 : No IoT Development, 1 : IoT Development Included}
                                        Date_Difference : Difference between the planned end date vs the actual end date.
                                        Expected Team Size : Expected team size for the project.
                                        Expected Budget : Expected budget for the project.
                                        Risk : {0 : Low Risk, 1 : Medium Risk, 2 : High Risk}

                                        Your goal is to devide provided `Expected Team Size` into the roles of the team members. The roles are as follows:
                                        1. Business Analyst
                                        2. Backend Engineer
                                        3. DevOps Engineer
                                        4. Frontend Engineer
                                        5. FullStack Engineer
                                        6. Project Manager
                                        7. Quality Assurance Engineer
                                        8. Tech Lead

                                        Provide the output in JSON format.
                                        """,
                            ),
                            ChatMessage(
                                        role=MessageRole.USER, 
                                        content=str(data_json)
                                        )
                            ]
  
    domain = data_json['Domain']

    sample_df = pd.DataFrame(data_json, index=[0])

    sample_df = sample_df[[
                            'Domain', 'ML Components', 
                            'Backend', 'Frontend', 'Core Features', 
                            'Tech Stack', 'Project Scope'
                            ]]
    
    sample_df = sample_df.apply(lambda x: encoder_dict[x.name].transform(x))

    sample_df = sample_df.values

    prediction = rfc.predict(sample_df)

    prediction = str(encoder_dict['Complexity Level'].inverse_transform(prediction).squeeze())


    df_occupied = pd.read_excel('data/KPI/occupied.xlsx')

    df_unoccupied = df_occupied[df_occupied['IsOccupied'] != 1]

    del df_unoccupied['IsOccupied']

    max_retries = 3
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            if llm is None:
                total_team = int(data_json.get("Expected Team Size", 8) or 8)
                total_team = max(8, total_team)
                selected_team = {
                    "Business Analyst": 1,
                    "Backend Engineer": max(1, int(total_team * 0.2)),
                    "DevOps Engineer": 1,
                    "Frontend Engineer": max(1, int(total_team * 0.2)),
                    "FullStack Engineer": max(1, int(total_team * 0.2)),
                    "Project Manager": 1,
                    "Quality Assurance Engineer": max(1, int(total_team * 0.15)),
                    "Tech Lead": 1,
                }
            else:
                response = llm.chat(complexity_prompt_template)
                raw_team = str(response.message.content).strip()
                try:
                    selected_team = json.loads(raw_team)
                except Exception:
                    selected_team = ast.literal_eval(raw_team)

            selected_employees = []
            for role, count in selected_team.items():
                df_unoccupied_role = df_unoccupied[df_unoccupied['role'] == role]
                del df_unoccupied_role['role']
                unoccupied_empids = list(df_unoccupied_role['EMP ID'])
                df_kpi_role = calculate_kpi_sheet(role, domain)
                df_kpi_role = df_kpi_role[df_kpi_role['EmpID'].isin(unoccupied_empids)]
                df_kpi_role = df_kpi_role.sort_values(by = 'KPI', ascending = False)
                df_kpi_role = df_kpi_role.iloc[:count, :]
                selected_employees_ids = list(df_kpi_role['EmpID'])
          
                for emp_id_ in selected_employees_ids:
                    emp_dict_temp = {}
              
                    kpi = df_kpi_role[df_kpi_role['EmpID'] == emp_id_]['KPI'].values[0]
                    emp_dict_temp['Emp ID'] = emp_id_
                    emp_dict_temp['Role'] = role
                    emp_dict_temp['KPI'] = kpi

                    selected_employees.append(emp_dict_temp)

            return selected_team, selected_employees, prediction
        except Exception as e:
            last_error = e
            print(f"[complexity] attempt {attempt}/{max_retries} failed: {e}")

    # graceful fallback after bounded retries
    print(f"[complexity] all retries failed; returning empty allocation. last_error={last_error}")
    fallback_team = {
        "Business Analyst": 1,
        "Backend Engineer": 1,
        "DevOps Engineer": 1,
        "Frontend Engineer": 1,
        "FullStack Engineer": 1,
        "Project Manager": 1,
        "Quality Assurance Engineer": 1,
        "Tech Lead": 1,
    }
    return fallback_team, [], prediction

def kpi_for_employee(
                    emp_id, role,
                    employee_file_path = 'data/KPI/employees.xlsx'
                    ):
    df_employee = pd.read_excel(employee_file_path, sheet_name=role)
    df_employee = df_employee[df_employee['EMP ID'] == emp_id]
    df_employee.reset_index(drop=True, inplace=True)
    kpis = []
    for i in range(df_employee.shape[0]):
        criteria_json = eval(df_employee.loc[i, :].to_json())
        criteria_json = {k.replace('\\/', '-').replace('\\', '').replace('/', '-'): v for k, v in criteria_json.items()}
        emp_id = criteria_json['EMP ID']
        domain = criteria_json['Domain']
        name = criteria_json.get('Name')  # Added
        age = criteria_json.get('Age')  # Added
        hometown = criteria_json.get('Home Town')  # Added
        phone_number = criteria_json.get('Phone Number')  # Added
        del criteria_json['EMP ID'], criteria_json['Domain']
        kpi_value = calculate_kpi_value(
                                        role,
                                        criteria_json
                                        )
        kpis.append({
                    'KPI': kpi_value,
                    'Domain': domain,
                    'Name': name,
                    'Age': age,
                    'Home Town': hometown,
                    'Phone Number': phone_number
                    })
        
    return kpis

def insert_employee(
                    insert_json, role, 
                    employee_file_path = 'data/KPI/employees.xlsx'
                    ):
    df_employee = pd.read_excel(
                                employee_file_path, 
                                sheet_name=role, 
                                engine='openpyxl'
                                )
    columns = df_employee.columns.values
    empids = list(df_employee['EMP ID'].unique())
    empids_ = [int(empid[2:]) for empid in empids]
    emp_prefix = empids[0][:2]
    max_empid = max(empids_)
    new_empid = f'{emp_prefix}{max_empid + 1}'
    insert_json['EMP ID'] = new_empid

    user_new_dict = {}
    for col in columns:
        user_new_dict[col] = []

    for i in range(4):
        for col in columns:
            if col == 'Domain':
                pass
            elif col != "Experience of related Domain":
                user_new_dict[col].append(insert_json[col])
            else:
                user_new_dict[col].append(insert_json[col][i]['Years'])
                user_new_dict['Domain'].append(insert_json[col][i]['Domain'])

    df_user_new = pd.DataFrame(user_new_dict)
    df_role_specified = pd.concat([df_employee, df_user_new], axis=0)

    df_role_dict = {}
    for role_ in roles:
        if role_ != role:
            df_role_dict[role_] = pd.read_excel(
                                                employee_file_path, 
                                                sheet_name=role_, 
                                                engine='openpyxl'
                                                )
        else:
            df_role_dict[role_] = df_role_specified

    with pd.ExcelWriter(employee_file_path) as writer:  
        for role_, df_role_ in df_role_dict.items():
            df_role_.to_excel(writer, sheet_name=role_, index=False)

def inference_sdlc(
                    data_json,
                    input_columns = [
                                    'Domain', 'Expected Team Size', 'Team Experience', 'Web', 'Mobile',
                                    'IoT', 'Desktop', 'Requirement specifity', 'Expected Budget',
                                    'Complexity'
                                    ],
                    output_columns = [
                                    'Planning', 
                                    'Design', 'Requirements Analysis', 
                                    'Coding', 'Testing', 'Deployment', 'Maintenance'
                                    ]
                                    ):
    data = pd.DataFrame(
                        data_json, 
                        index=[0]
                        )
    data = data[input_columns]
    data_cat = data.select_dtypes(include=['object'])
    data_num = data.select_dtypes(exclude=['object'])
    data_cat_encoded = data_cat.apply(lambda x: encoder_dict_sdlc[x.name].transform(x))
    data = pd.concat([data_num, data_cat_encoded], axis=1)
    data = data.reindex(columns=input_columns)
    P = xgb_sdlc.predict(data).squeeze()
    P = np.round(P).astype(int) + 1
    return dict(zip(output_columns, P.T))

def recalc_time_with_risk(
                        mitigation,
                        base_time_dict
                        ):
    recal_prompt_template = [
                            ChatMessage(
                                role=MessageRole.SYSTEM,
                                content=f"""
                                        You are a helpful AI assistant that expertise in project management. You have provided identified risk / issues and ways to mitigate the risk levels in step by step.

                                        Your goal is to provide below information. All the delays and time recalculations should be provide in days. 

                                        You have provided Base Time Allocation for each of the seven phases of Software Development Life Cycle (SDLC) of the project is Indicated in Below JSON

                                        {base_time_dict}

                                        1. Time delay because of the risk for each of the seven phases of SDLC
                                        2. Areas that risk effect on each of the seven phases of SDLC
                                        3. Time delay because of the effect on each of the seven phases of SDLC
                                        4. Based on the mitigation plan, amount of time that can be saved
                                        """,
                            ),
                            ChatMessage(
                                        role=MessageRole.USER, 
                                        content=str(mitigation) + f"""
                                        As the final step, please provide below information.
                                        
                                        Total Time for Base Time Allocation : {sum(base_time_dict.values())}
                                        Total Time after Risk and Mitigation : """
                                        )
                            ]
    
    if llm is None:
        base_total = sum(base_time_dict.values())
        est_delay = max(1, int(base_total * 0.1))
        est_saved = max(1, int(base_total * 0.06))
        return (
            "LLM unavailable, generated heuristic timeline summary.\n\n"
            f"Base SDLC total: {base_total} days\n"
            f"Estimated delay from risk factors: {est_delay} days\n"
            f"Estimated time saved after mitigation: {est_saved} days\n"
            f"Estimated final total: {base_total + est_delay - est_saved} days"
        )

    response = llm.chat(recal_prompt_template)
    response = str(response.message.content)
    return response

def sdlc_pipeline(data_json):
    risk_level = inference_risk(data_json)[-1]
    complexity_level = inference_complexity(data_json)[-1]
    data_json_sdlc = data_json.copy()
    data_json_sdlc["Complexity"] = complexity_level
    sdlc_dict = inference_sdlc(data_json_sdlc)

    data_json_risk = data_json_sdlc.copy()
    data_json_risk['Risk'] = risk_level
    response = recalc_time_with_risk(
                                    mitigation = sdlc_dict, 
                                    base_time_dict = sdlc_dict
                                    )
    return response

@app.route('/register', methods=['POST'])
def register():
    data_json = request.json
    firstname = data_json['firstname']
    lastname = data_json['lastname']
    email = data_json['email']
    password = data_json['password']

    user_data = {
                "firstname" : f"{firstname}",
                "lastname" : f"{lastname}",
                "email" : f"{email}",
                "password" : generate_password_hash(f"{password}")
                }
    
    if not os.path.exists('data/users.json'):
        with open('data/users.json', 'w') as f:
            json.dump([], f)

    with open('data/users.json', 'r') as f:
        users = json.load(f)

    for user in users:
        if user['email'] == email:
            return jsonify({
                            "response" : "User Already Exists !!!",
                            "status" : 400
                            })  

    users.append(user_data)
    with open('data/users.json', 'w') as f:
        json.dump(users, f)

    return jsonify({
                    "response" : "User Registered Successfully !!!",
                    "status" : 200
                    })  

@app.route('/login', methods=['POST'])
def login():
    data_json = request.json
    email = data_json['email']
    password = data_json['password']

    with open('data/users.json', 'r') as f:
        users = json.load(f)

    for user in users:
        stored_pw = user.get('password', '')
        pw_ok = False
        # Backward compatibility for existing plain-text users.
        if isinstance(stored_pw, str) and stored_pw.startswith("pbkdf2:"):
            pw_ok = check_password_hash(stored_pw, password)
        else:
            pw_ok = stored_pw == password
        if user['email'] == email and pw_ok:
            return jsonify({
                            "response" : "User Logged In Successfully !!!",
                            "status" : 200,
                            "token": issue_token(email),
                            "user": {
                                "email": email,
                                "firstname": user.get("firstname", ""),
                                "lastname": user.get("lastname", "")
                            }
                            })

    return jsonify({
                    "response" : "Invalid Credentials !!!",
                    "status" : 400
                    })
        
@app.route('/risk', methods=['POST'])
@auth_required
def risk():
    data_json = request.json
    response_risk, prediction_risk, mitigation_steps = inference_risk(data_json)
    return jsonify({
                    'risk' : response_risk,
                    'mitigation' : prediction_risk,
                    # mitigation_steps contains only the portion of the LLM reply under the
                    # "Mitigation Steps" heading so the front end can render it separately.
                    'mitigation_steps': mitigation_steps
                    })

@app.route('/employee/all', methods=['GET'])
@auth_required
def employee_all():
    all_emp_dict = {}
    all_emp_dict['Emp ID'] = []
    all_emp_dict['Role'] = []

    for role in roles:
        df_role = pd.read_excel('data/KPI/employees.xlsx', sheet_name=role)
        emp_ids = list(df_role['EMP ID'].unique())
        all_emp_dict['Emp ID'].extend(emp_ids)
        all_emp_dict['Role'].extend([role] * len(emp_ids))

    all_emp_df = pd.DataFrame(all_emp_dict)
    all_emp_df = all_emp_df[[
                            'Emp ID',
                            'Role'
                            ]]
    all_emp_df = eval(all_emp_df.to_json(orient='records'))
    return jsonify({
                    'employees' : all_emp_df
                    })

@app.route('/complexity', methods=['POST'])
@auth_required
def complexity():
    data_json = request.json
    selected_team, selected_employees, prediction_complexity= inference_complexity(data_json)
    return jsonify({
                    'selected_team' : selected_team,
                    'selected_employees' : selected_employees,
                    'complexity' : prediction_complexity
                    })

@app.route('/sdlc', methods=['POST'])
@auth_required
def sdlc():
    data_json = request.json
    response_sdlc = sdlc_pipeline(data_json)
    return jsonify({
                    'sdlc' : response_sdlc
                    })

@app.route('/kpi/crud', methods=['POST'])
@auth_required
def kpi_crud():
    crud_json_data = request.json
    response = crud_kpi_criterias(
                                crud_json_data['crud_json'], 
                                crud_json_data['role'],
                                operation = crud_json_data['operation']
                                )
    return jsonify({
                    "response" : response
                    })


@app.route('/delete-row', methods=['DELETE'])
@auth_required
def delete_row():
    try:
        # Get the name from the request args
        name_to_delete = request.args.get('name')
        role_to_delete = request.args.get('role')
        
        if not name_to_delete:
            return jsonify({'error': 'Name is required'}), 400

        # Read the Excel file
        df = pd.read_excel(f'./data/KPI/weights/{role_to_delete}.xlsx')

        # Check if the name exists
        if name_to_delete not in df['Criteria'].values:
            return jsonify({'error': 'Name not found'}), 404

        # Drop the row(s) that match the name criteria
        df = df[df['Criteria'] != name_to_delete]

        # Save the updated DataFrame back to Excel
        df.to_excel(f'./data/kpi/weights/{role_to_delete}.xlsx',index=False)

        return jsonify({'message': f'Skill Deleted'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/kpi/role', methods=['POST'])
@auth_required
def kpi_sheet():
    data_json = request.json
    df_kpi = calculate_kpi_sheet(
                                data_json['role'],
                                data_json['domain']
                                )
    df_kpi = eval(df_kpi.to_json(orient='records'))
    return jsonify({
                    "kpis" : df_kpi
                    })

@app.route('/kpi/employee', methods=['POST'])
@auth_required
def kpi_employee():
    data_json = request.json
    kpis = kpi_for_employee(
                            data_json['emp_id'],
                            data_json['role']
                            )
    return jsonify({
                    "kpis" : kpis
                    })

@app.route('/employee/insert', methods=['POST'])
@auth_required
def employee_insert():
    data_json = request.json
    insert_employee(data_json['insert_json'], data_json['role'])
    return jsonify({
                    "response" : "Employee Inserted Successfully !!!"
                    })

EXCEL_FILE_PATH = './data/KPI/projects.xlsx'

@app.route('/save-data', methods=['POST'])
@auth_required
def update_or_save_data():
    try:
        # Get JSON data from request
        data = request.get_json()

        # Check if the data is a dictionary
        if not isinstance(data, dict):
            return jsonify({'error': 'Data format is invalid. Expected a dictionary.'}), 400

        # Update or save data to the Excel file
        update_data_in_excel(data)
        
        return jsonify({'message': f'Data successfully updated or appended to {EXCEL_FILE_PATH}'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def update_data_in_excel(data):
    # Check if the file exists
    if os.path.exists(EXCEL_FILE_PATH):
        # If the file exists, read the existing data into a DataFrame
        existing_df = pd.read_excel(EXCEL_FILE_PATH, engine='openpyxl')

        # Check if the 'Name' column exists
        if 'Name' not in existing_df.columns:
            raise ValueError("The 'Name' column is missing in the Excel file.")
        
        # Check if the project name already exists
        if data.get('Name') in existing_df['Name'].values:
            # Update the existing row
            existing_df.update(pd.DataFrame([data], index=[existing_df[existing_df['Name'] == data['Name']].index[0]]))
        else:
            # Convert the new data (dictionary) to a DataFrame
            new_data_df = pd.DataFrame([data])
            # Append the new data to the existing data
            existing_df = pd.concat([existing_df, new_data_df], ignore_index=True)

    else:
        # If the file doesn't exist, create a new DataFrame
        existing_df = pd.DataFrame([data])

    # Save the updated DataFrame back to the Excel file
    existing_df.to_excel(EXCEL_FILE_PATH, index=False, engine='openpyxl')

BASE_DIR = './data/KPI/weights/'

def read_excel_file(file_name):
    file_path = os.path.join(BASE_DIR, file_name)
    
    if os.path.exists(file_path):
        # Read the Excel file using pandas
        df = pd.read_excel(file_path)
        return df.to_dict(orient='records')
    else:
        return None
    
@app.route('/get-data', methods=['GET'])
@auth_required
def get_data():
    file_name = request.args.get('file_name')  # Get the file name from query params
    
    if not file_name:
        return jsonify({'error': 'No file name provided'}), 400
    
    data = read_excel_file(file_name)  # Fetch data from Excel

    if data is not None:
        return jsonify(data)  # Return data as JSON
    else:
        return jsonify({'error': f'File {file_name} not found'}), 404
    
@app.route('/get-projects', methods=['GET'])
@auth_required
def get_projects():
    try:
        # Check if the file exists
        if not os.path.exists(EXCEL_FILE_PATH):
            return jsonify({'error': 'Excel file not found.'}), 404

        # Read the Excel file into a DataFrame
        df = pd.read_excel(EXCEL_FILE_PATH, engine='openpyxl')

        # Convert DataFrame to a list of dictionaries (JSON-like format)
        data = df.to_dict(orient='records')
        
        return jsonify(data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(
            debug=True, 
            port=5001
            )
