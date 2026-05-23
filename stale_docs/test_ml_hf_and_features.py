# =========================
# HF / ML OUTPUT DEBUG TEST
# =========================

import os
import time
import base64
import requests
from typing import Dict, List, Optional

# Ensure backend/ is on PYTHONPATH
import sys

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.ml.hf_services import hf_services


BASE_URL = os.environ.get("EMP-AUTH_BASE_URL", "http://localhost:8000")


def _assert(cond: bool, msg: str, failures: List[str]) -> None:
    if not cond:
        failures.append(msg)


def _fake_image_bytes() -> bytes:
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axu9a8AAAAASUVORK5CYII="
    )


def run_hf_unit_tests() -> List[str]:
    failures: List[str] = []

    pdf_path = r"C:\Users\sanat\OneDrive\Desktop\Aarti_Heart_report_scan_page.jpg"
    image_path = r"C:\Users\sanat\OneDrive\Desktop\images.jpg"
    
    description = (
        "**Description**\n"
        "Aarti Yadav, a 14-year-old student from Thane, has been diagnosed with a severe congenital heart condition and urgently requires corrective heart surgery within the next few weeks. Her father, Surya Yadav, works as a delivery rider and is struggling to arrange the required treatment funds while managing household expenses.\n\n"
        "Estimated Treatment Cost Breakdown:\n\n"
        "* Pre-Surgery Tests & Evaluation — ₹45,000\n"
        "* Cardiac Surgery Charges — ₹3,20,000\n"
        "* ICU & Monitoring — ₹95,000\n"
        "* Medicines & Consumables — ₹58,000\n"
        "* Hospital Stay (6 Days) — ₹72,000\n"
        "* Post-Surgery Follow-Up — ₹35,000\n\n"
        "Total Estimated Expense: ₹6,25,000\n\n"
        "Aarti is a bright and hardworking student who dreams of becoming a teacher, but her worsening condition has made daily activities extremely difficult. Doctors have advised immediate treatment to avoid further complications.\n\n"
        "The family has already used their savings for initial consultations and tests. They are now turning to the community for support and kindness during this critical time.\n\n"
        "Every donation, no matter the amount, can help give Aarti a healthier future. Sharing this campaign with others can also create a huge impact.\n\n"
        "Thank you for supporting Aarti and her family in this difficult journey.\n"
    )
    campaign_title = "Emergency Heart Surgery Support for Aarti Yadav"

    sample_text = f"{campaign_title}\n\n{description}"

    print("\n==============================")
    print("HF / ML LIVE OUTPUTS")
    print("==============================")

    # =========================================
    # 1. EMBEDDINGS
    # =========================================

    emb = hf_services.generate_embedding(sample_text)

    print("\n[1] EMBEDDING")
    print("Type:", type(emb))
    print("Length:", len(emb))
    print("First 10 values:")
    print(emb[:10])

    _assert(isinstance(emb, list), "generate_embedding must return list", failures)

    # =========================================
    # 2. CATEGORY CLASSIFICATION
    # =========================================

    cat = hf_services.classify_category(sample_text)

    print("\n[2] CATEGORY CLASSIFICATION")
    print(cat)

    _assert(isinstance(cat, dict), "classify_category must return dict", failures)

    # =========================================
    # 3. SUMMARIZATION
    # =========================================

    summ = hf_services.summarize_campaign(sample_text)

    print("\n[3] SUMMARIZATION")
    print(summ)

    _assert(isinstance(summ, str), "summarize_campaign must return string", failures)

    # =========================================
    # 4. OCR
    # =========================================

    ocr_text = ""

    try:
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        ocr_text = hf_services.extract_document_text(pdf_bytes)

    except Exception as e:
        failures.append(f"OCR failed: {e}")

    print("\n[4] OCR OUTPUT")
    print(ocr_text)

    _assert(isinstance(ocr_text, str), "OCR must return string", failures)

    # =========================================
    # 5. DOCUMENT UNDERSTANDING
    # =========================================

    ans = hf_services.understand_document(
        pdf_bytes,
        question="What is the requested amount?"
    )

    print("\n[5] DOCUMENT UNDERSTANDING")
    print(ans)

    _assert(isinstance(ans, str), "document QA must return string", failures)

    # =========================================
    # 6. IMAGE CAPTIONING
    # =========================================

    image_bytes = b""

    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()

    except Exception as e:
        failures.append(f"Image read failed: {e}")

    caption = hf_services.validate_image_context(image_bytes)

    print("\n[6] IMAGE CAPTION")
    print(caption)

    _assert(isinstance(caption, str), "caption must return string", failures)

    # =========================================
    # 7. TOXICITY
    # =========================================

    tox = hf_services.detect_toxicity(
        "This is awful and terrible"
    )

    print("\n[7] TOXICITY SCORE")
    print(tox)

    _assert(
        isinstance(tox, float) or isinstance(tox, int),
        "toxicity must return numeric",
        failures
    )

    # =========================================
    # 8. COMPREHENSIVE AI ANALYSIS
    # =========================================

    taxonomy_str = """
medical
- emergency response
- surgery
"""

    comp = hf_services.analyze_campaign_comprehensive(
        sample_text,
        historical_campaigns=[],
        taxonomy_str=taxonomy_str
    )

    print("\n[8] COMPREHENSIVE ANALYSIS")
    print(comp)

    _assert(
        isinstance(comp, dict),
        "comprehensive analysis must return dict",
        failures
    )

    return failures


