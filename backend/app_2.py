import numpy as np
import pandas as pd
import os, pickle, json
import sys
from flask_cors import CORS
from flask import Flask, request, jsonify
from llama_index.llms.openai import OpenAI
from llama_index.core.llms import ChatMessage, MessageRole
import traceback
import pickle

sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_models', 'scripts'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_models', 'scripts', 'ml_models'))

# ── Must import CareerAdviceEngine here so pickle can deserialize it ──


# Try to import ML predictor
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

# Load Career Advice Engine
try:
    from career_advice_trainer import CareerAdviceEngine 
    career_advice_service = CareerAdviceService()
    print("✓ Career Advice Engine loaded successfully!")
    CAREER_ADVICE_AVAILABLE = True
except Exception as e:
    print(f"⚠ Warning: Could not load Career Advice Engine: {e}")
    career_advice_service = None
    CAREER_ADVICE_AVAILABLE = False

app = Flask(__name__)
CORS(app)

os.environ['OPENAI_API_KEY'] = 'sk-rJ_uMKww7cpSlQKY4r02nTb2-2JO3egWmLky0pciQOT3BlbkFJyfF7cP5_t_KUvG_AFz_q-eBTtk4N1GI1fZ9H-kUzcA'

llm = OpenAI(
            engine="gpt-4o",
            temperature=0.3,
            max_tokens=1000
            )

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
                                0 : 'Low Risk', 
                                1 : 'Medium Risk', 
                                2 : 'High Risk'
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
    if match_index:
        match_index = match_index[0]
        row = df_pj.iloc[match_index]
        risk = int(row['Risk']) - 1
        prediction = class_dict[risk]
    else:
        data['Date_Difference'] = 0
        prediction = xgb.predict(data)[0]
        prediction = class_dict[prediction]
        
    data_json_updated = data_json.copy()
    data_json_updated['Risk'] = prediction
    response = llm.chat(risk_prompt_template)
    response = str(response.message.content)
    return response, prediction

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
        criteria_json = json.loads(df_role_values.loc[i, :].to_json())
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
    while True:
        try:
            response = llm.chat(complexity_prompt_template)
            selected_team = eval(response.message.content)
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
        except:
            print("Error occured, trying again...")

def kpi_for_employee(emp_id, role, employee_file_path = 'data/KPI/employees.xlsx'):
    df_employee = pd.read_excel(employee_file_path, sheet_name=role)
    df_employee = df_employee[df_employee['EMP ID'] == emp_id]
    df_employee.reset_index(drop=True, inplace=True)
    kpis = []
    for i in range(df_employee.shape[0]):
        criteria_json = json.loads(df_employee.loc[i, :].to_json())
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
    # Ensure Name column exists so employee names are preserved
    if 'Name' not in df_employee.columns:
        df_employee.insert(1, 'Name', None)
    columns = df_employee.columns.values
    empids = list(df_employee['EMP ID'].unique())
    empids_ = [int(empid[2:]) for empid in empids]
    emp_prefix = empids[0][:2]
    max_empid = max(empids_)
    new_empid = f'{emp_prefix}{max_empid + 1}'
    insert_json['EMP ID'] = new_empid
    # Default Name to empty string if not provided
    if 'Name' not in insert_json:
        insert_json['Name'] = ''
    # Build a single row for the selected domain only
    domain_entry = insert_json.get('Experience of related Domain', {})
    # Support both single dict {Domain, Years} and legacy list — take first/only entry
    if isinstance(domain_entry, list):
        domain_entry = domain_entry[0]
    user_new_dict = {}
    for col in columns:
        if col == 'Domain':
            user_new_dict[col] = [domain_entry.get('Domain', '')]
        elif col == 'Experience of related Domain':
            user_new_dict[col] = [domain_entry.get('Years', '0 - 5')]
        else:
            user_new_dict[col] = [insert_json.get(col, '')]
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
    data_cat_encoded = data_cat.apply(lambda x: encoder_dict_sdlc[x.name].transform(x))
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


@app.route('/ml/career_advice', methods=['POST'])
def career_advice():
    try:
        from career_advice_service import CareerAdviceService
        svc = CareerAdviceService()
        data          = request.json
        employee_data = data.get('employee_data', {})
        kpi_score     = float(data.get('kpi_score', 0))
        category      = data.get('category', 'Low')
        advice = svc.get_advice(employee_data, kpi_score, category)
        return jsonify({'status': 'success', 'advice': advice}), 200
    except Exception as e:
        return jsonify({
            'status':    'error',
            'message':   str(e),
            'traceback': traceback.format_exc()
        }), 400
    
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
            return jsonify({"response" : "User Logged In Successfully !!!", "status" : 200})
    return jsonify({"response" : "Invalid Credentials !!!", "status" : 400})
        
@app.route('/risk', methods=['POST'])
def risk():
    data_json = request.json
    response_risk, prediction_risk = inference_risk(data_json)
    return jsonify({'risk' : response_risk, 'mitigation' : prediction_risk})

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

