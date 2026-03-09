import numpy as np
import pandas as pd
import os, pickle, json
import sys
import ast
from flask_cors import CORS
from flask import Flask, request, jsonify
from llama_index.core.llms import ChatMessage, MessageRole
from dotenv import load_dotenv
import traceback

try:
    from llama_index.llms.openai import OpenAI
except Exception:
    OpenAI = None

try:
    from gpt4all import GPT4All
except Exception:
    GPT4All = None

# Load environment variables from .env (excluded from source control)
load_dotenv()

# Add ML models path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_models', 'scripts'))

# Try to import ML predictor
try:
    from ml_prediction_service import KPIMLPredictor
    ml_predictor = KPIMLPredictor()
    print("✓ ML Models loaded successfully!")
    ML_AVAILABLE = True
except Exception as e:
    print(f"⚠ Warning: Could not load ML models: {e}")
    ml_predictor = None
    ML_AVAILABLE = False

app = Flask(__name__)
CORS(app)

class LocalLLM:
    def __init__(self, model):
        self.model = model

    def chat(self, messages, **kwargs):
        if len(messages) >= 2:
            prompt = messages[0].content + "\n" + messages[1].content
        else:
            prompt = "\n".join(m.content for m in messages)
        prompt += "\n\n### RESPONSE:\n"
        out = self.model.generate(prompt, max_tokens=1024)
        text = (out or "").strip()
        if "### RESPONSE:" in text:
            text = text.split("### RESPONSE:", 1)[1].strip()

        class Dummy:
            pass
        response = Dummy()
        response.message = Dummy()
        response.message.content = text
        return response


def _placeholder_key(value):
    if not value:
        return True
    norm = value.strip().strip('"').strip("'")
    return norm in {"YOUR_KEY_HERE", "your-api-key-here", ""}


def load_local_llm():
    if GPT4All is None:
        raise RuntimeError("gpt4all package is not installed.")
    local_model_name = os.environ.get("LOCAL_MODEL", "Llama-3.2-1B-Instruct-Q4_0.gguf")
    local_model_dir = os.environ.get("LOCAL_MODEL_DIR", os.path.join(os.getcwd(), "models"))
    allow_download = os.environ.get("LOCAL_ALLOW_DOWNLOAD", "0").lower() in {"1", "true", "yes"}
    model = GPT4All(local_model_name, model_path=local_model_dir, allow_download=allow_download)
    return LocalLLM(model)


def load_openai_llm():
    if OpenAI is None:
        raise RuntimeError("llama-index openai adapter is not installed.")
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if _placeholder_key(api_key):
        raise RuntimeError("OPENAI_API_KEY is missing or placeholder.")
    return OpenAI(
        engine=os.environ.get("OPENAI_MODEL", "gpt-4o"),
        temperature=0.3,
        max_tokens=1000
    )


def init_llm():
    provider = os.environ.get("LLM_PROVIDER", "openai").strip().lower()
    if provider == "none":
        print("LLM disabled (LLM_PROVIDER=none). Running heuristic fallback mode.")
        return None, "none"

    if provider == "local":
        try:
            llm_local = load_local_llm()
            print("LLM provider: local (gpt4all)")
            return llm_local, "local"
        except Exception as e:
            print(f"Local LLM unavailable: {e}")
            return None, "none"

    if provider == "openai":
        try:
            llm_openai = load_openai_llm()
            print("LLM provider: openai")
            return llm_openai, "openai"
        except Exception as e:
            print(f"OpenAI LLM unavailable: {e}")
            return None, "none"

    if provider == "auto":
        try:
            llm_openai = load_openai_llm()
            print("LLM provider(auto): openai")
            return llm_openai, "openai"
        except Exception as e_openai:
            print(f"OpenAI unavailable in auto mode: {e_openai}")
        try:
            llm_local = load_local_llm()
            print("LLM provider(auto): local")
            return llm_local, "local"
        except Exception as e_local:
            print(f"Local LLM unavailable in auto mode: {e_local}")
        return None, "none"

    print(f"Unknown LLM_PROVIDER='{provider}', using fallback mode.")
    return None, "none"


