"""
Data Preparation Script for KPI ML Model
Generates training data from existing KPI configurations
"""

import pandas as pd
import numpy as np
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pickle

class KPIDataPreparation:
    def __init__(self, 
                 json_path='ml_models/data/KPI/jsons',
                 weights_path='ml_models/data/KPI/weights/',
                 employees_path='ml_models/data/KPI/employees.xlsx',
                 output_path='ml_models/scripts/ml_models/data/'):
        self.json_path = json_path
        self.weights_path = weights_path
        self.employees_path = employees_path
        self.output_path = output_path
        
        os.makedirs(output_path, exist_ok=True)
        
    def load_kpi_configs(self):
        """Load all KPI configuration JSONs"""
        kpi_configs = {}
        for file in os.listdir(self.json_path):
            if file.endswith('.json'):
                role = file.replace('.json', '')
                with open(os.path.join(self.json_path, file), 'r') as f:
                    kpi_configs[role] = json.load(f)
        return kpi_configs
    
    def load_weights(self):
        """Load all weight configurations"""
        weights = {}
        for file in os.listdir(self.weights_path):
            if file.endswith('.xlsx'):
                role = file.replace('.xlsx', '')
                df = pd.read_excel(os.path.join(self.weights_path, file))
                weights[role] = df
        return weights
    
    def generate_synthetic_employees(self, role, n_samples=500):
        """Generate synthetic employee data for training"""
        kpi_configs = self.load_kpi_configs()
        weights_df = self.load_weights()[role]
        
        config = kpi_configs[role]
        employees = []
        
        for i in range(n_samples):
            employee = {
                'EMP_ID': f'{role[:2].upper()}_SYN_{i}',
                'Role': role,
                'Domain': np.random.choice(['Finance', 'Health', 'E-Commerce', 'Education'])
            }
            
            # Generate features based on config
            for category, criteria_dict in config.items():
                for criterion, levels in criteria_dict.items():
                    level_options = list(levels.keys())
                    selected_level = np.random.choice(level_options)
                    employee[criterion] = selected_level
            
            employees.append(employee)
        
        return pd.DataFrame(employees)
    
    def calculate_kpi_for_synthetic(self, df, role):
        """Calculate KPI scores for synthetic data"""
        kpi_configs = self.load_kpi_configs()
        weights_df = self.load_weights()[role]
        
        config = kpi_configs[role]
        
        # Flatten config for easy lookup
        flat_config = {}
        for category, criteria_dict in config.items():
            flat_config.update(criteria_dict)
        
        # Create weights dict
        weights_dict = dict(zip(weights_df['Criteria'], weights_df['Weight']))
        
        kpi_scores = []
        
        for idx, row in df.iterrows():
            total_score = 0
            for criterion, level in row.items():
                if criterion in ['EMP_ID', 'Role', 'Domain']:
                    continue
                    
                if criterion in flat_config and criterion in weights_dict:
                    score = flat_config[criterion].get(level, 0)
                    weight = weights_dict[criterion]
                    total_score += score * weight
            
            kpi_scores.append(total_score)
        
        df['KPI_Score'] = kpi_scores
        return df
    
    def create_training_dataset(self, roles=None):
        """Create complete training dataset for all roles"""
        if roles is None:
            roles = ['Business Analyst', 'Backend Engineer', 'DevOps Engineer',
                    'Frontend Engineer', 'FullStack Engineer', 'Project Manager',
                    'Quality Assurance Engineer', 'Tech Lead']
        
        all_data = []
        
        for role in roles:
            print(f"Generating data for {role}...")
            df = self.generate_synthetic_employees(role, n_samples=500)
            df = self.calculate_kpi_for_synthetic(df, role)
            all_data.append(df)
        
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Add performance categories based on KPI scores
        combined_df['Performance_Category'] = pd.cut(
            combined_df['KPI_Score'],
            bins=[0, 30, 60, 100],
            labels=['Low', 'Medium', 'High']
        )
        
        # Save raw data
        combined_df.to_csv(
            os.path.join(self.output_path, 'kpi_training_data.csv'),
            index=False
        )
        
        return combined_df
    
    def prepare_features(self, df):
        """Prepare features for ML model"""
        # Separate features and target
        feature_cols = [col for col in df.columns 
                       if col not in ['EMP_ID', 'KPI_Score', 'Performance_Category']]
        
        X = df[feature_cols].copy()
        y_regression = df['KPI_Score'].copy()
        y_classification = df['Performance_Category'].copy()
        
        # Encode categorical variables
        label_encoders = {}
        for col in X.select_dtypes(include=['object']).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoders[col] = le
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=X.columns)
        
        # Encode target for classification
        le_target = LabelEncoder()
        y_classification_encoded = le_target.fit_transform(y_classification)
        
        # Save preprocessors
        with open(os.path.join(self.output_path, 'label_encoders.pkl'), 'wb') as f:
            pickle.dump(label_encoders, f)
        
        with open(os.path.join(self.output_path, 'scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)
        
        with open(os.path.join(self.output_path, 'target_encoder.pkl'), 'wb') as f:
            pickle.dump(le_target, f)
        
        return X_scaled, y_regression, y_classification_encoded, feature_cols
    
    def split_data(self, X, y_reg, y_class):
        """Split data into train, validation, and test sets"""
        # First split: 80% train+val, 20% test
        X_temp, X_test, y_reg_temp, y_reg_test, y_class_temp, y_class_test = \
            train_test_split(X, y_reg, y_class, test_size=0.2, random_state=42)
        
        # Second split: 75% train, 25% val (of the 80%)
        X_train, X_val, y_reg_train, y_reg_val, y_class_train, y_class_val = \
            train_test_split(X_temp, y_reg_temp, y_class_temp, 
                           test_size=0.25, random_state=42)
        
        # Save splits
        splits = {
            'X_train': X_train, 'X_val': X_val, 'X_test': X_test,
            'y_reg_train': y_reg_train, 'y_reg_val': y_reg_val, 'y_reg_test': y_reg_test,
            'y_class_train': y_class_train, 'y_class_val': y_class_val, 'y_class_test': y_class_test
        }
        
        with open(os.path.join(self.output_path, 'data_splits.pkl'), 'wb') as f:
            pickle.dump(splits, f)
        
        print(f"\nData Split Summary:")
        print(f"Training set: {len(X_train)} samples")
        print(f"Validation set: {len(X_val)} samples")
        print(f"Test set: {len(X_test)} samples")
        
        return splits

if __name__ == "__main__":
    # Initialize data preparation
    prep = KPIDataPreparation()
    
    # Create training dataset
    print("Creating training dataset...")
    df = prep.create_training_dataset()
    print(f"Generated {len(df)} samples")
    
    # Prepare features
    print("\nPreparing features...")
    X, y_reg, y_class, feature_cols = prep.prepare_features(df)
    
    # Split data
    print("\nSplitting data...")
    splits = prep.split_data(X, y_reg, y_class)
    
    print("\nData preparation completed successfully!")
    print(f"Files saved in: ml_models/data/")