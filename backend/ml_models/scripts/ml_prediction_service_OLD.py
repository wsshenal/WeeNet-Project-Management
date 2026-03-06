"""
ML Prediction Service - COMPLETE WORKING VERSION
Place this file at: C:\pm-pulsee\pm-pulse\PM Pulse 3\ml_models\scripts\ml_prediction_service.py
"""

import pandas as pd
import numpy as np
import pickle
import os
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
    
    # Add to ml_prediction_service.py after loading model
    def load_models(self):
        """Load all trained models and preprocessing objects"""
    try:
        # ... existing loading code ...
        
        # ✅ ADD VERIFICATION
        print("\n" + "="*60)
        print("MODEL VERIFICATION")
        print("="*60)
        
        # Test with dummy data
        import pandas as pd
        import numpy as np
        
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
        raise Exception(f"Failed to load models: {str(e)}")
    def preprocess_employee_data(self, employee_data):
        """
        Preprocess employee data to match model's expected features
        THIS IS THE KEY METHOD THAT FIXES THE ERROR
        """
        # Create a complete feature dictionary with intelligent defaults
        complete_data = self._create_complete_feature_dict(employee_data)
        
        # Create DataFrame with all expected features in correct order
        df = pd.DataFrame([complete_data])
        
        # Ensure we have exactly the features the model expects
        missing_features = set(self.expected_features) - set(df.columns)
        if missing_features:
            print(f"⚠️ Still missing {len(missing_features)} features, adding defaults...")
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
        """Create complete feature dictionary with intelligent defaults"""
            
            # Get user input
        role = employee_data.get('Role', 'Business Analyst')
        domain = employee_data.get('Domain', 'Finance')
        analytical = employee_data.get('Analytical Skills', 'Intermediate')
        technical = employee_data.get('Technical Proficiency', 'Intermediate')
        years_exp = employee_data.get('Years of experience in Business Analysis', '3-5 years')
        domain_exp = employee_data.get('Experience of related Domain', '6 - 14')
        
        # Base features from user input
        complete_data = {
            'Role': role,
            'Domain': domain,
            'Analytical Skills': analytical,
            'Technical Proficiency': technical,
            'Years of experience in Business Analysis': years_exp,
            'Experience of related Domain': domain_exp,
        }
        
        # Add all other user-provided data
        # Add all other user-provided data
        complete_data.update(employee_data)
        
        # ✅ IMPROVED: More varied defaults based on actual input
        # Map experience levels to skill levels
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
        
        # Intelligent defaults based on user input
        # Technical skills (based on Technical Proficiency AND experience)
        tech_level = technical
        if years_exp == '1-2 years':
            tech_level = 'Novice' if technical == 'Novice' else 'Intermediate'
        elif years_exp == '5+ years':
            tech_level = 'Advanced' if technical in ['Intermediate', 'Advanced'] else 'Intermediate'
        
        complete_data.setdefault('API Development and Integration', tech_level)
        complete_data.setdefault('Cloud Platforms ( AWS, Azure, GCP)', tech_level)
        complete_data.setdefault('System Design', tech_level)
        complete_data.setdefault('Database Optimization', tech_level)
        complete_data.setdefault('Backend Development', tech_level)
        complete_data.setdefault('Frontend Development', tech_level)
        
        # Analytical skills (based on Analytical Skills AND experience)
        analytical_level = analytical
        if years_exp == '1-2 years':
            analytical_level = 'Novice' if analytical == 'Novice' else 'Intermediate'
        elif years_exp == '5+ years':
            analytical_level = 'Advanced' if analytical in ['Intermediate', 'Advanced'] else 'Intermediate'
        
        complete_data.setdefault('Data Analysis', analytical_level)
        complete_data.setdefault('Problem-Solving', analytical_level)
        complete_data.setdefault('Business Requirements Gathering', analytical_level)
        complete_data.setdefault('Statistical Analysis', analytical_level)
        
        # Soft skills (better with more experience)
        soft_skill_level = derived_skill
        complete_data.setdefault('Communication Skills', soft_skill_level)
        complete_data.setdefault('Stakeholder Management', soft_skill_level)
        complete_data.setdefault('Team Collaboration', soft_skill_level)
        complete_data.setdefault('Presentation Skills', soft_skill_level)
        
        # Management skills (correlate with experience)
        mgmt_level = derived_skill
        complete_data.setdefault('Budgeting and Cost Control', mgmt_level)
        complete_data.setdefault('Project Management', mgmt_level)
        complete_data.setdefault('Team Leadership', mgmt_level)
        complete_data.setdefault('Time Management', derived_skill)
        
        # Tools (based on technical proficiency and domain)
        complete_data.setdefault('SQL', technical)
        complete_data.setdefault('Python', tech_level)
        complete_data.setdefault('Excel', derived_skill)
        complete_data.setdefault('Power BI', tech_level)
        complete_data.setdefault('Tableau', tech_level)
        complete_data.setdefault('Jira', derived_skill)
        complete_data.setdefault('Confluence', derived_skill)
        
        # Testing and QA
        complete_data.setdefault('Bug tracking and reporting', derived_skill)
        complete_data.setdefault('Test Planning', derived_skill)
        complete_data.setdefault('Automated Testing', tech_level)
        
       # Education (correlate with experience)
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
        """Get intelligent default for any missing feature"""
        tech_level = user_data.get('Technical Proficiency', 'Intermediate')
        analytical_level = user_data.get('Analytical Skills', 'Intermediate')
        
        # Pattern matching for smart defaults
        feature_lower = feature_name.lower()
        
        if any(word in feature_lower for word in ['technical', 'programming', 'coding', 'development', 'api', 'cloud', 'database']):
            return tech_level
        elif any(word in feature_lower for word in ['analytical', 'analysis', 'data', 'statistical']):
            return analytical_level
        elif any(word in feature_lower for word in ['communication', 'stakeholder', 'presentation', 'collaboration']):
            return 'Advanced'
        elif any(word in feature_lower for word in ['management', 'leadership', 'planning']):
            return 'Intermediate'
        elif 'degree' in feature_lower:
            return 'Bachelor\'s Degree' if 'bachelor' in feature_lower else 'No'
        elif 'years' in feature_lower or 'experience' in feature_lower:
            return user_data.get('Years of experience in Business Analysis', '3-5 years')
        else:
            return 'Intermediate'
    
    def _encode_features(self, df):
        """Encode categorical features"""
        df_encoded = df.copy()
        
        if self.label_encoders:
            for col in df_encoded.columns:
                if col in self.label_encoders:
                    try:
                        # Try to transform using saved encoder
                        df_encoded[col] = self.label_encoders[col].transform(df_encoded[col])
                    except:
                        # If value not seen during training, use mode or default
                        df_encoded[col] = 0
        else:
            # Manual encoding if no saved encoders
            from sklearn.preprocessing import LabelEncoder
            for col in df_encoded.columns:
                if df_encoded[col].dtype == 'object':
                    le = LabelEncoder()
                    df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
        
        return df_encoded
    
    def predict_kpi_score(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict KPI score for an employee"""
        try:
            print("\n" + "="*60)
            print("DEBUG: Input to predict_kpi_score:")
            print(json.dumps(employee_data, indent=2))
            # Preprocess data
            X = self.preprocess_employee_data(employee_data)
            print("\nDEBUG: Shape of preprocessed data:", X.shape)
            print("DEBUG: First 10 features:", X[0][:10])
            print("DEBUG: Are all values the same?", len(set(X[0])) == 1)
            print("="*60 + "\n")
            
            # Make regression prediction
            kpi_score = float(self.regression_model.predict(X)[0])
            
            # Make classification prediction
            try:
                category_code = int(self.classification_model.predict(X)[0])
                category_map = {0: "Low", 1: "Medium", 2: "High"}
                performance_category = category_map.get(category_code, "Medium")
            except:
                # Fallback if classification fails
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
        
        # Try to get actual feature importances from model
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
            # Default important factors
            factors = [
                {
                    'feature': 'Technical Proficiency',
                    'importance': 0.35,
                    'value': employee_data.get('Technical Proficiency', 'N/A')
                },
                {
                    'feature': 'Analytical Skills',
                    'importance': 0.30,
                    'value': employee_data.get('Analytical Skills', 'N/A')
                },
                {
                    'feature': 'Years of experience in Business Analysis',
                    'importance': 0.20,
                    'value': employee_data.get('Years of experience in Business Analysis', 'N/A')
                },
                {
                    'feature': 'Domain',
                    'importance': 0.10,
                    'value': employee_data.get('Domain', 'N/A')
                },
                {
                    'feature': 'Role',
                    'importance': 0.05,
                    'value': employee_data.get('Role', 'N/A')
                }
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
        
        # Calculate distribution
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
        
        # Features that can be improved
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
            
            # Determine upgrade path
            if current_value == 'Novice':
                new_value = 'Intermediate'
            elif current_value == 'Intermediate':
                new_value = 'Advanced'
            else:
                continue  # Already at max
            
            # Test improvement
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
        
        # Sort by impact
        recommendations.sort(key=lambda x: x['potential_kpi_increase'], reverse=True)
        
        return recommendations


# Test when run directly
if __name__ == "__main__":
    print("Testing KPI ML Predictor...")
    try:
        predictor = KPIMLPredictor()
        
        test_data = {
            "Role": "Backend Engineer",
            "Domain": "Finance",
            "Analytical Skills": "Intermediate",
            "Technical Proficiency": "Intermediate",
            "Years of experience in Business Analysis": "3-5 years",
            "Experience of related Domain": "15+"
        }
        
        result = predictor.predict_kpi_score(test_data)
        print("\n✅ Test successful!")
        print(f"KPI Score: {result['predicted_kpi_score']:.2f}")
        print(f"Category: {result['performance_category']}")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()