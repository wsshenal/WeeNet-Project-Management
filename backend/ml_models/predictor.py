"""
KPI Prediction Module
Makes predictions using trained ML model
"""

import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any

class KPIPredictor:
    """ML-based KPI predictor"""
    
    def __init__(self, model_dir='artifacts/kpi_models/'):
        """Load trained model and preprocessors"""
        self.model_dir = model_dir
        self.model = None
        self.encoders = None
        self.scaler = None
        self.feature_cols = None
        self.load_artifacts()
    
    def load_artifacts(self):
        """Load all model artifacts"""
        try:
            # Load model
            with open(f'{self.model_dir}/kpi_best_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            
            # Load encoders
            with open(f'{self.model_dir}/kpi_encoders.pkl', 'rb') as f:
                self.encoders = pickle.load(f)
            
            # Load scaler
            with open(f'{self.model_dir}/kpi_scaler.pkl', 'rb') as f:
                self.scaler = pickle.load(f)
            
            # Load feature columns
            with open(f'{self.model_dir}/feature_columns.pkl', 'rb') as f:
                self.feature_cols = pickle.load(f)
            
            print("✅ Model artifacts loaded successfully")
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise
    
    def preprocess_input(self, employee_data: Dict[str, Any]) -> np.ndarray:
        """
        Preprocess employee data for prediction
        
        Args:
            employee_data: Dictionary with employee attributes
            
        Returns:
            Scaled feature array ready for prediction
        """
        input_data = []
        
        for col in self.feature_cols:
            # Get value from input or use default
            value = employee_data.get(col)
            
            # Handle missing values with defaults
            if value is None:
                if col in ['analytical_skills', 'technical_proficiency', 
                          'communication_skills', 'problem_solving', 'domain_expertise']:
                    value = 'Intermediate'
                elif col == 'years_experience':
                    value = '3-5 years'
                elif col == 'domain_experience':
                    value = '6 - 14'
                elif col == 'leadership_experience':
                    value = 'Non-Lead'
                elif col in ['bachelors_degree', 'masters_degree']:
                    value = 'related'
                elif col == 'role':
                    value = 'Backend Engineer'
                elif col == 'domain':
                    value = 'Finance'
            
            # Encode categorical value
            if col in self.encoders:
                try:
                    encoded_value = self.encoders[col].transform([value])[0]
                except ValueError:
                    # If value not seen during training, use mode (most common)
                    encoded_value = 0
                    print(f"⚠️ Unknown value '{value}' for '{col}', using default")
            else:
                encoded_value = value
            
            input_data.append(encoded_value)
        
        # Convert to array and reshape
        X = np.array(input_data).reshape(1, -1)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        return X_scaled
    
    def predict(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict KPI for an employee
        
        Args:
            employee_data: Dictionary with employee attributes
            
        Returns:
            Dictionary with prediction results
        """
        # Preprocess input
        X = self.preprocess_input(employee_data)
        
        # Make prediction
        kpi_prediction = self.model.predict(X)[0]
        
        # Calculate confidence interval (for ensemble models)
        confidence_interval = self._calculate_confidence_interval(X)
        
        # Get feature contributions
        feature_contributions = self._get_feature_contributions(X, employee_data)
        
        # Generate explanation
        explanation = self._generate_explanation(
            kpi_prediction, 
            feature_contributions,
            employee_data
        )
        
        result = {
            'predicted_kpi': round(float(kpi_prediction), 2),
            'confidence_interval': confidence_interval,
            'feature_contributions': feature_contributions,
            'model_type': type(self.model).__name__,
            'prediction_explanation': explanation,
            'performance_category': self._get_performance_category(kpi_prediction)
        }
        
        return result
    
    def _calculate_confidence_interval(self, X: np.ndarray) -> Dict[str, float]:
        """Calculate prediction confidence interval"""
        if hasattr(self.model, 'estimators_'):
            # For ensemble models
            predictions = np.array([
                estimator.predict(X)[0] 
                for estimator in self.model.estimators_
            ])
            
            return {
                'lower': float(np.percentile(predictions, 5)),
                'upper': float(np.percentile(predictions, 95)),
                'std': float(np.std(predictions))
            }
        else:
            # For non-ensemble models, use approximate interval
            pred = self.model.predict(X)[0]
            std = 5.0  # Approximate standard deviation
            return {
                'lower': float(max(0, pred - 1.96 * std)),
                'upper': float(min(100, pred + 1.96 * std)),
                'std': std
            }
    
    def _get_feature_contributions(self, X: np.ndarray, 
                                   employee_data: Dict[str, Any]) -> Dict[str, Dict]:
        """Get feature importance contributions"""
        contributions = {}
        
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            
            for i, col in enumerate(self.feature_cols):
                contributions[col] = {
                    'importance': float(importances[i]),
                    'value': employee_data.get(col, 'N/A'),
                    'encoded_value': float(X[0, i])
                }
        
        return contributions
    
    def _generate_explanation(self, kpi_score: float, 
                             contributions: Dict, 
                             employee_data: Dict) -> str:
        """Generate human-readable explanation"""
        
        # Sort by importance
        sorted_contrib = sorted(
            contributions.items(),
            key=lambda x: x[1]['importance'],
            reverse=True
        )[:3]
        
        explanation = f"Predicted KPI Score: {kpi_score:.1f}/100\n\n"
        explanation += "Key factors influencing this prediction:\n"
        
        for feature, data in sorted_contrib:
            importance_pct = data['importance'] * 100
            value = data['value']
            feature_name = feature.replace('_', ' ').title()
            
            explanation += f"• {feature_name}: {value} ({importance_pct:.1f}% impact)\n"
        
        # Add category
        category = self._get_performance_category(kpi_score)
        explanation += f"\nPerformance Category: {category}"
        
        return explanation
    
    def _get_performance_category(self, kpi_score: float) -> str:
        """Categorize performance based on KPI score"""
        if kpi_score >= 85:
            return "Exceptional Performance"
        elif kpi_score >= 70:
            return "Strong Performance"
        elif kpi_score >= 55:
            return "Good Performance"
        elif kpi_score >= 40:
            return "Average Performance"
        else:
            return "Needs Improvement"
    
    def predict_batch(self, employees: list) -> list:
        """Predict KPI for multiple employees"""
        results = []
        for emp_data in employees:
            try:
                prediction = self.predict(emp_data)
                prediction['emp_id'] = emp_data.get('emp_id', 'Unknown')
                results.append(prediction)
            except Exception as e:
                print(f"Error predicting for employee: {e}")
                results.append({
                    'emp_id': emp_data.get('emp_id', 'Unknown'),
                    'error': str(e)
                })
        
        return results

# Convenience function for quick predictions
def quick_predict(employee_data: Dict[str, Any]) -> Dict[str, Any]:
    """Quick prediction function"""
    predictor = KPIPredictor()
    return predictor.predict(employee_data)

if __name__ == "__main__":
    # Test prediction
    test_employee = {
        'role': 'Backend Engineer',
        'domain': 'Finance',
        'analytical_skills': 'Advanced',
        'technical_proficiency': 'Advanced',
        'communication_skills': 'Intermediate',
        'problem_solving': 'Advanced',
        'domain_expertise': 'Intermediate',
        'years_experience': '5+ years',
        'domain_experience': '6 - 14',
        'leadership_experience': 'Non-Lead',
        'bachelors_degree': 'related',
        'masters_degree': 'Unrelated'
    }
    
    predictor = KPIPredictor()
    result = predictor.predict(test_employee)
    
    print("\n" + "=" * 70)
    print("TEST PREDICTION")
    print("=" * 70)
    print(f"\nPredicted KPI: {result['predicted_kpi']}")
    print(f"Category: {result['performance_category']}")
    print(f"\nConfidence Interval: {result['confidence_interval']['lower']:.1f} - {result['confidence_interval']['upper']:.1f}")
    print(f"\n{result['prediction_explanation']}")