@app.route('/kpi/employee/detail', methods=['POST'])
def kpi_employee_detail():
    """
    Returns full KPI breakdown for one employee:
    - KPI per domain (for bar chart)
    - Skill levels mapped to numeric scores (for radar chart)
    - Basic employee info
    """
    try:
        data_json  = request.json
        emp_id     = data_json['emp_id']
        role       = data_json['role']

        SKILL_SCORE = {
            'Novice': 20, 'Intermediate': 50, 'Advanced': 100,
            'Non-Lead': 0, 'Leadership': 100,
            '1-2 years': 20, '3-5 years': 50, '5+ years': 100,
            '0 - 5': 20, '6 - 14': 50, '15+': 100,
            'Unrelated': 50, 'related': 100,
        }
        SKIP_COLS = {'EMP ID', 'Domain', 'Name', 'Age', 'Home Town', 'Phone Number',
                     'Experience of related Domain'}

        df_role = pd.read_excel('data/KPI/employees.xlsx', sheet_name=role, engine='openpyxl')
        df_emp  = df_role[df_role['EMP ID'] == emp_id].reset_index(drop=True)

        if df_emp.empty:
            return jsonify({'status': 'error', 'message': 'Employee not found'}), 404

        # Basic info from first row
        first = df_emp.iloc[0]
        info  = {
            'emp_id':       emp_id,
            'name':         str(first.get('Name', '')) if pd.notna(first.get('Name')) else '',
            'age':          str(first.get('Age', ''))  if pd.notna(first.get('Age'))  else '',
            'home_town':    str(first.get('Home Town', '')) if pd.notna(first.get('Home Town')) else '',
            'phone':        str(first.get('Phone Number', '')) if pd.notna(first.get('Phone Number')) else '',
            'role':         role,
        }

        # KPI per domain
        domain_kpis = []
        for _, row in df_emp.iterrows():
            criteria_json = {
                k.replace('/', '-').replace('\\', ''): v
                for k, v in row.to_dict().items()
                if k not in {'EMP ID', 'Domain', 'Name', 'Age', 'Home Town', 'Phone Number'}
            }
            domain  = row.get('Domain', 'Unknown')
            kpi_val = calculate_kpi_value(role, criteria_json)
            domain_kpis.append({'domain': str(domain), 'kpi': round(float(kpi_val), 2)})

        avg_kpi = round(sum(d['kpi'] for d in domain_kpis) / len(domain_kpis), 2) if domain_kpis else 0

        # Skill radar data from first row
        skill_cols = [c for c in df_emp.columns if c not in SKIP_COLS]
        radar = []
        for col in skill_cols:
            val   = str(first.get(col, ''))
            score = SKILL_SCORE.get(val, 0)
            # Shorten long column names for display
            label = col
            if len(col) > 20:
                label = col[:18] + '..'
            radar.append({'skill': label, 'full_name': col, 'value': val, 'score': score})

        category = 'High' if avg_kpi > 60 else 'Medium' if avg_kpi > 30 else 'Low'

        return jsonify({
            'status':      'success',
            'info':        info,
            'avg_kpi':     avg_kpi,
            'category':    category,
            'domain_kpis': domain_kpis,
            'radar':       radar,
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}), 400

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
    return jsonify({'status': 'healthy', 'ml_models_loaded': ML_AVAILABLE and ml_predictor is not None, 'api_version': '2.0 with ML'}), 200


@app.route('/employee/by-role', methods=['POST'])
def employee_by_role():
    """Return list of {emp_id, name} for a given role, for dropdown display."""
    try:
        data_json = request.json
        role = data_json.get('role')
        if not role:
            return jsonify({'status': 'error', 'message': 'role is required'}), 400
        df_role = pd.read_excel('data/KPI/employees.xlsx', sheet_name=role, engine='openpyxl')
        # Get unique employees (one row per emp_id is enough for the name)
        df_unique = df_role.drop_duplicates(subset=['EMP ID'])
        result = []
        for _, row in df_unique.iterrows():
            emp_id = row.get('EMP ID', '')
            name   = row.get('Name', None)
            # Show "Name (ID)" if name exists, else just the ID
            display = str(name) + ' (' + str(emp_id) + ')' if (name and str(name) not in ['nan', 'None', '']) else str(emp_id)
            result.append({'emp_id': emp_id, 'name': str(name) if (name and str(name) not in ['nan', 'None', '']) else '', 'display': display})
        return jsonify({'status': 'success', 'employees': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    
if __name__ == '__main__':
    print("\n" + "="*80)
    print("Weenet API - KPI Management System with ML Integration")
    print("="*80)
    print(f"ML Models Status: {'✓ Loaded' if ML_AVAILABLE and ml_predictor else '✗ Not Loaded'}")
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
    app.run(debug=True, port=5002)