import os
import sys
import json

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from models import VerificationReport

def inspect_report():
    db = SessionLocal()
    try:
        report = db.query(VerificationReport).order_by(VerificationReport.id.desc()).first()
        if not report:
            print("No verification reports found.")
            return
            
        if report.report_json:
            data = json.loads(report.report_json)
            print("OCR data:")
            print(json.dumps(data.get("ocr"), indent=2))
            
            # Print billing items if available
            print("\nBilling details in JSON:")
            print(json.dumps(data.get("billing"), indent=2))
    finally:
        db.close()

if __name__ == '__main__':
    inspect_report()
