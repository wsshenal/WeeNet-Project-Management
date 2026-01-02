import numpy as np
import pandas as pd
import os, pickle, json
from flask_cors import CORS
from flask import Flask, request, jsonify
from llama_index.llms.openai import OpenAI
from llama_index.core.llms import ChatMessage, MessageRole

app = Flask(__name__)
CORS(app)

os.environ['OPENAI_API_KEY'] = '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'

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
    # find the row index that all inndices are true
    match_index = match_flag[match_flag.all(axis=1)].index.values
    if match_index:
        match_index = match_index[0]
        row = df_pj.iloc[match_index]
        risk = int(row['Risk']) -1
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
    criteria = row['Criteria'].replace('\\/', '-').replace('\\', '').replace('\/', '-')
    level = row['Level']
    print(level, criteria, weight)

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
    print("awa2")
    weight = row['Weight']
    print("awa3")
    criteria = row['Criteria'].replace('\\/', '-').replace('\\', '').replace('\/', '-')
    print("awa4",row["Criteria"])
    level = row['Level']
    print(level,criteria,weight)
    value = json_role_updated[criteria][level]
    return value * weight


def calculate_kpi_value(
                        role,
                        criteria_json
                        ):

    df_arr = load_csv_files()
    print("awa3")
        
    json_arr = load_json_files()
    print("awa4")

    df_role = df_arr[role]
    print("awa5")
    df_role['Criteria'] = df_role['Criteria'].str.replace('\\/', '-').str.replace('\\', '').str.replace('/', '-')
    print("awa6")
    json_role = json_arr[role][0]
    print("awa7")
    json_role_updated = {}
    for _, value in json_role.items():
        for k, v in value.items():
            json_role_updated[k] = v
    print("awa8")
    criteria_df = pd.DataFrame(
                                criteria_json, 
                                index=[0]
                                ).T
    print("awa9")
    criteria_df = criteria_df.reset_index()
    print("awa10")
    criteria_df.columns = ['Criteria', 'Level']
    print("awa11")
    criteria_df['Criteria'] = criteria_df['Criteria'].str.strip()
    print("awa12")
    criteria_df['Level'] = criteria_df['Level'].str.strip()
    print("awa13")
    criteria_df = criteria_df.merge(
                                    df_role, 
                                    on = 'Criteria', 
                                    how = 'left'
                                    )
    criteria_df['Weight'] = criteria_df['Weight'].fillna(0)
    print(criteria_df['Weight'])
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
    print("awa1.1")
    df_role_values.reset_index(drop=True, inplace=True)

    print("awa1.2")
    for i in range(df_role_values.shape[0]):

        criteria_json = eval(df_role_values.loc[i, :].to_json())
         # Remove specified fields
        for key in ['Name', 'Home Town', 'Phone Number', 'Age']:
            if key in criteria_json:
                del criteria_json[key]
        criteria_json = {k.replace('\\/', '-').replace('\\', '').replace('\/', '-'): v for k, v in criteria_json.items()}
        emp_id = criteria_json['EMP ID']
        domain = criteria_json['Domain']
        del criteria_json['EMP ID'], criteria_json['Domain']

        kpi_value = calculate_kpi_value(
                                        role,
                                        criteria_json
                                        )
        print(kpi_value)
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

    while True:
        try:
            response = llm.chat(complexity_prompt_template)
            selected_team = eval(response.message.content)

            selected_employees = []
            for role, count in selected_team.items():
                df_unoccupied_role = df_unoccupied[df_unoccupied['role'] == role]
                del df_unoccupied_role['role']
                unoccupied_empids = list(df_unoccupied_role['EMP ID'])
                print("awa1.1")
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

def kpi_for_employee(
                    emp_id, role,
                    employee_file_path = 'data/KPI/employees.xlsx'
                    ):
    df_employee = pd.read_excel(employee_file_path, sheet_name=role)
    df_employee = df_employee[df_employee['EMP ID'] == emp_id]
    df_employee.reset_index(drop=True, inplace=True)
    print("awa1")
    kpis = []
    for i in range(df_employee.shape[0]):
        criteria_json = eval(df_employee.loc[i, :].to_json())
        criteria_json = {k.replace('\\/', '-').replace('\\', '').replace('\/', '-'): v for k, v in criteria_json.items()}
        emp_id = criteria_json['EMP ID']
        domain = criteria_json['Domain']
        name = criteria_json.get('Name')  # Added
        age = criteria_json.get('Age')  # Added
        hometown = criteria_json.get('Home Town')  # Added
        phone_number = criteria_json.get('Phone Number')  # Added
        print("awa2")
        del criteria_json['EMP ID'], criteria_json['Domain']
        print("awa3")
        kpi_value = calculate_kpi_value(
                                        role,
                                        criteria_json
                                        )
        print("awa4")
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
    
    response = llm.chat(recal_prompt_template)
    response = str(response.message.content)
    return response

def sdlc_pipeline(data_json):
    risk_level = inference_risk(data_json)[-1]
    print("awa1")
    complexity_level = inference_complexity(data_json)[-1]
    print("awa2")
    data_json_sdlc = data_json.copy()
    print("awa3")
    data_json_sdlc["Complexity"] = complexity_level
    print("awa4")
    sdlc_dict = inference_sdlc(data_json_sdlc)
    print("awa5")

    data_json_risk = data_json_sdlc.copy()
    print("awa6")
    data_json_risk['Risk'] = risk_level
    print("awa7")
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
                "password" : f"{password}"
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
        if user['email'] == email and user['password'] == password:
            return jsonify({
                            "response" : "User Logged In Successfully !!!",
                            "status" : 200
                            })

    return jsonify({
                    "response" : "Invalid Credentials !!!",
                    "status" : 400
                    })
        
@app.route('/risk', methods=['POST'])
def risk():
    data_json = request.json
    response_risk, prediction_risk = inference_risk(data_json)
    return jsonify({
                    'risk' : response_risk,
                    'mitigation' : prediction_risk
                    })

@app.route('/employee/all', methods=['GET'])
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
def complexity():
    data_json = request.json
    selected_team, selected_employees, prediction_complexity= inference_complexity(data_json)
    return jsonify({
                    'selected_team' : selected_team,
                    'selected_employees' : selected_employees,
                    'complexity' : prediction_complexity
                    })

@app.route('/sdlc', methods=['POST'])
def sdlc():
    data_json = request.json
    response_sdlc = sdlc_pipeline(data_json)
    return jsonify({
                    'sdlc' : response_sdlc
                    })

@app.route('/kpi/crud', methods=['POST'])
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
def kpi_employee():
    data_json = request.json
    print("awa0")
    kpis = kpi_for_employee(
                            data_json['emp_id'],
                            data_json['role']
                            )
    return jsonify({
                    "kpis" : kpis
                    })

@app.route('/employee/insert', methods=['POST'])
def employee_insert():
    data_json = request.json
    insert_employee(data_json['insert_json'], data_json['role'])
    return jsonify({
                    "response" : "Employee Inserted Successfully !!!"
                    })

EXCEL_FILE_PATH = './data/KPI/projects.xlsx'

@app.route('/save-data', methods=['POST'])
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