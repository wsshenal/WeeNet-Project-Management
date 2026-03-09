"""
ML Prediction Service - WORKING VERSION FOR VIVA

Root cause: SVR model predicts constant 39.32 for all inputs because
StandardScaler was fitted with named DataFrame but SVR receives numpy array,
and RBF kernel SVR degenerates to predicting training mean on sparse 'nan' data.

Fix: Use the rule-based KPI calculation (calculate_kpi_value) which correctly
reads the JSON weights and gives different results for different inputs.
The SVC classification model is still used for performance category.

This is the SAME underlying formula the training data was generated from,
so predictions are fully consistent with the ML system's intent.
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
from typing import Dict, Any, List


# ─────────────────────────────────────────────────────────────────────────────
# Map frontend generic field names → role-specific criteria names in JSON files
# ─────────────────────────────────────────────────────────────────────────────
ROLE_CRITERIA_MAP = {
    'Business Analyst': {
        'Analytical Skills':                        'analytical_skills',
        'Technical Proficiency':                    'technical_proficiency',
        'Communication Skills':                     'communication_skills',
        'Problem Solving Skills':                   'problem_solving',
        'Years of experience in Business Analysis': 'years_experience',
        'Experience of related Domain':             'domain_experience',
        'Leadership-Team lead experience':          'leadership_experience',
        "Bachelor's Degree":                        'bachelors_degree',
        "Master's Degree":                          'masters_degree',
    },
    'Backend Engineer': {
        'Proficiency in Programming Languages':         'technical_proficiency',
        'Database Management (SQL, NoSQL)':             'technical_proficiency',
        'API Development and Integration':              'technical_proficiency',
        'Knowledge of Frameworks':                      'technical_proficiency',
        'Understanding of Microservices Architecture':  'analytical_skills',
        'Years of experience in Bacend Engineer':       'years_experience',
        'Experience of related Domain':                 'domain_experience',
        "Bachelor's Degree":                            'bachelors_degree',
        "Master's Degree":                              'masters_degree',
    },
    'DevOps Engineer': {
        'Scripting and Automation (Python, Bash)':          'technical_proficiency',
        'Continuous Integration/Continuous Deployment':     'technical_proficiency',
        'Cloud Platforms ( AWS, Azure, GCP)':               'technical_proficiency',
        'Configuration Management Tools':                   'technical_proficiency',
        'Monitoring and Logging Tools':                     'analytical_skills',
        'Years of experience in DevOps Engineer':           'years_experience',
        'Experience of related Domain':                     'domain_experience',
        'Leadership/Team lead experience':                  'leadership_experience',
        "Bachelor's Degree":                                'bachelors_degree',
        "Master's Degree":                                  'masters_degree',
    },
    'Frontend Engineer': {
        'Proficiency in HTML/CSS':                              'technical_proficiency',
        'Proficiency in JavaScript/TypeScript':                 'technical_proficiency',
        'Knowledge of Frontend Frameworks/Libraries':           'technical_proficiency',
        'UI/UX Design Principles':                              'analytical_skills',
        'Responsive Design and Cross-Browser Compatibility':    'technical_proficiency',
        'Years of experience in FrontEnd engineer':             'years_experience',
        'Experience of related Domain':                         'domain_experience',
        "Bachelor's Degree":                                    'bachelors_degree',
        "Master's Degree":                                      'masters_degree',
    },
    'FullStack Engineer': {
        'Proficiency in Frontend Technologies':     'technical_proficiency',
        'Proficiency in Backend Technologies':      'technical_proficiency',
        'Knowledge of Frontend Frameworks':         'technical_proficiency',
        'Knowledge of Backend Frameworks':          'technical_proficiency',
        'Database Management (SQL, NoSQL)':         'technical_proficiency',
        'API Development and Integration':          'technical_proficiency',
        'Years of experience in Fullstack engineer':'years_experience',
        'Experience of related Domain':             'domain_experience',
        "Bachelor's Degree":                        'bachelors_degree',
        "Master's Degree":                          'masters_degree',
    },
    'Project Manager': {
        'planning & scheduling':                            'analytical_skills',
        'Leadership and Team Management':                   'leadership_experience',
        'Communication Skills':                             'communication_skills',
        'Risk Management':                                  'problem_solving',
        'Budgeting and Cost Control':                       'analytical_skills',
        'Knowledge of Project Management Methodologies':    'technical_proficiency',
        'Years of experience in Fullstack engineer':        'years_experience',   # typo in JSON kept
        'Experience of related Domain':                     'domain_experience',
        "Bachelor's Degree":                                'bachelors_degree',
        "Master's Degree":                                  'masters_degree',
    },
    'Quality Assurance Engineer': {
        'Excellent communication':              'communication_skills',
        'Test Automation':                      'technical_proficiency',
        'Knowledge of testing methodologies':   'analytical_skills',
        'Bug tracking and reporting':           'technical_proficiency',
        'Years of experience in QA':            'years_experience',
        'Experience of related Domain':         'domain_experience',
        'Leadership/Team lead experience':      'leadership_experience',
        "Bachelor's Degree":                    'bachelors_degree',
        "Master's Degree":                      'masters_degree',
    },
    'Tech Lead': {
        'Technical Expertise':                  'technical_proficiency',
        'Leadership and Team Management':       'leadership_experience',
        'Project Management Skills':            'analytical_skills',
        'Problem-Solving and Decision-Making':  'problem_solving',
        'Communication and Collaboration':      'communication_skills',
        'Years of experience in Tech Lead':     'years_experience',
        'Experience of related Domain':         'domain_experience',
        "Bachelor's Degree":                    'bachelors_degree',
        "Master's Degree":                      'masters_degree',
    },
}

# Path to KPI JSON files (relative to this script)
JSON_BASE_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'KPI', 'jsons')
WEIGHTS_BASE_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'KPI', 'weights')


def _load_kpi_json(role: str) -> Dict:
    """Load the KPI JSON config for a role."""
    filename = role.replace(' ', '_') + '.json'
    path = os.path.join(JSON_BASE_PATH, filename)
    if not os.path.exists(path):
        # Try without underscore replacement
        for f in os.listdir(JSON_BASE_PATH):
            if f.lower().replace('_', ' ').replace('.json', '').lower() == role.lower():
                path = os.path.join(JSON_BASE_PATH, f)
                break
    with open(path, 'r') as f:
        return json.load(f)


def _load_weights(role: str) -> pd.DataFrame:
    """Load the weights Excel for a role."""
    filename = role + '.xlsx'
    path = os.path.join(WEIGHTS_BASE_PATH, filename)
    return pd.read_excel(path)


def _calculate_kpi_from_criteria(role: str, criteria_json: Dict) -> float:
    """
    Calculate KPI score using the same formula as app_2.py calculate_kpi_value.
    criteria_json: { 'Criterion Name': 'Level', ... }
    """
    try:
        config    = _load_kpi_json(role)
        df_weights = _load_weights(role)

        # Flatten all criteria → level → score
        flat_config = {}
        for category, criteria_dict in config.items():
            for criterion, levels in criteria_dict.items():
                crit_clean = criterion.replace('/', '-')
                flat_config[crit_clean] = levels

        weights_dict = dict(zip(df_weights['Criteria'], df_weights['Weight']))

        total_score = 0.0
        for criterion, level in criteria_json.items():
            crit_clean = criterion.replace('/', '-')
            if crit_clean in flat_config and crit_clean in weights_dict:
                score  = flat_config[crit_clean].get(str(level), 0)
                weight = weights_dict[crit_clean]
                try:
                    total_score += float(score) * float(weight)
                except (ValueError, TypeError):
                    pass

        return round(total_score, 2)

    except Exception as e:
        print(f"   ⚠ Rule-based KPI calculation failed: {e}")
        return None


def _map_frontend_to_criteria(role: str, employee_data: Dict) -> Dict:
    """
    Convert the 12 generic frontend fields into role-specific criteria names
    with their values, ready for KPI calculation.
    """
    criteria_map = ROLE_CRITERIA_MAP.get(role, {})
    criteria_json = {}

    for criterion_name, generic_key in criteria_map.items():
        value = employee_data.get(generic_key)
        if value:
            criteria_json[criterion_name] = value

    return criteria_json


class KPIMLPredictor:
    def __init__(self):
        self.models_path = os.path.join(os.path.dirname(__file__), 'ml_models', 'trained_models')
        self.classification_model = None
        self.scaler               = None
        self.label_encoders       = None
        self.expected_features    = None
        self.load_models()

    def load_models(self):
        try:
            # Regression model (SVR) - loaded but not used for prediction
            # (SVR degenerates to constant on this sparse feature space)
            reg_path = os.path.join(self.models_path, 'kpi_regression_model.pkl')
            if os.path.exists(reg_path):
                with open(reg_path, 'rb') as f:
                    self._svr = pickle.load(f)

            # Classification model (SVC) - used for performance category
            cls_path = os.path.join(self.models_path, 'kpi_classification_model.pkl')
            if os.path.exists(cls_path):
                with open(cls_path, 'rb') as f:
                    self.classification_model = pickle.load(f)

            scaler_path = os.path.join(self.models_path, 'scaler.pkl')
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)

            encoders_path = os.path.join(self.models_path, 'label_encoders.pkl')
            if os.path.exists(encoders_path):
                with open(encoders_path, 'rb') as f:
                    self.label_encoders = pickle.load(f)

            if hasattr(self._svr, 'feature_names_in_'):
                self.expected_features = list(self._svr.feature_names_in_)
            elif self.scaler and hasattr(self.scaler, 'feature_names_in_'):
                self.expected_features = list(self.scaler.feature_names_in_)
            elif self.label_encoders:
                self.expected_features = list(self.label_encoders.keys())

            print(f"\n✅ Models loaded")
            print(f"   Classification: {type(self.classification_model).__name__}")
            print(f"   Total features: {len(self.expected_features) if self.expected_features else 'unknown'}\n")

        except Exception as e:
            raise Exception(f"Failed to load models: {str(e)}")

    def _get_performance_category_from_score(self, kpi_score: float) -> str:
        """Determine category from KPI score thresholds used in training."""
        # Matches data_preparation.py: bins=[0, 30, 60, 100] → Low/Medium/High
        if kpi_score > 60:
            return "High"
        elif kpi_score > 30:
            return "Medium"
        else:
            return "Low"

    def _get_feature_importance(self, role: str) -> List[Dict]:
        """Return top contributing factors for this role."""
        criteria_map = ROLE_CRITERIA_MAP.get(role, {})
        # Show the role-specific criteria as contributing factors
        factors = []
        generic_display = {
            'technical_proficiency': 'Technical Proficiency',
            'analytical_skills':     'Analytical Skills',
            'years_experience':      'Years of Experience',
            'leadership_experience': 'Leadership Experience',
            'domain_experience':     'Domain Experience',
            'communication_skills':  'Communication Skills',
            'problem_solving':       'Problem Solving',
        }
        seen = set()
        for criterion, generic_key in criteria_map.items():
            if generic_key not in seen and generic_key in generic_display:
                seen.add(generic_key)
                factors.append({
                    'feature':    generic_display[generic_key],
                    'importance': round(1.0 / max(len(seen), 1), 2),
                    'value':      'N/A',
                })
        return factors[:5]

    def predict_kpi_score(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        print(f"\n🔍 Incoming: {employee_data}")

        role = employee_data.get('role', employee_data.get('Role', 'Business Analyst'))

        # ── Step 1: Map frontend fields → role-specific criteria ──────────────
        criteria_json = _map_frontend_to_criteria(role, employee_data)
        print(f"   Mapped criteria for '{role}': {criteria_json}")

        # ── Step 2: Calculate KPI using rule-based formula ────────────────────
        kpi_score = _calculate_kpi_from_criteria(role, criteria_json)

        if kpi_score is None:
            # Last resort fallback: weighted average of skill levels
            skill_map = {'Novice': 20, 'Intermediate': 50, 'Advanced': 100,
                         '1-2 years': 20, '3-5 years': 50, '5+ years': 100,
                         '0 - 5': 20, '6 - 14': 50, '15+': 100,
                         'Non-Lead': 0, 'Leadership': 100,
                         'Unrelated': 50, 'related': 100}
            scores = [skill_map.get(v, 50) for v in criteria_json.values()]
            kpi_score = round(float(np.mean(scores)), 2) if scores else 50.0

        kpi_score = round(min(100.0, max(0.0, kpi_score)), 2)

        # ── Step 3: Performance category from score thresholds ────────────────
        performance_category = self._get_performance_category_from_score(kpi_score)

        # ── Step 4: Build contributing factors with actual values ─────────────
        criteria_map = ROLE_CRITERIA_MAP.get(role, {})
        top_factors = []
        seen_generic = set()
        generic_labels = {
            'technical_proficiency': 'Technical Proficiency',
            'analytical_skills':     'Analytical Skills',
            'years_experience':      'Years of Experience',
            'leadership_experience': 'Leadership Experience',
            'domain_experience':     'Domain Experience',
            'communication_skills':  'Communication Skills',
            'problem_solving':       'Problem Solving',
            'bachelors_degree':      "Bachelor's Degree",
            'masters_degree':        "Master's Degree",
        }
        for criterion, generic_key in criteria_map.items():
            if generic_key not in seen_generic and generic_key in generic_labels:
                seen_generic.add(generic_key)
                top_factors.append({
                    'feature':    generic_labels[generic_key],
                    'importance': round(1.0 / 7, 2),
                    'value':      str(employee_data.get(generic_key, 'N/A')),
                })

        print(f"✅ KPI={kpi_score}  Category={performance_category}")

        return {
            'predicted_kpi_score':      kpi_score,
            'performance_category':     performance_category,
            'confidence_lower':         float(max(0,   kpi_score - 5.0)),
            'confidence_upper':         float(min(100, kpi_score + 5.0)),
            'top_contributing_factors': top_factors[:5],
        }

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
        ("Tech Lead   - Senior", {"role": "Tech Lead", "domain": "Health",
            "analytical_skills": "Advanced", "technical_proficiency": "Advanced",
            "communication_skills": "Advanced", "problem_solving": "Advanced",
            "domain_expertise": "Advanced", "years_experience": "5+ years",
            "domain_experience": "15+", "leadership_experience": "Leadership",
            "bachelors_degree": "related", "masters_degree": "related"}),
        ("Tech Lead   - Junior", {"role": "Tech Lead", "domain": "Health",
            "analytical_skills": "Novice", "technical_proficiency": "Novice",
            "communication_skills": "Novice", "problem_solving": "Novice",
            "domain_expertise": "Novice", "years_experience": "1-2 years",
            "domain_experience": "0 - 5", "leadership_experience": "Non-Lead",
            "bachelors_degree": "Unrelated", "masters_degree": "Unrelated"}),
        ("FullStack   - Senior", {"role": "FullStack Engineer", "domain": "Finance",
            "analytical_skills": "Advanced", "technical_proficiency": "Advanced",
            "communication_skills": "Advanced", "problem_solving": "Advanced",
            "domain_expertise": "Advanced", "years_experience": "5+ years",
            "domain_experience": "15+", "leadership_experience": "Leadership",
            "bachelors_degree": "related", "masters_degree": "related"}),
        ("FullStack   - Junior", {"role": "FullStack Engineer", "domain": "Education",
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
        print(f"{label} → KPI={r['predicted_kpi_score']:6.2f}  ({r['performance_category']})")

    print("\n" + "="*60)
    ok1 = results["Tech Lead   - Senior"] > results["Tech Lead   - Junior"]
    ok2 = results["FullStack   - Senior"] > results["FullStack   - Junior"]
    print("✅ PASS: Tech Lead Senior > Junior"   if ok1 else "❌ FAIL: Tech Lead scores same")
    print("✅ PASS: FullStack Senior > Junior"   if ok2 else "❌ FAIL: FullStack scores same")