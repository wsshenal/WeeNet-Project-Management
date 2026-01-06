import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
import pickle
import json
import os

print("=" * 70)
print("BUDGET FORECASTING MODEL TRAINING")
print("=" * 70)

# Create artifacts folder
os.makedirs('artifacts', exist_ok=True)

# Load data
print("\n[1/6] Loading data...")
df = pd.read_excel('../data/project_details.xlsx')
print(f"[OK] {len(df)} projects loaded")

# Feature engineering
print("\n[2/6] Engineering features...")
df['Platform_Count'] = df['Mobile'] + df['Desktop'] + df['Web'] + df['IoT']

categorical_features = ['Domain', 'Complexity Level']
numerical_features = ['Mobile', 'Desktop', 'Web', 'IoT', 'Expected Team Size', 'Expected Budget', 'Date_Difference', 'Risk', 'Platform_Count']
all_features = categorical_features + numerical_features
target = 'Actual_Budget'

# Encode
print("\n[3/6] Encoding...")
encoders = {}
df_encoded = df.copy()
for col in categorical_features:
    encoders[col] = LabelEncoder()
    df_encoded[col] = encoders[col].fit_transform(df[col].astype(str))

# Split
print("\n[4/6] Splitting data...")
X = df_encoded[all_features]
y = df_encoded[target]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"[OK] Train: {len(X_train)}, Test: {len(X_test)}")

# Train
print("\n[5/6] Training XGBoost...")
model = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)
mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

print("\n" + "=" * 70)
print("PERFORMANCE METRICS")
print("=" * 70)
print(f"MAE:  ${mae:,.2f}")
print(f"RMSE: ${rmse:,.2f}")
print(f"R²:   {r2:.4f}")
print(f"MAPE: {mape:.2f}%")

# Save
print("\n[6/6] Saving model...")
with open('artifacts/budget_model.pkl', 'wb') as f:
    pickle.dump(model, f)
with open('artifacts/budget_encoders.pkl', 'wb') as f:
    pickle.dump(encoders, f)
with open('artifacts/metrics.json', 'w') as f:
    json.dump({'mae': float(mae), 'rmse': float(rmse), 'r2': float(r2), 'mape': float(mape)}, f, indent=2)

print("[OK] Model saved to artifacts/")
print("=" * 70)
