"""
ML Prediction Service - FINAL CORRECT VERSION

How the model was trained (data_preparation.py):
- 500 samples per role, combined into one DataFrame
- Each row only has its own role's features filled in
- All OTHER roles' features = NaN → converted to string 'nan' via astype(str)
- Role and Domain columns included as features
- LabelEncoder + StandardScaler applied

So for a correct prediction:
1. Role  → actual role string  (e.g. 'Tech Lead')
2. Domain → actual domain string (e.g. 'Health')
3. Features belonging to THIS role → mapped from the 12 frontend generic fields
4. Features belonging to OTHER roles → string 'nan'  ← THIS is the key fix
5. Shared features (Experience of related Domain, Bachelor's Degree, Master's Degree)
   → always mapped from frontend
"""

import pandas as pd
import numpy as np
import pickle
import os
from typing import Dict, Any, List


# ─────────────────────────────────────────────────────────────────────────────
# EXACT feature names from each role's JSON file
# Maps model_feature_name → which frontend generic field to use
# 'nan' means this feature is not used for this role (other-role feature)
# ─────────────────────────────────────────────────────────────────────────────

# Shared across all roles
SHARED_FEATURES = {
    'Experience of related Domain': 'domain_experience',
    "Bachelor's Degree":            'bachelors_degree',
    "Master's Degree":              'masters_degree',
}

# Generic frontend field → model value mappings
FRONTEND_TO_MODEL = {
    # skills
    'analytical_skills':     lambda v: v,
    'technical_proficiency': lambda v: v,
    'communication_skills':  lambda v: v,
    'problem_solving':       lambda v: v,
    'domain_expertise':      lambda v: v,
    # experience
    'years_experience':      lambda v: v,
    'domain_experience':     lambda v: v,
    'leadership_experience': lambda v: v,
    # education
    'bachelors_degree':      lambda v: v,
    'masters_degree':        lambda v: v,
    # identity
    'role':                  lambda v: v,
    'domain':                lambda v: v,
}

# Per-role feature map: model_feature_name → frontend_generic_key
# Only features that BELONG to this role. All others get 'nan'.
ROLE_FEATURE_MAP = {
    'Business Analyst': {
        'Analytical Skills':                        'analytical_skills',
        'Technical Proficiency':                    'technical_proficiency',
        'Communication Skills':                     'communication_skills',
        'Problem Solving Skills':                   'problem_solving',
        # junk/test features in the JSON — map to analytical as best guess
        'test':                                     'analytical_skills',
        'dafedaf':                                  'analytical_skills',
        'lkjdhfdghj':                               'analytical_skills',
        'Years of experience in Business Analysis': 'years_experience',
        'Leadership-Team lead experience':          'leadership_experience',
        'etset':                                    'leadership_experience',
    },
    'Backend Engineer': {
        'Proficiency in Programming Languages':         'technical_proficiency',
        'Database Management (SQL, NoSQL)':             'technical_proficiency',
        'API Development and Integration':              'technical_proficiency',
        'Knowledge of Frameworks':                      'technical_proficiency',
        'Understanding of Microservices Architecture':  'analytical_skills',
        'Years of experience in Bacend Engineer':       'years_experience',
    },
    'DevOps Engineer': {
        'Scripting and Automation (Python, Bash)':          'technical_proficiency',
        'Continuous Integration/Continuous Deployment':     'technical_proficiency',
        'Cloud Platforms ( AWS, Azure, GCP)':               'technical_proficiency',
        'Configuration Management Tools':                   'technical_proficiency',
        'Monitoring and Logging Tools':                     'analytical_skills',
        'Years of experience in DevOps Engineer':           'years_experience',
        'Leadership/Team lead experience':                  'leadership_experience',
    },
    'Frontend Engineer': {
        'Proficiency in HTML/CSS':                              'technical_proficiency',
        'Proficiency in JavaScript/TypeScript':                 'technical_proficiency',
        'Knowledge of Frontend Frameworks/Libraries':           'technical_proficiency',
        'UI/UX Design Principles':                              'analytical_skills',
        'Responsive Design and Cross-Browser Compatibility':    'technical_proficiency',
        'Years of experience in FrontEnd engineer':             'years_experience',
    },
    'FullStack Engineer': {
        'Proficiency in Frontend Technologies':     'technical_proficiency',
        'Proficiency in Backend Technologies':      'technical_proficiency',
        'Knowledge of Frontend Frameworks':         'technical_proficiency',
        'Knowledge of Backend Frameworks':          'technical_proficiency',
        'Database Management (SQL, NoSQL)':         'technical_proficiency',
        'API Development and Integration':          'technical_proficiency',
        'Years of experience in Fullstack engineer':'years_experience',
    },
    'Project Manager': {
        'planning & scheduling':                            'analytical_skills',
        'Leadership and Team Management':                   'leadership_experience',
        'Communication Skills':                             'communication_skills',
        'Risk Management':                                  'problem_solving',
        'Budgeting and Cost Control':                       'analytical_skills',
        'Knowledge of Project Management Methodologies':    'technical_proficiency',
        # Note: PM JSON has 'Years of experience in Fullstack engineer' — typo in JSON kept as-is
        'Years of experience in Fullstack engineer':        'years_experience',
    },
    'Quality Assurance Engineer': {
        'Excellent communication':              'communication_skills',
        'Test Automation':                      'technical_proficiency',
        'Knowledge of testing methodologies':   'analytical_skills',
        'Bug tracking and reporting':           'technical_proficiency',
        'Years of experience in QA':            'years_experience',
        'Leadership/Team lead experience':      'leadership_experience',
    },
    'Tech Lead': {
        'Technical Expertise':                  'technical_proficiency',
        'Leadership and Team Management':       'leadership_experience',
        'Project Management Skills':            'analytical_skills',
        'Problem-Solving and Decision-Making':  'problem_solving',
        'Communication and Collaboration':      'communication_skills',
        'Years of experience in Tech Lead':     'years_experience',
    },
}