def run_endpoint_smoke() -> List[str]:
    failures: List[str] = []

    ts = int(time.time())

    password = "TestPass123!"

    def auth_headers(token: str) -> Dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def register_user(email: str, role: str) -> None:
        r = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "name": "X",
                "email": email,
                "password": password,
                "role": role,
                "city": "Mumbai",
                "phone": "9999999999",
            },
            timeout=20,
        )

        _assert(
            r.ok,
            f"register failed: {r.status_code}",
            failures
        )

    def login_user(email: str) -> Optional[str]:
        r = requests.post(
            f"{BASE_URL}/auth/login",
            data={
                "username": email,
                "password": password
            },
            timeout=20,
        )

        if not r.ok:
            failures.append(f"login failed: {email}")
            return None

        return r.json().get("access_token")

    admin_email = f"testadmin_{ts}@test.com"
    creator_email = f"testcreator_{ts}@test.com"
    user_email = f"testuser_{ts}@test.com"

    register_user(user_email, "USER")
    register_user(creator_email, "CREATOR")
    register_user(admin_email, "ADMIN")

    user_token = login_user(user_email)
    creator_token = login_user(creator_email)
    admin_token = login_user(admin_email)

    print("\n==============================")
    print("ENDPOINT TESTS")
    print("==============================")

    r = requests.get(f"{BASE_URL}/campaigns")

    print("\nGET /campaigns")
    print(r.status_code)

    r = requests.get(f"{BASE_URL}/campaigns/taxonomy")

    print("\nGET /campaigns/taxonomy")
    print(r.status_code)

    r = requests.get(
        f"{BASE_URL}/auth/me",
        headers=auth_headers(user_token)
    )

    print("\nGET /auth/me")
    print(r.status_code)

    r = requests.get(
        f"{BASE_URL}/admin/stats",
        headers=auth_headers(admin_token)
    )

    print("\nGET /admin/stats (admin)")
    print(r.status_code)

    r = requests.get(
        f"{BASE_URL}/admin/stats",
        headers=auth_headers(user_token)
    )

    print("\nGET /admin/stats (user)")
    print(r.status_code)

    return failures


def main() -> int:
    print("\n====================================")
    print("EMPATHI HF + ML TEST SUITE")
    print("====================================")

    hf_failures = run_hf_unit_tests()

    if hf_failures:
        print("\nHF FAILURES:")
        for f in hf_failures:
            print("❌", f)
    else:
        print("\n✅ HF unit tests passed")

    ep_failures = run_endpoint_smoke()

    if ep_failures:
        print("\nENDPOINT FAILURES:")
        for f in ep_failures:
            print("❌", f)
    else:
        print("\n✅ Endpoint smoke tests passed")

    failures = hf_failures + ep_failures

    print("\n====================================")
    print("FINAL RESULT")
    print("====================================")

    print(f"Total failures: {len(failures)}")

    if len(failures) == 0:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ TESTS FAILED")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())