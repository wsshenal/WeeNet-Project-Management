import pandas as pd
import numpy as np

print("=" * 70)
print("BUDGET DATA PREPARATION - Generating Training Data")
print("=" * 70)

# Load existing data
print("\n[1/5] Loading project data...")
df = pd.read_excel('../data/project_details.xlsx')
print(f"✓ Loaded {len(df)} projects")

# Generate realistic actual budget
def generate_actual_budget(row):
    base = row['Expected Budget']
    
    # Risk-based variance
    risk_factors = {1: np.random.uniform(0.95, 1.15), 2: np.random.uniform(0.90, 1.25), 3: np.random.uniform(0.85, 1.35)}
    risk_mult = risk_factors.get(row['Risk'], 1.0)
    
    # Complexity-based variance
    complexity_factors = {'Low': np.random.uniform(0.95, 1.10), 'Medium': np.random.uniform(0.90, 1.20), 'High': np.random.uniform(0.85, 1.30)}
    complexity_mult = complexity_factors.get(row['Complexity Level'], 1.0)
    
    # Platform count factor
    platform_count = row['Mobile'] + row['Desktop'] + row['Web'] + row['IoT']
    platform_mult = 1 + (platform_count * 0.05)
    
    # Team size factor
    team_factor = 1 + (row['Expected Team Size'] / 100)
    
    # Calculate
    actual = base * risk_mult * complexity_mult * platform_mult * team_factor
    actual = actual * (1 + np.random.uniform(-0.03, 0.03))
    
    return round(actual, 2)

# Generate data
print("\n[2/5] Generating Actual_Budget...")
np.random.seed(42)
df['Actual_Budget'] = df.apply(generate_actual_budget, axis=1)

# Calculate variance
print("\n[3/5] Calculating variance...")
df['Budget_Variance'] = df['Actual_Budget'] - df['Expected Budget']
df['Budget_Variance_Percent'] = (df['Budget_Variance'] / df['Expected Budget']) * 100
df['Budget_Status'] = 'Completed'

# Statistics
print("\n[4/5] Statistics:")
print(f"  Total: {len(df)} projects")
print(f"  Avg Variance: {df['Budget_Variance_Percent'].mean():.2f}%")
print(f"  Under budget: {len(df[df['Budget_Variance_Percent'] < 0])}")
print(f"  Over budget: {len(df[df['Budget_Variance_Percent'] > 5])}")

# Save
print("\n[5/5] Saving...")
df.to_excel('../data/project_details.xlsx', index=False)
print("✓ Data saved successfully!")
print("=" * 70)