def llm_chat_or_fallback(messages, fallback_text):
    if llm is None:
        return fallback_text
    try:
        response = llm.chat(messages)
        text = str(response.message.content).strip()
        return text if text else fallback_text
    except Exception as e:
        print(f"LLM call failed, using fallback text: {e}")
        return fallback_text


def default_team_allocation(total_team):
    total_team = max(8, int(total_team or 8))
    return {
        "Business Analyst": 1,
        "Backend Engineer": max(1, int(total_team * 0.2)),
        "DevOps Engineer": 1,
        "Frontend Engineer": max(1, int(total_team * 0.2)),
        "FullStack Engineer": max(1, int(total_team * 0.2)),
        "Project Manager": 1,
        "Quality Assurance Engineer": max(1, int(total_team * 0.15)),
        "Tech Lead": 1,
    }


# OPENAI_API_KEY / LOCAL_MODEL / LLM_PROVIDER are loaded from .env
llm, ACTIVE_LLM_PROVIDER = init_llm()

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
                class_dict  = {
                                0 : 'Low',
                                1 : 'Medium',
                                2 : 'High'
                                },
                dataset_path = 'data/project_details.xlsx'
                ):
    risk_prompt_template = [
                            ChatMessage(
                                role=MessageRole.SYSTEM,
                                content="""
                                        You are a helpful AI assistant that expertise in project management. You have provided below infomation about the project. The fileds in the data contains the following information
                                        
                                        Domain : {1 : E-Commerce, 2 : Health, 3 : Education, 4 : Finance}
                                        Mobile : {0 : No Mobile App Development, 1 : Mobile App Development Included}
                                        Desktop : {0 : No Desktop App Development, 1 : Desktop App Development Included}
                                        Web : {0 : No Web App Development, 1 : Web App Development Included}
                                        IoT : {0 : No IoT Development, 1 : IoT Development Included}
                                        Expected Team Size : Expected team size for the project.
                                        Expected Budget : Expected budget for the project.
                                        Risk : {0 : Low Risk, 1 : Medium Risk, 2 : High Risk}

                                        Higher Risk means building more than one type of application (Desktop, Web, Mobile, IoT) with lower budget and smaller team size.

                                        Using the provided risk level of the project find the issues / problems that project facing and the ways to mitigate the risk levels in step by step
                                        """,
                            ),
                            ChatMessage(role=MessageRole.USER, content=str(data_json))
                            ]
                
    raw_payload = data_json.copy() if isinstance(data_json, dict) else {}
    if isinstance(data_json, dict):
        data_json = data_json.copy()
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

        # Keep mapping used by the retrained model input.
        if data_json.get("Domain") == "E-commerce":
            data_json["Domain"] = "E-Commerce"

    data = pd.DataFrame(data_json, index=[0])
    data = data[[
                'Domain', 'Mobile', 'Desktop', 
                'Web', 'IoT', 'Expected Team Size', 'Expected Budget'
                ]]
        
    data_json = {k : v for k, v in data_json.items() if k in data.columns}
    data['Domain'] = data['Domain'].map({
                                        'E-Commerce':1, 
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
    match_index = match_flag[match_flag.all(axis=1)].index.values
    xgb_features = [
        'Domain', 'Mobile', 'Desktop',
        'Web', 'IoT', 'Expected Team Size', 'Expected Budget'
    ]
    if len(match_index) > 0:
        match_index = match_index[0]
        row = df_pj.iloc[match_index]
        risk = int(row['Risk']) - 1
        prediction = class_dict[risk]
    else:
        prediction = xgb.predict(data[xgb_features])[0]
        prediction = class_dict[prediction]
        
    data_json_updated = data_json.copy()
    data_json_updated['Risk'] = prediction

    base_feature_row = data[xgb_features].iloc[0].copy()

    def estimate_min_budget_for_target(target_class):
        try:
            row = base_feature_row.copy()
            current_budget = int(max(float(row['Expected Budget']), 1000))

            # Coarse scan first for speed.
            found = None
            upper = 250000
            for budget in range(current_budget, upper + 1, 5000):
                row['Expected Budget'] = budget
                pred_class = int(xgb.predict(pd.DataFrame([row], columns=xgb_features))[0])
                if pred_class == target_class:
                    found = budget
                    break

            if found is None:
                return None

            # Fine scan to get near-minimum.
            floor = max(current_budget, found - 5000)
            for budget in range(floor, found + 1, 1000):
                row['Expected Budget'] = budget
                pred_class = int(xgb.predict(pd.DataFrame([row], columns=xgb_features))[0])
                if pred_class == target_class:
                    return budget
            return found
        except Exception:
            return None

    def build_risk_sections(payload, level):
        budget = float(payload.get("Expected Budget") or payload.get("Expected_Budget") or 0)
        team_size = float(payload.get("Expected Team Size") or payload.get("Expected_Team_Size") or 0)
        platform_count = sum(int(payload.get(k, 0) or 0) for k in ["Mobile", "Desktop", "Web", "IoT"])
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

        suggested_budget_low = estimate_min_budget_for_target(0)
        suggested_budget_medium = estimate_min_budget_for_target(1)
        suggested_team_size = max(
            4,
            int(platform_count * 2),
            int(2 + (1 if ml_component else 0) + (1 if domain in {"Finance", "Health"} else 0) + (1 if project_scope in {"wide", "large"} else 0))
        )

        if budget and budget <= 20000:
            factors.append(f"- Budget pressure: expected budget ({int(budget)}) is critically low for delivery risk.")
            actions.append("- Increase project budget baseline to a realistic level before full-scope execution.")
            if suggested_budget_low:
                actions.append(
                    f"- Suggested minimum budget for Low risk (keeping current team size {int(team_size) if team_size else 0}): ${suggested_budget_low:,}."
                )
            elif suggested_budget_medium:
                actions.append(
                    f"- Low risk is not reachable by budget-only change in tested range; to reduce risk quickly, target at least ${suggested_budget_medium:,} for Medium risk and increase team capacity."
                )
            actions.append("- Freeze scope to a strict MVP and defer all non-critical features.")
            actions.append("- Allocate a hard contingency reserve (10-15%) before starting development.")
        elif budget and budget < 150000:
            factors.append(f"- Budget pressure: expected budget ({int(budget)}) may limit contingency.")
            actions.append("- Prioritize MVP features and stage the roadmap in funded phases.")
            if suggested_budget_low and suggested_budget_low > int(budget):
                actions.append(f"- Suggested minimum budget for Low risk: ${suggested_budget_low:,}.")
            elif suggested_budget_medium and suggested_budget_medium > int(budget):
                actions.append(f"- Suggested budget for Medium risk: ${suggested_budget_medium:,}.")

        if team_size and team_size <= 2:
            factors.append(f"- Team capacity: team size ({int(team_size)}) is critically low for scope.")
            actions.append("- Increase core team size (engineering, QA, and PM coverage) before scaling delivery.")
            actions.append(f"- Suggested minimum team size: at least {suggested_team_size} members for current scope.")
            actions.append("- Reduce active workstreams to one platform and one release at a time.")
            actions.append("- Add minimum external support/part-time specialists for QA and DevOps.")
        elif team_size and team_size < 25:
            factors.append(f"- Team capacity: team size ({int(team_size)}) may be tight for scope.")
            actions.append("- Add weekly capacity checks and rebalance workload by priority.")
            if suggested_team_size > int(team_size):
                actions.append(f"- Suggested team size: increase to ~{suggested_team_size} members to reduce delivery pressure.")

        if platform_count >= 3:
            factors.append(f"- Platform breadth: {platform_count} platforms increase coordination and testing overhead.")
            actions.append("- Deliver single-platform MVP first, then expand in sequenced releases.")
        elif platform_count == 2:
            factors.append("- Multi-platform scope: two platforms require tighter planning and shared components.")
            actions.append("- Use shared APIs/components and lock interface contracts early.")

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

        if budget and budget <= 20000 and team_size and team_size <= 2:
            actions.append("- Re-baseline timeline and secure stakeholder sign-off on reduced scope.")
            actions.append("- Add weekly go/no-go checkpoints with explicit risk acceptance decisions.")

        if not factors:
            factors.append("- Inputs indicate manageable constraints with standard delivery risk.")
            actions.append("- Maintain standard QA, milestone reviews, and stakeholder updates.")

        factors = list(dict.fromkeys(factors))
        actions = list(dict.fromkeys(actions))

        analysis = (
            f"The risk model predicted **{level}** risk. The drivers above are computed from the "
            "submitted profile (domain, scope, requirements, team experience, stack, ML component, "
            "platform breadth, budget, and team size)."
        )
        risk_section = "\n".join([
            "### Risk Factors",
            *factors,
            "",
            "### Analysis",
            analysis
        ])
        mitigation_steps = "\n".join([
            "### Mitigation Steps",
            *actions
        ])
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

def load_csv_files(data_path = 'data/KPI/weights/'):
    df_arr = {}
    files = os.listdir(data_path)
    for file in files:
        if file.endswith('.xlsx'):
            excel_path = os.path.join(data_path, file)
            with open(excel_path, 'r') as f:
                df = pd.read_excel(excel_path)
                df = df[['Criteria', 'Weight','Type']]
                role = file.split('.')[0]
                df_arr[role] = df
    return df_arr

def crud_kpi_criterias(crud_json, role, operation = 'add'):
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
        df_role.to_excel(f'data/KPI/weights/{role}.xlsx', index = False)
        return "CRUD Operation Successful !!!"
    except Exception as e:
        return str(e)

def apply_kpi_level(row, json_role_updated=None):
    weight = row['Weight']
    criteria = row['Criteria'].replace('/', '-').replace('\\', '')
    level = row['Level']
    skip_criteria = ["Name", "Phone Number", "Home Town", "Age"]
    if criteria in skip_criteria:
        return 0
    value = json_role_updated.get(criteria, {}).get(level, 0)
    return value * weight

def calculate_kpi_value(role, criteria_json):
    df_arr = load_csv_files()
    json_arr = load_json_files()
    df_role = df_arr[role]
    df_role['Criteria'] = df_role['Criteria'].str.replace('\\/', '-').str.replace('\\', '').str.replace('/', '-')
    json_role = json_arr[role][0]
    json_role_updated = {}
    for _, value in json_role.items():
        for k, v in value.items():
            json_role_updated[k] = v
    criteria_df = pd.DataFrame(criteria_json, index=[0]).T
    criteria_df = criteria_df.reset_index()
    criteria_df.columns = ['Criteria', 'Level']
    criteria_df['Criteria'] = criteria_df['Criteria'].str.strip()
    criteria_df['Level'] = criteria_df['Level'].str.strip()
    criteria_df = criteria_df.merge(df_role, on = 'Criteria', how = 'left')
    criteria_df['Weight'] = criteria_df['Weight'].fillna(0)
    criteria_df['KPI'] = criteria_df.apply(apply_kpi_level, axis = 1, json_role_updated=json_role_updated)
    kpi_value = criteria_df['KPI'].sum()
    return kpi_value

def calculate_kpi_sheet(role, domain, employee_file_path = 'data/KPI/employees.xlsx'):
    df_kpi = {}
    df_kpi['EmpID'] = []
    df_kpi['Domain'] = []
    df_kpi['Role'] = []
    df_kpi['KPI'] = []
    df_role_values = pd.read_excel(employee_file_path, sheet_name=role)
    df_role_values = df_role_values[df_role_values['Domain'] == domain]
    df_role_values.reset_index(drop=True, inplace=True)
    for i in range(df_role_values.shape[0]):
        criteria_json = eval(df_role_values.loc[i, :].to_json())
        for key in ['Name', 'Home Town', 'Phone Number', 'Age']:
            if key in criteria_json:
                del criteria_json[key]
        criteria_json = {k.replace('/', '-').replace('\\', ''): v for k, v in criteria_json.items()}
        emp_id = criteria_json['EMP ID']
        domain = criteria_json['Domain']
        del criteria_json['EMP ID'], criteria_json['Domain']
        kpi_value = calculate_kpi_value(role, criteria_json)
        df_kpi['KPI'].append(kpi_value)
        df_kpi['Domain'].append(domain)
        df_kpi['EmpID'].append(emp_id)
        df_kpi['Role'].append(role)
    df_kpi = pd.DataFrame(df_kpi)
    df_kpi = df_kpi[['EmpID', 'Role', 'KPI']]
    return df_kpi
        
def inference_complexity(data_json):
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
                            ChatMessage(role=MessageRole.USER, content=str(data_json))
                            ]
    domain = data_json['Domain']
    sample_df = pd.DataFrame(data_json, index=[0])
    sample_df = sample_df[['Domain', 'ML Components', 'Backend', 'Frontend', 'Core Features', 'Tech Stack', 'Project Scope']]
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
                selected_team = default_team_allocation(data_json.get("Expected Team Size", 8))
            else:
                response_raw = llm.chat(complexity_prompt_template)
                raw_team = str(response_raw.message.content).strip()
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
                df_kpi_role = df_kpi_role.sort_values(by='KPI', ascending=False)
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

    print(f"[complexity] all retries failed; returning default team. last_error={last_error}")
    return default_team_allocation(data_json.get("Expected Team Size", 8)), [], prediction

def kpi_for_employee(emp_id, role, employee_file_path = 'data/KPI/employees.xlsx'):
    df_employee = pd.read_excel(employee_file_path, sheet_name=role)
    df_employee = df_employee[df_employee['EMP ID'] == emp_id]
    df_employee.reset_index(drop=True, inplace=True)
    kpis = []
    for i in range(df_employee.shape[0]):
        criteria_json = eval(df_employee.loc[i, :].to_json())
        criteria_json = {k.replace('/', '-').replace('\\', ''): v for k, v in criteria_json.items()}
        emp_id = criteria_json['EMP ID']
        domain = criteria_json['Domain']
        name = criteria_json.get('Name')
        age = criteria_json.get('Age')
        hometown = criteria_json.get('Home Town')
        phone_number = criteria_json.get('Phone Number')
        del criteria_json['EMP ID'], criteria_json['Domain']
        kpi_value = calculate_kpi_value(role, criteria_json)
        kpis.append({
                    'KPI': kpi_value,
                    'Domain': domain,
                    'Name': name,
                    'Age': age,
                    'Home Town': hometown,
                    'Phone Number': phone_number
                    })
    return kpis

def insert_employee(insert_json, role, employee_file_path = 'data/KPI/employees.xlsx'):
    df_employee = pd.read_excel(employee_file_path, sheet_name=role, engine='openpyxl')
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
            df_role_dict[role_] = pd.read_excel(employee_file_path, sheet_name=role_, engine='openpyxl')
        else:
            df_role_dict[role_] = df_role_specified
    with pd.ExcelWriter(employee_file_path) as writer:  
        for role_, df_role_ in df_role_dict.items():
            df_role_.to_excel(writer, sheet_name=role_, index=False)

def inference_sdlc(data_json, input_columns = ['Domain', 'Expected Team Size', 'Team Experience', 'Web', 'Mobile', 'IoT', 'Desktop', 'Requirement specifity', 'Expected Budget', 'Complexity'], output_columns = ['Planning', 'Design', 'Requirements Analysis', 'Coding', 'Testing', 'Deployment', 'Maintenance']):
    data = pd.DataFrame(data_json, index=[0])
    data = data[input_columns]
    data_cat = data.select_dtypes(include=['object'])
    data_num = data.select_dtypes(exclude=['object'])
    def safe_encode(series):
        """Encode a categorical series, mapping unseen labels to the first known class."""
        enc = encoder_dict_sdlc[series.name]
        known = set(enc.classes_)
        mapped = series.map(lambda v: v if v in known else enc.classes_[0])
        return enc.transform(mapped)

    data_cat_encoded = data_cat.apply(safe_encode)
    data = pd.concat([data_num, data_cat_encoded], axis=1)
    data = data.reindex(columns=input_columns)
    P = xgb_sdlc.predict(data).squeeze()
    P = np.round(P).astype(int) + 1
    return dict(zip(output_columns, P.T))

def recalc_time_with_risk(mitigation, base_time_dict):
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

    return llm_chat_or_fallback(
        recal_prompt_template,
        "Timeline recalculation fallback: could not reach active LLM provider."
    )

def sdlc_pipeline(data_json):
    risk_level = inference_risk(data_json)[1]
    complexity_level = inference_complexity(data_json)[-1]
    data_json_sdlc = data_json.copy()
    data_json_sdlc["Complexity"] = complexity_level
    sdlc_dict = inference_sdlc(data_json_sdlc)
    data_json_risk = data_json_sdlc.copy()
    data_json_risk['Risk'] = risk_level
    response = recalc_time_with_risk(mitigation = sdlc_dict, base_time_dict = sdlc_dict)
    return response,sdlc_dict

def update_data_in_excel(data):
    EXCEL_FILE_PATH = './data/KPI/projects.xlsx'
    if os.path.exists(EXCEL_FILE_PATH):
        existing_df = pd.read_excel(EXCEL_FILE_PATH, engine='openpyxl')
        if 'Name' not in existing_df.columns:
            raise ValueError("The 'Name' column is missing in the Excel file.")
        if data.get('Name') in existing_df['Name'].values:
            existing_df.update(pd.DataFrame([data], index=[existing_df[existing_df['Name'] == data['Name']].index[0]]))
        else:
            new_data_df = pd.DataFrame([data])
            existing_df = pd.concat([existing_df, new_data_df], ignore_index=True)
    else:
        existing_df = pd.DataFrame([data])
    existing_df.to_excel(EXCEL_FILE_PATH, index=False, engine='openpyxl')

def read_excel_file(file_name):
    BASE_DIR = './data/KPI/weights/'
    file_path = os.path.join(BASE_DIR, file_name)
    if os.path.exists(file_path):
        df = pd.read_excel(file_path)
        return df.to_dict(orient='records')
    else:
        return None

@app.route('/register', methods=['POST'])
def register():
    data_json = request.json
    user_data = {
                "firstname" : data_json['firstname'],
                "lastname" : data_json['lastname'],
                "email" : data_json['email'],
                "password" : data_json['password']
                }
    if not os.path.exists('data/users.json'):
        with open('data/users.json', 'w') as f:
            json.dump([], f)
    with open('data/users.json', 'r') as f:
        users = json.load(f)
    for user in users:
        if user['email'] == data_json['email']:
            return jsonify({"response" : "User Already Exists !!!", "status" : 400})  
    users.append(user_data)
    with open('data/users.json', 'w') as f:
        json.dump(users, f)
    return jsonify({"response" : "User Registered Successfully !!!", "status" : 200})  

@app.route('/login', methods=['POST'])
def login():
    data_json = request.json
    with open('data/users.json', 'r') as f:
        users = json.load(f)
    for user in users:
        if user['email'] == data_json['email'] and user['password'] == data_json['password']:
            return jsonify({
                "response": "User Logged In Successfully !!!", 
                "status": 200,
                "token": "dummy-token-for-app2",
                "user": user
            })
    return jsonify({"response" : "Invalid Credentials !!!", "status" : 400})
        
@app.route('/risk', methods=['POST'])
def risk():
    data_json = request.json
    response_risk, prediction_risk, mitigation_steps = inference_risk(data_json)
    return jsonify({
        'risk': response_risk,
        'mitigation': prediction_risk,
        'mitigation_steps': mitigation_steps
    })

@app.route('/employee/all', methods=['GET'])
def employee_all():
    all_emp_dict = {'Emp ID': [], 'Role': []}
    for role in roles:
        df_role = pd.read_excel('data/KPI/employees.xlsx', sheet_name=role)
        emp_ids = list(df_role['EMP ID'].unique())
        all_emp_dict['Emp ID'].extend(emp_ids)
        all_emp_dict['Role'].extend([role] * len(emp_ids))
    all_emp_df = pd.DataFrame(all_emp_dict)
    all_emp_df = all_emp_df[['Emp ID', 'Role']]
    return jsonify({'employees' : eval(all_emp_df.to_json(orient='records'))})

@app.route('/complexity', methods=['POST'])
def complexity():
    data_json = request.json
    selected_team, selected_employees, prediction_complexity= inference_complexity(data_json)
    return jsonify({'selected_team' : selected_team, 'selected_employees' : selected_employees, 'complexity' : prediction_complexity})

@app.route('/sdlc', methods=['POST'])
def sdlc():
    data_json = request.json
    response_sdlc, sdlc_dict = sdlc_pipeline(data_json)
    sdlc_dict = {key: int(value) if isinstance(value, (np.int64, int)) else value for key, value in sdlc_dict.items()}
    return jsonify({'sdlc': response_sdlc, 'base_time': sdlc_dict})

@app.route('/kpi/crud', methods=['POST'])
def kpi_crud():
    crud_json_data = request.json
    response = crud_kpi_criterias(crud_json_data['crud_json'], crud_json_data['role'], operation = crud_json_data['operation'])
    return jsonify({"response" : response})

@app.route('/kpi/role', methods=['POST'])
def kpi_sheet():
    data_json = request.json
    df_kpi = calculate_kpi_sheet(data_json['role'], data_json['domain'])
    return jsonify({"kpis" : eval(df_kpi.to_json(orient='records'))})

@app.route('/kpi/employee', methods=['POST'])
def kpi_employee():
    data_json = request.json
    kpis = kpi_for_employee(data_json['emp_id'], data_json['role'])
    return jsonify({"kpis" : kpis})

@app.route('/employee/insert', methods=['POST'])
def employee_insert():
    data_json = request.json
    insert_employee(data_json['insert_json'], data_json['role'])
    return jsonify({"response" : "Employee Inserted Successfully !!!"})

@app.route('/save-data', methods=['POST'])
def update_or_save_data():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({'error': 'Data format is invalid. Expected a dictionary.'}), 400
        update_data_in_excel(data)
        return jsonify({'message': 'Data successfully updated or appended'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-data', methods=['GET'])
def get_data():
    file_name = request.args.get('file_name')
    if not file_name:
        return jsonify({'error': 'No file name provided'}), 400
    data = read_excel_file(file_name)
    if data is not None:
        return jsonify(data)
    else:
        return jsonify({'error': f'File {file_name} not found'}), 404
    
@app.route('/get-projects', methods=['GET'])
def get_projects():
    try:
        EXCEL_FILE_PATH = './data/KPI/projects.xlsx'
        if not os.path.exists(EXCEL_FILE_PATH):
            return jsonify({'error': 'Excel file not found.'}), 404
        df = pd.read_excel(EXCEL_FILE_PATH, engine='openpyxl')
        return jsonify(df.to_dict(orient='records')), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# NEW ML ENDPOINTS
@app.route('/ml/predict_kpi', methods=['POST'])
def predict_employee_kpi():
    if not ML_AVAILABLE or ml_predictor is None:
        return jsonify({'status': 'error', 'message': 'ML models not loaded'}), 500
    try:
        data = request.json
        prediction = ml_predictor.predict_kpi_score(data)
        return jsonify({'status': 'success', 'prediction': prediction}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

@app.route("/ml/predict_team", methods=["POST"])
def predict_team():
    try:
        data = request.get_json()

        if not data or "team_members" not in data:
            return jsonify({"error": "team_members is required"}), 400

        team_members = data["team_members"]

        result = ml_predictor.predict_team_kpi(team_members)

        return jsonify({
            "team_prediction": result
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 400

@app.route('/ml/recommend_improvements', methods=['POST'])
def recommend_improvements():
    if not ML_AVAILABLE or ml_predictor is None:
        return jsonify({'status': 'error', 'message': 'ML models not loaded'}), 500
    try:
        data = request.json
        recommendations = ml_predictor.recommend_improvements(data)
        return jsonify({'status': 'success', 'recommendations': recommendations}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

@app.route('/ml/compare_methods', methods=['POST'])
def compare_prediction_methods():
    if not ML_AVAILABLE or ml_predictor is None:
        return jsonify({'status': 'error', 'message': 'ML models not loaded'}), 500
    try:
        data = request.json
        role = data.get('role')
        employee_data = data.get('employee_data')
        criteria_json = {k: v for k, v in employee_data.items() if k not in ['EMP_ID', 'EMP ID', 'Name', 'Phone Number', 'Home Town', 'Age', 'Domain']}
        rule_based_kpi = calculate_kpi_value(role, criteria_json)
        ml_prediction = ml_predictor.predict_kpi_score(employee_data)
        ml_kpi = ml_prediction['predicted_kpi_score']
        difference = abs(rule_based_kpi - ml_kpi)
        percentage_diff = (difference / rule_based_kpi * 100) if rule_based_kpi > 0 else 0
        return jsonify({
            'status': 'success',
            'comparison': {
                'rule_based_kpi': float(rule_based_kpi),
                'ml_predicted_kpi': float(ml_kpi),
                'difference': float(difference),
                'percentage_difference': float(percentage_diff),
                'performance_category': ml_prediction['performance_category'],
                'confidence_interval': {
                    'lower': ml_prediction['confidence_lower'],
                    'upper': ml_prediction['confidence_upper']
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

@app.route('/ml/batch_predict', methods=['POST'])
def batch_predict_employees():
    if not ML_AVAILABLE or ml_predictor is None:
        return jsonify({'status': 'error', 'message': 'ML models not loaded'}), 500
    try:
        data = request.json
        role = data.get('role')
        domain = data.get('domain')
        df_employees = pd.read_excel('data/KPI/employees.xlsx', sheet_name=role)
        df_employees = df_employees[df_employees['Domain'] == domain]
        predictions = []
        for idx, row in df_employees.iterrows():
            employee_dict = row.to_dict()
            emp_id = employee_dict.get('EMP ID')
            ml_pred = ml_predictor.predict_kpi_score(employee_dict)
            criteria_json = {k: v for k, v in employee_dict.items() if k not in ['EMP ID', 'Domain', 'Name', 'Phone Number', 'Home Town', 'Age']}
            rule_based_kpi = calculate_kpi_value(role, criteria_json)
            predictions.append({
                'emp_id': emp_id,
                'ml_predicted_kpi': ml_pred['predicted_kpi_score'],
                'rule_based_kpi': float(rule_based_kpi),
                'performance_category': ml_pred['performance_category'],
                'difference': abs(ml_pred['predicted_kpi_score'] - rule_based_kpi)
            })
        ml_scores = [p['ml_predicted_kpi'] for p in predictions]
        rule_scores = [p['rule_based_kpi'] for p in predictions]
        return jsonify({
            'status': 'success',
            'predictions': predictions,
            'statistics': {
                'total_employees': len(predictions),
                'ml_average': float(np.mean(ml_scores)),
                'rule_based_average': float(np.mean(rule_scores)),
                'average_difference': float(np.mean([p['difference'] for p in predictions])),
                'correlation': float(np.corrcoef(ml_scores, rule_scores)[0, 1]) if len(ml_scores) > 1 else 0
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

@app.route('/ml/model_info', methods=['GET'])
def get_model_info():
    if not ML_AVAILABLE or ml_predictor is None:
        return jsonify({'status': 'error', 'message': 'ML models not loaded'}), 500
    try:
        models_path = ml_predictor.models_path
        with open(os.path.join(models_path, 'test_results.json'), 'r') as f:
            test_results = json.load(f)
        return jsonify({
            'status': 'success',
            'model_info': {
                'regression_model': type(ml_predictor.regression_model).__name__,
                'classification_model': type(ml_predictor.classification_model).__name__,
                'test_performance': test_results
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

@app.route('/ml/feature_importance', methods=['POST'])
def get_feature_importance():
    if not ML_AVAILABLE or ml_predictor is None:
        return jsonify({'status': 'error', 'message': 'ML models not loaded'}), 500
    try:
        data = request.json
        prediction = ml_predictor.predict_kpi_score(data)
        return jsonify({'status': 'success', 'feature_importance': prediction['top_contributing_factors']}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'ml_models_loaded': ML_AVAILABLE and ml_predictor is not None,
        'api_version': '2.0 with ML',
        'llm_provider': ACTIVE_LLM_PROVIDER
    }), 200

if __name__ == '__main__':
    print("\n" + "="*80)
    print("PM PULSE API - KPI Management System with ML Integration")
    print("="*80)
    print(f"ML Models Status: {'✓ Loaded' if ML_AVAILABLE and ml_predictor else '✗ Not Loaded'}")
    print(f"LLM Provider: {ACTIVE_LLM_PROVIDER}")
    if ML_AVAILABLE and ml_predictor:
        print("\nNew ML Endpoints:")
        print("  POST /ml/predict_kpi")
        print("  POST /ml/predict_team")
        print("  POST /ml/recommend_improvements")
        print("  POST /ml/compare_methods")
        print("  POST /ml/batch_predict")
        print("  GET  /ml/model_info")
        print("  POST /ml/feature_importance")
    print("\nExisting Endpoints: /register, /login, /risk, /complexity, /sdlc, /kpi/*, /employee/*")
    print("  GET  /health - Health check")
    print("="*80 + "\n")
    app.run(
            debug=False,
            port=5002
            )
