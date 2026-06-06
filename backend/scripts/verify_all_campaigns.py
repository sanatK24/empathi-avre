import os
import sys
import io
import requests

# Append backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from models import Campaign, VerificationReport
from ai_verification.service import AIVerificationService

def verify_all_campaigns():
    db = SessionLocal()
    try:
        campaigns = db.query(Campaign).all()
        print(f"Total campaigns found in database: {len(campaigns)}")
        
        for c in campaigns:
            print(f"\n=========================================")
            print(f"Processing Campaign ID {c.id}: '{c.title}'")
            print(f"=========================================")
            
            if not c.verification_doc_url:
                print(f"WARNING: No verification document URL found for Campaign ID {c.id}.")
                print("Skipping re-verification. Please upload a document via the UI to verify.")
                continue
                
            # Download file bytes
            file_bytes = None
            filename = c.verification_doc_url.split("/")[-1]
            
            try:
                print(f"Downloading document from: {c.verification_doc_url}")
                r = requests.get(c.verification_doc_url, timeout=15)
                if r.status_code == 200:
                    file_bytes = r.content
                    print(f"Successfully downloaded {len(file_bytes)} bytes.")
                else:
                    print(f"ERROR: Failed to download document. HTTP status code: {r.status_code}")
                    continue
            except Exception as e:
                print(f"ERROR: Exception while downloading document: {e}")
                continue
                
            # Run verification
            try:
                # Delete existing report if it exists to ensure clean run
                existing_report = db.query(VerificationReport).filter(VerificationReport.campaign_id == c.id).first()
                if existing_report:
                    print(f"Deleting existing verification report (ID: {existing_report.id}) to re-run...")
                    db.delete(existing_report)
                    db.commit()
                    
                print("Running AI Verification Engine...")
                res = AIVerificationService.verify_campaign_document(
                    db=db,
                    campaign_id=c.id,
                    file_bytes=file_bytes,
                    filename=filename
                )
                
                # Fetch updated campaign fields
                db.refresh(c)
                print(f"Re-verification complete for Campaign ID {c.id}:")
                print(f"  Trust Score: {c.trust_score}%")
                print(f"  Verification Status: {c.verification_status}")
                print(f"  Verified Badge: {c.verified}")
                print(f"  Fraud Probability: {res.get('fraud_probability')}")
                
            except Exception as e:
                print(f"ERROR: Failed to run verification pipeline: {e}")
                db.rollback()
                
    finally:
        db.close()

if __name__ == '__main__':
    verify_all_campaigns()