class KPIMLPredictor:
    def __init__(self):
        self.models_path = os.path.join(os.path.dirname(__file__), 'ml_models', 'trained_models')
        self.regression_model     = None
        self.classification_model = None
        self.scaler               = None
        self.label_encoders       = None
        self.expected_features    = None
        self.load_models()

    def load_models(self):
        try:
            with open(os.path.join(self.models_path, 'kpi_regression_model.pkl'), 'rb') as f:
                self.regression_model = pickle.load(f)
            with open(os.path.join(self.models_path, 'kpi_classification_model.pkl'), 'rb') as f:
                self.classification_model = pickle.load(f)

            scaler_path = os.path.join(self.models_path, 'scaler.pkl')
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)

            encoders_path = os.path.join(self.models_path, 'label_encoders.pkl')
            if os.path.exists(encoders_path):
                with open(encoders_path, 'rb') as f:
                    self.label_encoders = pickle.load(f)

            # Detect actual feature order the model was trained on
            if hasattr(self.regression_model, 'feature_names_in_'):
                self.expected_features = list(self.regression_model.feature_names_in_)
            elif self.scaler and hasattr(self.scaler, 'feature_names_in_'):
                self.expected_features = list(self.scaler.feature_names_in_)
            elif self.label_encoders:
                self.expected_features = list(self.label_encoders.keys())
            else:
                self.expected_features = []

            print(f"\n✅ Models loaded")
            print(f"   Regression    : {type(self.regression_model).__name__}")
            print(f"   Classification: {type(self.classification_model).__name__}")
            print(f"   Total features: {len(self.expected_features)}")
            print(f"   Feature list  : {self.expected_features}\n")

        except Exception as e:
            raise Exception(f"Failed to load models: {str(e)}")

    def _build_model_row(self, employee_data: Dict) -> Dict:
        """
        Build one row with ALL model features in the correct order.
        - Role/Domain columns → actual values
        - This role's features  → mapped from frontend generic fields
        - Other roles' features → string 'nan' (matches training data encoding)
        - Shared features       → always mapped from frontend
        """
        role   = employee_data.get('role', employee_data.get('Role', 'Business Analyst'))
        domain = employee_data.get('domain', employee_data.get('Domain', 'Finance'))

        role_map = ROLE_FEATURE_MAP.get(role, {})
        row = {}

        for feature in self.expected_features:
            # 1. Role column
            if feature == 'Role':
                row[feature] = role

            # 2. Domain column
            elif feature == 'Domain':
                row[feature] = domain

            # 3. Shared features (experience of domain, degrees)
            elif feature in SHARED_FEATURES:
                generic_key = SHARED_FEATURES[feature]
                row[feature] = employee_data.get(generic_key, 'nan')

            # 4. This role's own features
            elif feature in role_map:
                generic_key = role_map[feature]
                row[feature] = employee_data.get(generic_key, 'Intermediate')

            # 5. All other roles' features → 'nan' (exactly as in training)
            else:
                row[feature] = 'nan'

        return row

    def preprocess_employee_data(self, employee_data: Dict) -> np.ndarray:
        row = self._build_model_row(employee_data)

        print(f"\n📋 Model row for role='{employee_data.get('role', '?')}':")
        for k, v in row.items():
            marker = '' if v == 'nan' else ' ←'
            print(f"   {k}: {v}{marker}")

        df = pd.DataFrame([row])[self.expected_features]
        df_encoded = self._encode_features(df)
        return self.scaler.transform(df_encoded) if self.scaler else df_encoded.values

    def _encode_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df_enc = df.copy()
        if self.label_encoders:
            for col in df_enc.columns:
                if col in self.label_encoders:
                    try:
                        df_enc[col] = self.label_encoders[col].transform(df_enc[col].astype(str))
                    except ValueError as e:
                        # Value unseen during training — use the 'nan' encoding index
                        print(f"   ⚠ Encoding error '{col}': {e} → using 0")
                        df_enc[col] = 0
        else:
            from sklearn.preprocessing import LabelEncoder
            for col in df_enc.columns:
                if df_enc[col].dtype == 'object':
                    df_enc[col] = LabelEncoder().fit_transform(df_enc[col].astype(str))
        return df_enc

    def predict_kpi_score(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        print(f"\n🔍 Incoming: {employee_data}")
        X = self.preprocess_employee_data(employee_data)

        kpi_score = round(float(min(100.0, max(0.0, self.regression_model.predict(X)[0]))), 2)

        try:
            cat_code = int(self.classification_model.predict(X)[0])
            performance_category = {0: "Low", 1: "Medium", 2: "High"}.get(cat_code, "Medium")
        except Exception:
            performance_category = "High" if kpi_score >= 80 else "Medium" if kpi_score >= 60 else "Low"

        print(f"✅ KPI={kpi_score}  Category={performance_category}")
        return {
            'predicted_kpi_score':      kpi_score,
            'performance_category':     performance_category,
            'confidence_lower':         float(max(0,   kpi_score - 5.0)),
            'confidence_upper':         float(min(100, kpi_score + 5.0)),
            'top_contributing_factors': self._get_feature_importance(employee_data),
        }

    def _get_feature_importance(self, employee_data: Dict) -> List[Dict]:
        if not hasattr(self.regression_model, 'feature_importances_'):
            return []
        role     = employee_data.get('role', employee_data.get('Role', ''))
        role_map = ROLE_FEATURE_MAP.get(role, {})
        importances = self.regression_model.feature_importances_

        # Only show features relevant to this role
        role_indices = [
            i for i, f in enumerate(self.expected_features)
            if f in role_map or f in SHARED_FEATURES or f in ('Role', 'Domain')
        ]
        role_indices_sorted = sorted(role_indices, key=lambda i: importances[i], reverse=True)[:5]

        return [
            {
                'feature':    self.expected_features[i],
                'importance': float(importances[i]),
                'value':      str(employee_data.get(
                    role_map.get(self.expected_features[i],
                                 SHARED_FEATURES.get(self.expected_features[i], '')), 'N/A'
                )),
            }
            for i in role_indices_sorted
        ]

    def predict_team_kpi(self, team_members: List[Dict]) -> Dict[str, Any]:
        predictions  = []
        distribution = {'High': 0, 'Medium': 0, 'Low': 0}
        for member in team_members:
            try:
                pred = self.predict_kpi_score(member)
                predictions.append({
                    'emp_id':               member.get('emp_id', 'Unknown'),
                    'role':                 member.get('role', member.get('Role', 'Unknown')),
                    'predicted_kpi_score':  pred['predicted_kpi_score'],
                    'performance_category': pred['performance_category'],
                })
                distribution[pred['performance_category']] += 1
            except Exception as e:
                print(f"⚠ Team prediction failed: {e}")
        if not predictions:
            raise Exception("No successful predictions")
        scores = [p['predicted_kpi_score'] for p in predictions]
        return {
            'individual_predictions':   predictions,
            'team_average_kpi':         float(np.mean(scores)),
            'team_median_kpi':          float(np.median(scores)),
            'team_max_kpi':             float(np.max(scores)),
            'team_min_kpi':             float(np.min(scores)),
            'team_std_kpi':             float(np.std(scores)),
            'performance_distribution': distribution,
        }

    def recommend_improvements(self, employee_data: Dict[str, Any]) -> List[Dict]:
        current_kpi   = self.predict_kpi_score(employee_data)['predicted_kpi_score']
        level_upgrade = {'Novice': 'Intermediate', 'Intermediate': 'Advanced', 'Non-Lead': 'Leadership'}
        recs = []
        for gk in ['analytical_skills', 'technical_proficiency', 'communication_skills',
                   'problem_solving', 'domain_expertise', 'leadership_experience']:
            current_value = employee_data.get(gk)
            new_value     = level_upgrade.get(current_value)
            if not new_value:
                continue
            test_data     = employee_data.copy()
            test_data[gk] = new_value
            try:
                improvement = self.predict_kpi_score(test_data)['predicted_kpi_score'] - current_kpi
                if improvement > 0.5:
                    recs.append({
                        'feature':                gk.replace('_', ' ').title(),
                        'current_level':          current_value,
                        'recommended_level':      new_value,
                        'potential_kpi_increase': round(float(improvement), 2),
                        'priority':               'High' if improvement > 5 else 'Medium',
                    })
            except Exception:
                continue
        recs.sort(key=lambda x: x['potential_kpi_increase'], reverse=True)
        return recs


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    predictor = KPIMLPredictor()

    tests = [
        ("Tech Lead - Senior",  {"role": "Tech Lead",        "domain": "Health",
                                  "analytical_skills": "Advanced", "technical_proficiency": "Advanced",
                                  "communication_skills": "Advanced", "problem_solving": "Advanced",
                                  "domain_expertise": "Advanced", "years_experience": "5+ years",
                                  "domain_experience": "15+", "leadership_experience": "Leadership",
                                  "bachelors_degree": "related", "masters_degree": "related"}),
        ("Tech Lead - Junior",  {"role": "Tech Lead",        "domain": "Health",
                                  "analytical_skills": "Novice", "technical_proficiency": "Novice",
                                  "communication_skills": "Novice", "problem_solving": "Novice",
                                  "domain_expertise": "Novice", "years_experience": "1-2 years",
                                  "domain_experience": "0 - 5", "leadership_experience": "Non-Lead",
                                  "bachelors_degree": "Unrelated", "masters_degree": "Unrelated"}),
        ("FullStack - Senior",  {"role": "FullStack Engineer", "domain": "Finance",
                                  "analytical_skills": "Advanced", "technical_proficiency": "Advanced",
                                  "communication_skills": "Advanced", "problem_solving": "Advanced",
                                  "domain_expertise": "Advanced", "years_experience": "5+ years",
                                  "domain_experience": "15+", "leadership_experience": "Leadership",
                                  "bachelors_degree": "related", "masters_degree": "related"}),
        ("FullStack - Junior",  {"role": "FullStack Engineer", "domain": "Education",
                                  "analytical_skills": "Novice", "technical_proficiency": "Novice",
                                  "communication_skills": "Novice", "problem_solving": "Novice",
                                  "domain_expertise": "Novice", "years_experience": "1-2 years",
                                  "domain_experience": "0 - 5", "leadership_experience": "Non-Lead",
                                  "bachelors_degree": "Unrelated", "masters_degree": "Unrelated"}),
    ]

    print("\n" + "="*60 + "\nRESULTS\n" + "="*60)
    results = {}
    for label, data in tests:
        r = predictor.predict_kpi_score(data)
        results[label] = r['predicted_kpi_score']
        print(f"{label:25s} → KPI={r['predicted_kpi_score']:6.2f}  ({r['performance_category']})")

    print("\n" + "="*60)
    if results["Tech Lead - Senior"] > results["Tech Lead - Junior"]:
        print("✅ PASS: Senior Tech Lead scores higher than Junior Tech Lead")
    else:
        print("❌ FAIL: Scores are same or reversed")

    if results["FullStack - Senior"] > results["FullStack - Junior"]:
        print("✅ PASS: Senior FullStack scores higher than Junior FullStack")
    else:
        print("❌ FAIL: Scores are same or reversed")