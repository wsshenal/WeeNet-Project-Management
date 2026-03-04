"""
ML Model Training Pipeline for KPI Prediction
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, Lasso
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

class KPIModelTrainer:
    """Complete ML training pipeline for KPI prediction"""
    
    def __init__(self, data_path='data/KPI/training/kpi_training_data.csv'):
        self.data_path = data_path
        self.models = {}
        self.encoders = {}
        self.scaler = StandardScaler()
        self.best_model = None
        self.best_model_name = None
        self.feature_importance = None
        self.feature_cols = None
        
    def load_and_prepare_data(self):
        """Load and prepare data for training"""
        print("=" * 70)
        print("📂 LOADING DATA")
        print("=" * 70)
        
        df = pd.read_csv(self.data_path)
        print(f"✓ Loaded {len(df)} records from {self.data_path}")
        
        # Define categorical features
        categorical_features = [
            'role', 'domain', 
            'analytical_skills', 'technical_proficiency',
            'communication_skills', 'problem_solving', 'domain_expertise',
            'years_experience', 'domain_experience', 
            'leadership_experience',
            'bachelors_degree', 'masters_degree'
        ]
        
        # Encode categorical variables
        df_encoded = df.copy()
        for col in categorical_features:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df[col])
            self.encoders[col] = le
        
        print(f"✓ Encoded {len(categorical_features)} categorical features")
        
        # Features and target
        self.feature_cols = categorical_features
        X = df_encoded[self.feature_cols]
        y = df_encoded['actual_kpi']
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"✓ Train set: {len(X_train)} samples")
        print(f"✓ Test set: {len(X_test)} samples")
        print(f"✓ Features scaled using StandardScaler")
        
        return X_train_scaled, X_test_scaled, y_train, y_test
    
    def train_models(self, X_train, y_train):
        """Train multiple ML models"""
        print("\n" + "=" * 70)
        print("🤖 TRAINING MODELS")
        print("=" * 70)
        
        models_config = {
            'Random Forest': RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                n_jobs=-1
            ),
            'XGBoost': xgb.XGBRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                verbosity=0
            ),
            'Gradient Boosting': GradientBoostingRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            ),
            'Ridge Regression': Ridge(alpha=1.0),
            'Lasso Regression': Lasso(alpha=1.0, max_iter=2000)
        }
        
        for name, model in models_config.items():
            print(f"\n📊 Training {name}...")
            
            # Train model
            model.fit(X_train, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(
                model, X_train, y_train, 
                cv=5, scoring='r2', n_jobs=-1
            )
            
            print(f"   ✓ Training complete")
            print(f"   ✓ CV R² Score: {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")
            
            self.models[name] = {
                'model': model,
                'cv_score': cv_scores.mean(),
                'cv_std': cv_scores.std()
            }
    
    def evaluate_models(self, X_test, y_test):
        """Evaluate all trained models"""
        print("\n" + "=" * 70)
        print("📈 EVALUATING MODELS")
        print("=" * 70)
        
        results = []
        best_r2 = -np.inf
        
        for name, model_dict in self.models.items():
            model = model_dict['model']
            
            # Predictions
            y_pred = model.predict(X_test)
            
            # Metrics
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            results.append({
                'Model': name,
                'RMSE': rmse,
                'MAE': mae,
                'R² Score': r2,
                'CV R²': model_dict['cv_score']
            })
            
            print(f"\n{name}:")
            print(f"   RMSE: {rmse:.4f}")
            print(f"   MAE: {mae:.4f}")
            print(f"   R² Score: {r2:.4f}")
            
            # Track best model
            if r2 > best_r2:
                best_r2 = r2
                self.best_model = model
                self.best_model_name = name
        
        results_df = pd.DataFrame(results)
        results_df = results_df.sort_values('R² Score', ascending=False)
        
        print("\n" + "=" * 70)
        print(f"🏆 BEST MODEL: {self.best_model_name}")
        print(f"   R² Score: {best_r2:.4f}")
        print("=" * 70)
        
        return results_df
    
    def hyperparameter_tuning(self, X_train, y_train):
        """Tune hyperparameters of best model"""
        print("\n" + "=" * 70)
        print(f"🔧 HYPERPARAMETER TUNING: {self.best_model_name}")
        print("=" * 70)
        
        if 'Random Forest' in self.best_model_name:
            param_grid = {
                'n_estimators': [100, 200],
                'max_depth': [10, 15, 20],
                'min_samples_split': [2, 5]
            }
            model = RandomForestRegressor(random_state=42, n_jobs=-1)
            
        elif 'XGBoost' in self.best_model_name:
            param_grid = {
                'n_estimators': [100, 200],
                'max_depth': [4, 6, 8],
                'learning_rate': [0.01, 0.1, 0.2]
            }
            model = xgb.XGBRegressor(random_state=42, verbosity=0)
            
        elif 'Gradient Boosting' in self.best_model_name:
            param_grid = {
                'n_estimators': [100, 200],
                'max_depth': [3, 5, 7],
                'learning_rate': [0.01, 0.1, 0.2]
            }
            model = GradientBoostingRegressor(random_state=42)
        else:
            print("   ⚠️ Skipping tuning for this model type")
            return
        
        print("   🔍 Running GridSearchCV...")
        grid_search = GridSearchCV(
            model, param_grid, cv=5, 
            scoring='r2', n_jobs=-1, verbose=0
        )
        
        grid_search.fit(X_train, y_train)
        
        print(f"   ✓ Best parameters: {grid_search.best_params_}")
        print(f"   ✓ Best CV R² Score: {grid_search.best_score_:.4f}")
        
        self.best_model = grid_search.best_estimator_
    
    def extract_feature_importance(self):
        """Extract feature importance from best model"""
        print("\n" + "=" * 70)
        print("📊 FEATURE IMPORTANCE ANALYSIS")
        print("=" * 70)
        
        if hasattr(self.best_model, 'feature_importances_'):
            importance = self.best_model.feature_importances_
            
            self.feature_importance = pd.DataFrame({
                'Feature': self.feature_cols,
                'Importance': importance
            }).sort_values('Importance', ascending=False)
            
            print("\nTop 10 Most Important Features:")
            print(self.feature_importance.head(10).to_string(index=False))
            
            return self.feature_importance
        else:
            print("   ⚠️ Model does not support feature importance")
            return None
    
    def save_artifacts(self, output_dir='artifacts/kpi_models/'):
        """Save all trained artifacts"""
        print("\n" + "=" * 70)
        print("💾 SAVING MODEL ARTIFACTS")
        print("=" * 70)
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save best model
        model_path = os.path.join(output_dir, 'kpi_best_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(self.best_model, f)
        print(f"✓ Saved model: {model_path}")
        
        # Save encoders
        encoders_path = os.path.join(output_dir, 'kpi_encoders.pkl')
        with open(encoders_path, 'wb') as f:
            pickle.dump(self.encoders, f)
        print(f"✓ Saved encoders: {encoders_path}")
        
        # Save scaler
        scaler_path = os.path.join(output_dir, 'kpi_scaler.pkl')
        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        print(f"✓ Saved scaler: {scaler_path}")
        
        # Save feature importance
        if self.feature_importance is not None:
            fi_path = os.path.join(output_dir, 'feature_importance.csv')
            self.feature_importance.to_csv(fi_path, index=False)
            print(f"✓ Saved feature importance: {fi_path}")
        
        # Save feature columns
        features_path = os.path.join(output_dir, 'feature_columns.pkl')
        with open(features_path, 'wb') as f:
            pickle.dump(self.feature_cols, f)
        print(f"✓ Saved feature columns: {features_path}")
    
    def run_full_pipeline(self):
        """Execute complete training pipeline"""
        print("\n" + "=" * 70)
        print(" " * 15 + "KPI ML MODEL TRAINING PIPELINE")
        print("=" * 70 + "\n")
        
        # 1. Load data
        X_train, X_test, y_train, y_test = self.load_and_prepare_data()
        
        # 2. Train models
        self.train_models(X_train, y_train)
        
        # 3. Evaluate models
        results_df = self.evaluate_models(X_test, y_test)
        
        # 4. Hyperparameter tuning
        self.hyperparameter_tuning(X_train, y_train)
        
        # 5. Re-evaluate after tuning
        print("\n" + "=" * 70)
        print("🔄 FINAL EVALUATION (After Tuning)")
        print("=" * 70)
        y_pred = self.best_model.predict(X_test)
        final_r2 = r2_score(y_test, y_pred)
        final_rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        final_mae = mean_absolute_error(y_test, y_pred)
        
        print(f"   Final R² Score: {final_r2:.4f}")
        print(f"   Final RMSE: {final_rmse:.4f}")
        print(f"   Final MAE: {final_mae:.4f}")
        
        # 6. Feature importance
        self.extract_feature_importance()
        
        # 7. Save everything
        self.save_artifacts()
        
        print("\n" + "=" * 70)
        print(" " * 20 + "✅ TRAINING COMPLETE!")
        print("=" * 70 + "\n")
        
        return results_df

def main():
    """Main execution"""
    trainer = KPIModelTrainer()
    results = trainer.run_full_pipeline()

if __name__ == "__main__":
    main()