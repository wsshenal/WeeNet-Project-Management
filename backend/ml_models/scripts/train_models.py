"""
KPI ML Model Training Script
Trains multiple models for KPI prediction and performance classification
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.svm import SVR, SVC
from xgboost import XGBRegressor, XGBClassifier
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import matplotlib.pyplot as plt
import seaborn as sns

class KPIModelTrainer:
    def __init__(self, data_path='ml_models/scripts/ml_models/data/', output_path='ml_models/scripts/ml_models/trained_models/'):
        self.data_path = data_path
        self.output_path = output_path
        os.makedirs(output_path, exist_ok=True)
        os.makedirs(os.path.join(output_path, 'plots'), exist_ok=True)
        
        # Load preprocessors
        with open(os.path.join(data_path, 'label_encoders.pkl'), 'rb') as f:
            self.label_encoders = pickle.load(f)
        
        with open(os.path.join(data_path, 'scaler.pkl'), 'rb') as f:
            self.scaler = pickle.load(f)
        
        with open(os.path.join(data_path, 'target_encoder.pkl'), 'rb') as f:
            self.target_encoder = pickle.load(f)
        
        # Load data splits
        with open(os.path.join(data_path, 'data_splits.pkl'), 'rb') as f:
            self.splits = pickle.load(f)
    
    def train_regression_models(self):
        """Train multiple regression models for KPI score prediction"""
        X_train = self.splits['X_train']
        y_train = self.splits['y_reg_train']
        X_val = self.splits['X_val']
        y_val = self.splits['y_reg_val']
        
        models = {
            'Random Forest': RandomForestRegressor(n_estimators=200, max_depth=15, random_state=42),
            'XGBoost': XGBRegressor(n_estimators=200, learning_rate=0.1, max_depth=7, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, random_state=42),
            'Ridge': Ridge(alpha=1.0),
            'SVR': SVR(kernel='rbf', C=100, gamma='scale')
        }
        
        results = {}
        trained_models = {}
        
        print("\n" + "="*80)
        print("TRAINING REGRESSION MODELS (KPI Score Prediction)")
        print("="*80)
        
        for name, model in models.items():
            print(f"\nTraining {name}...")
            model.fit(X_train, y_train)
            
            # Predictions
            train_pred = model.predict(X_train)
            val_pred = model.predict(X_val)
            
            # Metrics
            train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
            val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
            train_mae = mean_absolute_error(y_train, train_pred)
            val_mae = mean_absolute_error(y_val, val_pred)
            train_r2 = r2_score(y_train, train_pred)
            val_r2 = r2_score(y_val, val_pred)
            
            results[name] = {
                'train_rmse': train_rmse,
                'val_rmse': val_rmse,
                'train_mae': train_mae,
                'val_mae': val_mae,
                'train_r2': train_r2,
                'val_r2': val_r2
            }
            
            trained_models[name] = model
            
            print(f"  Train RMSE: {train_rmse:.4f} | Val RMSE: {val_rmse:.4f}")
            print(f"  Train MAE:  {train_mae:.4f} | Val MAE:  {val_mae:.4f}")
            print(f"  Train R²:   {train_r2:.4f} | Val R²:   {val_r2:.4f}")
        
        # Save results
        with open(os.path.join(self.output_path, 'regression_results.json'), 'w') as f:
            json.dump(results, f, indent=2)
        
        # Save best model
        best_model_name = min(results.keys(), key=lambda k: results[k]['val_rmse'])
        best_model = trained_models[best_model_name]
        
        with open(os.path.join(self.output_path, 'kpi_regression_model.pkl'), 'wb') as f:
            pickle.dump(best_model, f)
        
        print(f"\n✓ Best Regression Model: {best_model_name}")
        print(f"  Validation RMSE: {results[best_model_name]['val_rmse']:.4f}")
        print(f"  Validation R²: {results[best_model_name]['val_r2']:.4f}")
        
        return trained_models, results
    
    def train_classification_models(self):
        """Train multiple classification models for performance category prediction"""
        X_train = self.splits['X_train']
        y_train = self.splits['y_class_train']
        X_val = self.splits['X_val']
        y_val = self.splits['y_class_val']
        
        models = {
            'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42),
            'XGBoost': XGBClassifier(n_estimators=200, learning_rate=0.1, max_depth=7, random_state=42),
            'Logistic Regression': LogisticRegression(max_iter=1000, C=1.0, random_state=42),
            'SVC': SVC(kernel='rbf', C=10, gamma='scale', random_state=42)
        }
        
        results = {}
        trained_models = {}
        
        print("\n" + "="*80)
        print("TRAINING CLASSIFICATION MODELS (Performance Category)")
        print("="*80)
        
        for name, model in models.items():
            print(f"\nTraining {name}...")
            model.fit(X_train, y_train)
            
            # Predictions
            train_pred = model.predict(X_train)
            val_pred = model.predict(X_val)
            
            # Metrics
            train_acc = accuracy_score(y_train, train_pred)
            val_acc = accuracy_score(y_val, val_pred)
            train_f1 = f1_score(y_train, train_pred, average='weighted')
            val_f1 = f1_score(y_val, val_pred, average='weighted')
            
            results[name] = {
                'train_accuracy': train_acc,
                'val_accuracy': val_acc,
                'train_f1': train_f1,
                'val_f1': val_f1
            }
            
            trained_models[name] = model
            
            print(f"  Train Accuracy: {train_acc:.4f} | Val Accuracy: {val_acc:.4f}")
            print(f"  Train F1:       {train_f1:.4f} | Val F1:       {val_f1:.4f}")
        
        # Save results
        with open(os.path.join(self.output_path, 'classification_results.json'), 'w') as f:
            json.dump(results, f, indent=2)
        
        # Save best model
        best_model_name = max(results.keys(), key=lambda k: results[k]['val_accuracy'])
        best_model = trained_models[best_model_name]
        
        with open(os.path.join(self.output_path, 'kpi_classification_model.pkl'), 'wb') as f:
            pickle.dump(best_model, f)
        
        print(f"\n✓ Best Classification Model: {best_model_name}")
        print(f"  Validation Accuracy: {results[best_model_name]['val_accuracy']:.4f}")
        print(f"  Validation F1: {results[best_model_name]['val_f1']:.4f}")
        
        return trained_models, results
    
    def evaluate_final_models(self):
        """Evaluate models on test set"""
        # Load best models
        with open(os.path.join(self.output_path, 'kpi_regression_model.pkl'), 'rb') as f:
            reg_model = pickle.load(f)
        
        with open(os.path.join(self.output_path, 'kpi_classification_model.pkl'), 'rb') as f:
            class_model = pickle.load(f)
        
        X_test = self.splits['X_test']
        y_reg_test = self.splits['y_reg_test']
        y_class_test = self.splits['y_class_test']
        
        print("\n" + "="*80)
        print("FINAL TEST SET EVALUATION")
        print("="*80)
        
        # Regression evaluation
        reg_pred = reg_model.predict(X_test)
        test_rmse = np.sqrt(mean_squared_error(y_reg_test, reg_pred))
        test_mae = mean_absolute_error(y_reg_test, reg_pred)
        test_r2 = r2_score(y_reg_test, reg_pred)
        
        print("\nRegression Model (KPI Score Prediction):")
        print(f"  Test RMSE: {test_rmse:.4f}")
        print(f"  Test MAE:  {test_mae:.4f}")
        print(f"  Test R²:   {test_r2:.4f}")
        
        # Classification evaluation
        class_pred = class_model.predict(X_test)
        test_acc = accuracy_score(y_class_test, class_pred)
        test_f1 = f1_score(y_class_test, class_pred, average='weighted')
        
        print("\nClassification Model (Performance Category):")
        print(f"  Test Accuracy: {test_acc:.4f}")
        print(f"  Test F1 Score: {test_f1:.4f}")
        
        # Detailed classification report
        print("\nDetailed Classification Report:")
        class_names = self.target_encoder.classes_
        print(classification_report(y_class_test, class_pred, 
                                   target_names=class_names))
        
        # Save test results
        test_results = {
            'regression': {
                'rmse': test_rmse,
                'mae': test_mae,
                'r2': test_r2
            },
            'classification': {
                'accuracy': test_acc,
                'f1_score': test_f1
            }
        }
        
        with open(os.path.join(self.output_path, 'test_results.json'), 'w') as f:
            json.dump(test_results, f, indent=2)
        
        return test_results
    
    def create_visualizations(self):
        """Create visualizations of model performance"""
        # Load models
        with open(os.path.join(self.output_path, 'kpi_regression_model.pkl'), 'rb') as f:
            reg_model = pickle.load(f)
        
        X_test = self.splits['X_test']
        y_reg_test = self.splits['y_reg_test']
        
        reg_pred = reg_model.predict(X_test)
        
        # Actual vs Predicted scatter plot
        plt.figure(figsize=(10, 6))
        plt.scatter(y_reg_test, reg_pred, alpha=0.5)
        plt.plot([y_reg_test.min(), y_reg_test.max()], 
                [y_reg_test.min(), y_reg_test.max()], 
                'r--', lw=2)
        plt.xlabel('Actual KPI Score')
        plt.ylabel('Predicted KPI Score')
        plt.title('KPI Score: Actual vs Predicted')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_path, 'plots', 'actual_vs_predicted.png'), dpi=300)
        plt.close()
        
        # Residual plot
        residuals = y_reg_test - reg_pred
        plt.figure(figsize=(10, 6))
        plt.scatter(reg_pred, residuals, alpha=0.5)
        plt.axhline(y=0, color='r', linestyle='--', lw=2)
        plt.xlabel('Predicted KPI Score')
        plt.ylabel('Residuals')
        plt.title('Residual Plot')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_path, 'plots', 'residuals.png'), dpi=300)
        plt.close()
        
        print("\n✓ Visualizations saved in ml_models/trained_models/plots/")

if __name__ == "__main__":
    # Initialize trainer
    trainer = KPIModelTrainer()
    
    # Train regression models
    reg_models, reg_results = trainer.train_regression_models()
    
    # Train classification models
    class_models, class_results = trainer.train_classification_models()
    
    # Evaluate on test set
    test_results = trainer.evaluate_final_models()
    
    # Create visualizations
    trainer.create_visualizations()
    
    print("\n" + "="*80)
    print("MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("="*80)
    print(f"\nTrained models saved in: ml_models/trained_models/")
    print(f"- kpi_regression_model.pkl")
    print(f"- kpi_classification_model.pkl")
    print(f"- regression_results.json")
    print(f"- classification_results.json")
    print(f"- test_results.json")