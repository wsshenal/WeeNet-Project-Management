"""
REPLACEMENT for the /ml/career_advice endpoint in app.py
=========================================================
Drop-in replacement — same request/response schema.
No OpenAI API call. Uses CareerAdviceEngine (career_advice_model.pkl).

HOW TO INTEGRATE:
  1. Copy career_advice_model.pkl → your ml_models/trained_models/ directory
  2. Add this import at the top of app.py (after KPIMLPredictor import):
       from career_advice_service import CareerAdviceService
       career_advice_service = CareerAdviceService()
  3. Replace the existing @app.route('/ml/career_advice') function
     with the one below.
"""

import pickle
import os
import traceback


class CareerAdviceService:
    """Wrapper that loads the CareerAdviceEngine pickle."""

    def __init__(self, model_path: str = None):
        if model_path is None:
            # Auto-detect: same directory as this file, or trained_models subfolder
            base = os.path.dirname(__file__)
            candidates = [
                os.path.join(base, 'career_advice_model.pkl'),
                os.path.join(base,  'career_advice_model.pkl'),
                os.path.join(base, 'ml_models', 'career_advice_model.pkl'),
            ]
            model_path = next((p for p in candidates if os.path.exists(p)), candidates[0])

        with open(model_path, 'rb') as f:
            self.engine = pickle.load(f)
        print(f'✅ CareerAdviceService loaded from {model_path}')

    def get_advice(self, employee_data: dict, kpi_score: float, category: str) -> dict:
        return self.engine.generate_advice(employee_data, kpi_score, category)


# ── Paste this function into app.py to replace the existing /ml/career_advice ──

REPLACEMENT_ENDPOINT_CODE = '''
# At top of app.py, add:
# from career_advice_service import CareerAdviceService
# career_advice_service = CareerAdviceService()

@app.route('/ml/career_advice', methods=['POST'])
def career_advice():
    try:
        data          = request.json
        employee_data = data.get('employee_data', {})
        kpi_score     = float(data.get('kpi_score', 0))
        category      = data.get('category', 'Low')

        advice = career_advice_service.get_advice(employee_data, kpi_score, category)
        return jsonify({'status': 'success', 'advice': advice}), 200

    except Exception as e:
        return jsonify({
            'status':    'error',
            'message':   str(e),
            'traceback': traceback.format_exc()
        }), 400
'''

# ── Quick self-test ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import json

    svc = CareerAdviceService()

    # Mirrors the exact payload the frontend sends (from AddEmployee.jsx)
    test_payload = {
        'employee_data': {
            'role':                  'Quality Assurance Engineer',
            'domain':                'Finance',
            'analytical_skills':     'Intermediate',
            'technical_proficiency': 'Intermediate',
            'communication_skills':  'Intermediate',
            'problem_solving':       'Intermediate',
            'years_experience':      '1-2 years',
            'domain_experience':     '0 - 5',
            'leadership_experience': 'Non-Lead',
            'bachelors_degree':      'Unrelated',
            'masters_degree':        'Unrelated',
        },
        'kpi_score': 42.5,
        'category':  'Medium',
    }

    advice = svc.get_advice(
        test_payload['employee_data'],
        test_payload['kpi_score'],
        test_payload['category'],
    )

    print('\n' + '='*60)
    print('SAMPLE OUTPUT (same schema as GPT response)')
    print('='*60)
    print(json.dumps(advice, indent=2))
    print('\n✅ Frontend can consume this response without any changes.')