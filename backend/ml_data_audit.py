import sqlite3
import pandas as pd
import json
import os
from sqlalchemy import create_engine

DB_PATH = "avre.db"
ENGINE = create_engine(f"sqlite:///{DB_PATH}")

def audit_database():
    print(f"--- DATABASE AUDIT: {DB_PATH} ---")
    
    tables = ["users", "vendors", "inventory", "requests", "matches"]
    audit_results = {}

    for table in tables:
        df = pd.read_sql_table(table, ENGINE)
        
        audit_results[table] = {
            "size": len(df),
            "columns": list(df.columns),
            "null_values": df.isnull().sum().to_dict(),
            "sample": df.head(3).to_dict(orient="records")
        }
        
        print(f"\nTable: {table}")
        print(f"Rows: {len(df)}")
        print(f"Columns: {len(df.columns)}")
        
        if table == "matches":
            print("\nScore Distributions (Top 10):")
            print(df["score"].value_counts().head(10))
            print("\nMatch Status counts:")
            print(df["status"].value_counts())
            print("\nSelected Flag counts:")
            print(df["selected_flag"].value_counts())

        if table == "vendors":
            print("\nCity Distributions:")
            print(df["city"].value_counts())
            print("\nCategory Distributions:")
            print(df["category"].value_counts())

    # Check for class imbalance in matches
    matches_df = pd.read_sql_table("matches", ENGINE)
    if "selected_flag" in matches_df.columns:
        imbalance = matches_df["selected_flag"].value_counts(normalize=True).to_dict()
        audit_results["class_imbalance"] = imbalance
        print(f"\nClass Imbalance (selected_flag): {imbalance}")

    # Save report
    os.makedirs("ml_artifacts", exist_ok=True)
    with open("ml_artifacts/data_audit.json", "w") as f:
        json.dump(audit_results, f, indent=4, default=str)
    
    print("\nAudit complete. Report saved to ml_artifacts/data_audit.json")

if __name__ == "__main__":
    audit_database()
