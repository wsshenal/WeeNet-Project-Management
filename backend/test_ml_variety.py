import sys
sys.path.append('ml_models/scripts')

from ml_prediction_service import KPIMLPredictor

predictor = KPIMLPredictor()

# Test Case 1: Junior Engineer
test1 = {
    "Role": "Backend Engineer",
    "Domain": "Finance",
    "Analytical Skills": "Novice",
    "Technical Proficiency": "Novice",
    "Years of experience in Business Analysis": "1-2 years",
    "Experience of related Domain": "0 - 5"
}

# Test Case 2: Senior Engineer  
test2 = {
    "Role": "Backend Engineer",
    "Domain": "Finance",
    "Analytical Skills": "Advanced",
    "Technical Proficiency": "Advanced",
    "Years of experience in Business Analysis": "5+ years",
    "Experience of related Domain": "15+"
}

# Test Case 3: Different Role
test3 = {
    "Role": "Frontend Engineer",
    "Domain": "E-Commerce",
    "Analytical Skills": "Intermediate",
    "Technical Proficiency": "Intermediate",
    "Years of experience in Business Analysis": "3-5 years",
    "Experience of related Domain": "6 - 14"
}

print("="*60)
print("TESTING ML MODEL VARIETY")
print("="*60)

result1 = predictor.predict_kpi_score(test1)
print(f"\nTest 1 (Junior): {result1['predicted_kpi_score']:.2f}")

result2 = predictor.predict_kpi_score(test2)
print(f"Test 2 (Senior): {result2['predicted_kpi_score']:.2f}")

result3 = predictor.predict_kpi_score(test3)
print(f"Test 3 (Different): {result3['predicted_kpi_score']:.2f}")

print(f"\nDifference between Junior and Senior: {abs(result1['predicted_kpi_score'] - result2['predicted_kpi_score']):.2f}")

if abs(result1['predicted_kpi_score'] - result2['predicted_kpi_score']) < 5:
    print("❌ PROBLEM: Model not differentiating between skill levels!")
else:
    print("✓ Model is working correctly")