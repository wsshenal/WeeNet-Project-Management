import os
import pickle
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load ML model and encoders
print("Loading budget forecasting model...")
try:
    with open('artifacts/budget_model.pkl', 'rb') as f:
        budget_model = pickle.load(f)
    with open('artifacts/budget_encoders.pkl', 'rb') as f:
        budget_encoders = pickle.load(f)
    print("[OK] Model loaded successfully!")
except Exception as e:
    print(f"⚠ Warning: Could not load model - {e}")
    budget_model = None
    budget_encoders = None

def predict_budget(data_json):
    """Predict actual budget using ML model"""
    try:
        # Prepare features in the exact order used during training
        features_df = pd.DataFrame({
            'Domain': [data_json.get('Domain', 'E-Commerce')],
            'Complexity Level': [data_json.get('Complexity_Level', data_json.get('Complexity Level', 'Medium'))],
            'Mobile': [int(data_json.get('Mobile', 0))],
            'Desktop': [int(data_json.get('Desktop', 0))],
            'Web': [int(data_json.get('Web', 1))],
            'IoT': [int(data_json.get('IoT', 0))],
            'Expected Team Size': [int(data_json.get('Expected_Team_Size', data_json.get('Expected Team Size', 5)))],
            'Expected Budget': [float(data_json.get('Expected_Budget', data_json.get('Expected Budget', 50000)))],
            'Date_Difference': [int(data_json.get('Date_Difference', 0))],
            'Risk': [int(data_json.get('Risk', 2))],
        })
        
        # Add platform count
        features_df['Platform_Count'] = (
            features_df['Mobile'] + features_df['Desktop'] + 
            features_df['Web'] + features_df['IoT']
        )
        
        # Encode categorical features
        for col in ['Domain', 'Complexity Level']:
            if col in budget_encoders:
                try:
                    features_df[col] = budget_encoders[col].transform(features_df[col].astype(str))
                except:
                    # Handle unknown categories
                    features_df[col] = 0
        
        # Predict
        predicted_budget = budget_model.predict(features_df)[0]
        expected_budget = features_df['Expected Budget'].values[0]
        variance = predicted_budget - expected_budget
        variance_percent = (variance / expected_budget) * 100
        
        # Classify risk
        if abs(variance_percent) < 10:
            budget_risk = "Low Risk"
            risk_color = "green"
        elif abs(variance_percent) < 25:
            budget_risk = "Medium Risk"
            risk_color = "orange"
        else:
            budget_risk = "High Risk"
            risk_color = "red"
        
        # Generate insights
        insights = f"""
**Budget Assessment:**
- Expected Budget: ${expected_budget:,.2f}
- Predicted Actual: ${predicted_budget:,.2f}
- Variance: ${variance:,.2f} ({variance_percent:+.1f}%)

**Key Factors:**
- Risk Level: {data_json.get('Risk', 'Medium')}
- Complexity: {features_df['Complexity Level'].values[0]}
- Platform Count: {features_df['Platform_Count'].values[0]}
- Team Size: {features_df['Expected Team Size'].values[0]}

**Recommendations:**
1. Monitor budget closely if variance > 15%
2. Consider reducing scope if over budget
3. Allocate contingency fund for high-risk projects
4. Review team efficiency and productivity

**Risk Mitigation:**
- Set up weekly budget reviews
- Track actual spending vs predicted
- Identify cost-saving opportunities early
- Maintain buffer for unexpected expenses
"""
        
        return {
            'expected_budget': float(expected_budget),
            'predicted_budget': round(float(predicted_budget), 2),
            'variance': round(float(variance), 2),
            'variance_percent': round(float(variance_percent), 2),
            'budget_risk': budget_risk,
            'risk_color': risk_color,
            'confidence_score': 0.85,
            'ai_insights': insights,
            'features_used': {
                'domain': str(data_json.get('Domain')),
                'platforms': int(features_df['Platform_Count'].values[0]),
                'team_size': int(features_df['Expected Team Size'].values[0]),
                'risk': int(data_json.get('Risk')),
                'complexity': str(features_df['Complexity Level'].values[0])
            }
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'expected_budget': 0,
            'predicted_budget': 0,
            'variance': 0,
            'variance_percent': 0,
            'budget_risk': 'Unknown',
            'ai_insights': f'Error: {str(e)}'
        }

@app.route('/', methods=['GET'])
def home():
    """API home endpoint"""
    return jsonify({
        'message': 'Budget Forecasting API',
        'version': '1.0.0',
        'endpoints': {
            '/': 'API information',
            '/health': 'Health check',
            '/predict': 'Budget prediction (POST)',
            '/projects': 'List sample projects (GET)'
        }
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': budget_model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Budget prediction endpoint"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        if budget_model is None:
            return jsonify({'error': 'Model not loaded. Please train the model first.'}), 500
        
        result = predict_budget(data)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/projects', methods=['GET'])
def get_projects():
    """Get sample projects for testing"""
    try:
        df = pd.read_excel('../data/project_details.xlsx')
        projects = df.head(10).to_dict('records')
        return jsonify({'projects': projects, 'total': len(df)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("BUDGET FORECASTING API SERVER")
    print("=" * 70)
    print("\nStarting server on http://127.0.0.1:5002")
    print("API Endpoints:")
    print("  GET  /           - API information")
    print("  GET  /health     - Health check")
    print("  POST /predict    - Budget prediction")
    print("  GET  /projects   - Sample projects")
    print("\n" + "=" * 70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5002)
