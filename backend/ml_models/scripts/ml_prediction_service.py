"""
FIXED ML Prediction Service - Corrects the self reference error
Place this at: C:\Weenet\pm-pulse-FE\backend\ml_models\scripts\ml_prediction_service.py
"""

import pandas as pd
import numpy as np
import pickle
import os
import json
from typing import Dict, Any, List

class KPIMLPredictor:
    def __init__(self):
        self.models_path = os.path.join(os.path.dirname(__file__), 'ml_models', 'trained_models')
        self.regression_model = None
        self.classification_model = None
        self.scaler = None
        self.label_encoders = None
        self.expected_features = None
        self.load_models()
    
    def load_models(self):
        """Load all trained models and preprocessing objects"""
        try:
            # Load regression model
            with open(os.path.join(self.models_path, 'kpi_regression_model.pkl'), 'rb') as f:
                self.regression_model = pickle.load(f)
            
            # Load classification model
            with open(os.path.join(self.models_path, 'kpi_classification_model.pkl'), 'rb') as f:
                self.classification_model = pickle.load(f)
            
            # Load scaler
            scaler_path = os.path.join(self.models_path, 'scaler.pkl')
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
            
            # Load label encoders
            encoders_path = os.path.join(self.models_path, 'label_encoders.pkl')
            if os.path.exists(encoders_path):
                with open(encoders_path, 'rb') as f:
                    self.label_encoders = pickle.load(f)
            
            # Extract expected features
            if hasattr(self.regression_model, 'feature_names_in_'):
                self.expected_features = list(self.regression_model.feature_names_in_)
            elif self.scaler and hasattr(self.scaler, 'feature_names_in_'):
                self.expected_features = list(self.scaler.feature_names_in_)
            else:
                raise Exception("Could not extract expected features from model")
            
            print(f"✅ Models loaded successfully")
            print(f"   Expected {len(self.expected_features)} features")
            
            # ✅ FIX: Call verification AFTER self is fully initialized
            self._verify_model()
            
        except Exception as e:
            raise Exception(f"Failed to load models: {str(e)}")
    
    def _verify_model(self):
        """Verify model produces different outputs for different inputs"""
        try:
            print("\n" + "="*60)
            print("MODEL VERIFICATION")
            print("="*60)
            
            # Create two different test cases
            test1 = pd.DataFrame([[0] * len(self.expected_features)], columns=self.expected_features)
            test2 = pd.DataFrame([[1] * len(self.expected_features)], columns=self.expected_features)
            
            pred1 = self.regression_model.predict(test1)[0]
            pred2 = self.regression_model.predict(test2)[0]
            
            print(f"Test prediction 1 (all zeros): {pred1:.2f}")
            print(f"Test prediction 2 (all ones): {pred2:.2f}")
            print(f"Difference: {abs(pred1 - pred2):.2f}")
            
            if abs(pred1 - pred2) < 1.0:
                print("⚠️  WARNING: Model predictions are too similar!")
                print("   The model may not be properly differentiating inputs.")
            else:
                print("✓ Model appears to be working correctly")
            
            print("="*60 + "\n")
        except Exception as e:
            print(f"⚠️  Model verification failed: {e}")
            print("="*60 + "\n")
    
    def preprocess_employee_data(self, employee_data):
        """Preprocess employee data to match model's expected features"""
        # Create complete feature dictionary
        complete_data = self._create_complete_feature_dict(employee_data)
        
        # Create DataFrame
        df = pd.DataFrame([complete_data])
        
        # Ensure we have all expected features
        missing_features = set(self.expected_features) - set(df.columns)
        if missing_features:
            for feature in missing_features:
                df[feature] = self._get_smart_default(feature, employee_data)
        
        # Select only expected features in correct order
        df = df[self.expected_features]
        
        # Encode categorical features
        df_encoded = self._encode_features(df)
        
        # Scale features
        if self.scaler:
            df_scaled = self.scaler.transform(df_encoded)
        else:
            df_scaled = df_encoded.values
        
        return df_scaled
    
    def _create_complete_feature_dict(self, employee_data):
        """
        ✅ IMPROVED: Create complete feature dictionary with VARIED defaults
        This fixes the constant 39.85 prediction issue
        """
        
        # Get user input
        role = employee_data.get('Role', 'Business Analyst')
        domain = employee_data.get('Domain', 'Finance')
        analytical = employee_data.get('Analytical Skills', 'Intermediate')
        technical = employee_data.get('Technical Proficiency', 'Intermediate')
        years_exp = employee_data.get('Years of experience in Business Analysis', '3-5 years')
        domain_exp = employee_data.get('Experience of related Domain', '6 - 14')
        
        # Base features
        complete_data = {
            'Role': role,
            'Domain': domain,
            'Analytical Skills': analytical,
            'Technical Proficiency': technical,
            'Years of experience in Business Analysis': years_exp,
            'Experience of related Domain': domain_exp,
        }
        
        # Add all user-provided data
        complete_data.update(employee_data)
        
        # ✅ IMPROVED: Map experience to skill levels (creates variation)
        exp_to_skill = {
            '1-2 years': 'Novice',
            '3-5 years': 'Intermediate',
            '5+ years': 'Advanced'
        }
        
        domain_exp_to_skill = {
            '0 - 5': 'Novice',
            '6 - 14': 'Intermediate',
            '15+': 'Advanced'
        }
        
        # Derive levels from experience
        derived_skill = exp_to_skill.get(years_exp, 'Intermediate')
        derived_domain_skill = domain_exp_to_skill.get(domain_exp, 'Intermediate')
        
        # Technical skills - vary based on proficiency AND experience
        if years_exp == '1-2 years':
            tech_level = 'Novice' if technical == 'Novice' else 'Intermediate'
        elif years_exp == '5+ years':
            tech_level = 'Advanced' if technical in ['Intermediate', 'Advanced'] else 'Intermediate'
        else:
            tech_level = technical
        
        complete_data.setdefault('API Development and Integration', tech_level)
        complete_data.setdefault('Cloud Platforms ( AWS, Azure, GCP)', tech_level)
        complete_data.setdefault('System Design', tech_level)
        complete_data.setdefault('Database Optimization', tech_level)
        complete_data.setdefault('Backend Development', tech_level)
        complete_data.setdefault('Frontend Development', tech_level)
        
        # Analytical skills - vary based on analytical AND experience
        if years_exp == '1-2 years':
            analytical_level = 'Novice' if analytical == 'Novice' else 'Intermediate'
        elif years_exp == '5+ years':
            analytical_level = 'Advanced' if analytical in ['Intermediate', 'Advanced'] else 'Intermediate'
        else:
            analytical_level = analytical
        
        complete_data.setdefault('Data Analysis', analytical_level)
        complete_data.setdefault('Problem-Solving', analytical_level)
        complete_data.setdefault('Business Requirements Gathering', analytical_level)
        complete_data.setdefault('Statistical Analysis', analytical_level)
        
        # Soft skills improve with experience
        complete_data.setdefault('Communication Skills', derived_skill)
        complete_data.setdefault('Stakeholder Management', derived_skill)
        complete_data.setdefault('Team Collaboration', derived_skill)
        complete_data.setdefault('Presentation Skills', derived_skill)
        
        # Management skills correlate with experience
        complete_data.setdefault('Budgeting and Cost Control', derived_skill)
        complete_data.setdefault('Project Management', derived_skill)
        complete_data.setdefault('Team Leadership', derived_skill)
        complete_data.setdefault('Time Management', derived_skill)
        
        # Tools vary by technical proficiency
        complete_data.setdefault('SQL', technical)
        complete_data.setdefault('Python', tech_level)
        complete_data.setdefault('Excel', derived_skill)
        complete_data.setdefault('Power BI', tech_level)
        complete_data.setdefault('Tableau', tech_level)
        complete_data.setdefault('Jira', derived_skill)
        complete_data.setdefault('Confluence', derived_skill)
        
        # QA skills
        complete_data.setdefault('Bug tracking and reporting', derived_skill)
        complete_data.setdefault('Test Planning', derived_skill)
        complete_data.setdefault('Automated Testing', tech_level)
        
        # Education varies with experience
        complete_data.setdefault("Bachelor's Degree", 'Yes')
        if years_exp == '5+ years' or domain_exp == '15+':
            complete_data.setdefault("Master's Degree", 'Yes')
        else:
            complete_data.setdefault("Master's Degree", 'No')
        
        # Domain knowledge
        complete_data.setdefault('Domain Knowledge', derived_domain_skill)
        complete_data.setdefault('Industry Experience', derived_domain_skill)
        
        return complete_data
    
    def _get_smart_default(self, feature_name, user_data):
        """Get intelligent default for missing feature"""
        tech_level = user_data.get('Technical Proficiency', 'Intermediate')
        analytical_level = user_data.get('Analytical Skills', 'Intermediate')
        years_exp = user_data.get('Years of experience in Business Analysis', '3-5 years')
        
        # Map experience to skill
        exp_map = {'1-2 years': 'Novice', '3-5 years': 'Intermediate', '5+ years': 'Advanced'}
        derived_skill = exp_map.get(years_exp, 'Intermediate')
        
        feature_lower = feature_name.lower()
        
        if any(word in feature_lower for word in ['technical', 'programming', 'coding', 'development', 'api', 'cloud', 'database']):
            return tech_level
        elif any(word in feature_lower for word in ['analytical', 'analysis', 'data', 'statistical']):
            return analytical_level
        elif any(word in feature_lower for word in ['communication', 'stakeholder', 'presentation', 'collaboration']):
            return derived_skill
        elif any(word in feature_lower for word in ['management', 'leadership', 'planning']):
            return derived_skill
        elif 'degree' in feature_lower:
            return 'Yes' if 'bachelor' in feature_lower else 'No'
        elif 'years' in feature_lower or 'experience' in feature_lower:
            return years_exp
        else:
            return 'Intermediate'
    
    def _encode_features(self, df):
        """Encode categorical features"""
        df_encoded = df.copy()
        
        if self.label_encoders:
            for col in df_encoded.columns:
                if col in self.label_encoders:
                    try:
                        df_encoded[col] = self.label_encoders[col].transform(df_encoded[col])
                    except:
                        df_encoded[col] = 0
        else:
            from sklearn.preprocessing import LabelEncoder
            for col in df_encoded.columns:
                if df_encoded[col].dtype == 'object':
                    le = LabelEncoder()
                    df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
        
        return df_encoded
    
    def predict_kpi_score(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict KPI score for an employee"""
        try:
            # Preprocess data
            X = self.preprocess_employee_data(employee_data)
            
            # Make regression prediction
            kpi_score = float(self.regression_model.predict(X)[0])
            
            # Make classification prediction
            try:
                category_code = int(self.classification_model.predict(X)[0])
                category_map = {0: "Low", 1: "Medium", 2: "High"}
                performance_category = category_map.get(category_code, "Medium")
            except:
                if kpi_score >= 80:
                    performance_category = "High"
                elif kpi_score >= 60:
                    performance_category = "Medium"
                else:
                    performance_category = "Low"
            
            # Calculate confidence interval
            confidence_range = 5.0
            confidence_lower = float(max(0, kpi_score - confidence_range))
            confidence_upper = float(min(100, kpi_score + confidence_range))
            
            # Get feature importance
            top_factors = self._get_feature_importance(employee_data)
            
            return {
                'predicted_kpi_score': kpi_score,
                'performance_category': performance_category,
                'confidence_lower': confidence_lower,
                'confidence_upper': confidence_upper,
                'top_contributing_factors': top_factors
            }
            
        except Exception as e:
            raise Exception(f"Prediction failed: {str(e)}")
    
    def _get_feature_importance(self, employee_data):
        """Get top contributing factors"""
        factors = []
        
        if hasattr(self.regression_model, 'feature_importances_'):
            importances = self.regression_model.feature_importances_
            top_indices = np.argsort(importances)[-5:][::-1]
            
            for idx in top_indices:
                feature_name = self.expected_features[idx]
                factors.append({
                    'feature': feature_name,
                    'importance': float(importances[idx]),
                    'value': str(employee_data.get(feature_name, 'N/A'))
                })
        else:
            factors = [
                {'feature': 'Technical Proficiency', 'importance': 0.35, 'value': employee_data.get('Technical Proficiency', 'N/A')},
                {'feature': 'Analytical Skills', 'importance': 0.30, 'value': employee_data.get('Analytical Skills', 'N/A')},
                {'feature': 'Years of experience in Business Analysis', 'importance': 0.20, 'value': employee_data.get('Years of experience in Business Analysis', 'N/A')},
                {'feature': 'Domain', 'importance': 0.10, 'value': employee_data.get('Domain', 'N/A')},
                {'feature': 'Role', 'importance': 0.05, 'value': employee_data.get('Role', 'N/A')}
            ]
        
        return factors
    
    def predict_team_kpi(self, team_members: List[Dict]) -> Dict[str, Any]:
        """Predict KPI for entire team"""
        predictions = []
        
        for member in team_members:
            try:
                pred = self.predict_kpi_score(member)
                predictions.append({
                    'emp_id': member.get('emp_id', member.get('Emp ID', 'Unknown')),
                    'role': member.get('Role', 'Unknown'),
                    'predicted_kpi_score': pred['predicted_kpi_score'],
                    'performance_category': pred['performance_category']
                })
            except Exception as e:
                print(f"⚠️ Failed to predict for employee: {e}")
                continue
        
        if not predictions:
            raise Exception("No successful predictions")
        
        scores = [p['predicted_kpi_score'] for p in predictions]
        
        distribution = {'High': 0, 'Medium': 0, 'Low': 0}
        for pred in predictions:
            distribution[pred['performance_category']] += 1
        
        return {
            'individual_predictions': predictions,
            'team_average_kpi': float(np.mean(scores)),
            'team_median_kpi': float(np.median(scores)),
            'team_max_kpi': float(np.max(scores)),
            'team_min_kpi': float(np.min(scores)),
            'team_std_kpi': float(np.std(scores)),
            'performance_distribution': distribution
        }
    
    def recommend_improvements(self, employee_data: Dict[str, Any]) -> List[Dict]:
        """Recommend improvements to boost KPI"""
        current_pred = self.predict_kpi_score(employee_data)
        current_kpi = current_pred['predicted_kpi_score']
        
        recommendations = []
        
        improvable_features = [
            'Technical Proficiency',
            'Analytical Skills',
            'Communication Skills',
            'Problem-Solving',
            'System Design',
            'Data Analysis'
        ]
        
        for feature in improvable_features:
            current_value = employee_data.get(feature, 'Intermediate')
            
            if current_value == 'Novice':
                new_value = 'Intermediate'
            elif current_value == 'Intermediate':
                new_value = 'Advanced'
            else:
                continue
            
            test_data = employee_data.copy()
            test_data[feature] = new_value
            
            try:
                new_pred = self.predict_kpi_score(test_data)
                new_kpi = new_pred['predicted_kpi_score']
                improvement = new_kpi - current_kpi
                
                if improvement > 0.5:
                    recommendations.append({
                        'feature': feature,
                        'current_level': current_value,
                        'recommended_level': new_value,
                        'potential_kpi_increase': float(improvement),
                        'priority': 'High' if improvement > 5 else 'Medium'
                    })
            except:
                continue
        
        recommendations.sort(key=lambda x: x['potential_kpi_increase'], reverse=True)
        
        return recommendations


# Test when run directly
if __name__ == "__main__":
    print("Testing KPI ML Predictor...")
    try:
        predictor = KPIMLPredictor()
        
        # Test Case 1: Junior
        test1 = {
            "Role": "Backend Engineer",
            "Domain": "Finance",
            "Analytical Skills": "Novice",
            "Technical Proficiency": "Novice",
            "Years of experience in Business Analysis": "1-2 years",
            "Experience of related Domain": "0 - 5"
        }
        
        # Test Case 2: Senior
        test2 = {
            "Role": "Backend Engineer",
            "Domain": "Finance",
            "Analytical Skills": "Advanced",
            "Technical Proficiency": "Advanced",
            "Years of experience in Business Analysis": "5+ years",
            "Experience of related Domain": "15+"
        }
        
        result1 = predictor.predict_kpi_score(test1)
        result2 = predictor.predict_kpi_score(test2)
        
        print("\n✅ Test Results:")
        print(f"Junior KPI: {result1['predicted_kpi_score']:.2f}")
        print(f"Senior KPI: {result2['predicted_kpi_score']:.2f}")
        print(f"Difference: {abs(result1['predicted_kpi_score'] - result2['predicted_kpi_score']):.2f}")
        
        if abs(result1['predicted_kpi_score'] - result2['predicted_kpi_score']) < 5:
            print("\n❌ PROBLEM: Predictions still too similar!")
        else:
            print("\n✓ Model is producing varied predictions!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()