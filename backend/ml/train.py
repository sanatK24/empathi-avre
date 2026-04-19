import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import json

class AVRETrainer:
    def __init__(self, output_dir="backend/ml"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.feature_cols = [
            "distance_km", "stock_quantity", "requested_quantity", "stock_ratio",
            "vendor_rating", "avg_response_time", "urgency_level", "category_match",
            "price", "active_status", "vendor_success_rate", "total_completed_orders",
            "city_match", "recency_of_inventory_update"
        ]

    def generate_synthetic_data(self, n_samples=1000):
        np.random.seed(42)
        data = []
        for _ in range(n_samples):
            dist = np.random.uniform(0.1, 20.0)
            stock = np.random.randint(1, 100)
            req = np.random.randint(1, 10)
            rating = np.random.uniform(3.0, 5.0)
            resp = np.random.randint(5, 60)
            urgency = np.random.randint(1, 5)
            cat_match = np.random.choice([0, 1], p=[0.2, 0.8])
            
            # Ground truth match_score (0-1) logic
            # Higher is better
            score = (
                0.3 * (1 - dist/20.0) +
                0.2 * (min(1, stock/req)) +
                0.15 * (rating/5.0) +
                0.15 * (1 - resp/60.0) +
                0.1 * cat_match +
                0.1 * (urgency/4.0)
            )
            score = np.clip(score + np.random.normal(0, 0.05), 0, 1)

            row = {
                "distance_km": dist,
                "stock_quantity": stock,
                "requested_quantity": req,
                "stock_ratio": stock/req,
                "vendor_rating": rating,
                "avg_response_time": resp,
                "urgency_level": urgency,
                "category_match": cat_match,
                "price": np.random.uniform(10, 500),
                "active_status": 1,
                "vendor_success_rate": np.random.uniform(0.7, 1.0),
                "total_completed_orders": np.random.randint(0, 1000),
                "city_match": np.random.choice([0, 1]),
                "recency_of_inventory_update": np.random.uniform(0, 48),
                "match_score": score
            }
            data.append(row)
        
        return pd.DataFrame(data)

    def train(self):
        print("Generating synthetic dataset...")
        df = self.generate_synthetic_data(2000)
        
        X = df[self.feature_cols]
        y = df["match_score"]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        print("Comparing models...")
        models = {
            "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42),
            "GradientBoosting": GradientBoostingRegressor(n_estimators=100, random_state=42)
        }
        
        results = {}
        best_model = None
        best_rmse = float('inf')
        
        for name, model in models.items():
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            rmse = np.sqrt(mean_squared_error(y_test, preds))
            mae = mean_absolute_error(y_test, preds)
            r2 = r2_score(y_test, preds)
            
            results[name] = {"rmse": rmse, "mae": mae, "r2": r2}
            print(f"{name} -> RMSE: {rmse:.4f}, R2: {r2:.4f}")
            
            if rmse < best_rmse:
                best_rmse = rmse
                best_model = model
                best_model_name = name

        print(f"Selecting best model: {best_model_name}")
        
        # Save model
        with open(os.path.join(self.output_dir, "model.pkl"), "wb") as f:
            pickle.dump(best_model, f)
            
        # Save metrics
        with open(os.path.join(self.output_dir, "metrics.json"), "w") as f:
            json.dump(results, f, indent=4)
            
        print("Training complete. Model saved.")

if __name__ == "__main__":
    trainer = AVRETrainer()
    trainer.train()
