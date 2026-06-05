# Research Evaluation Report: Medical Document Verification Engine

This report documents the performance evaluation of the Multimodal Document Verification Engine implemented for EmpathI. The model fuses image metadata forensics (EXIF, ELA) with deep document processing layouts (YOLOv8, OCR, LayoutLMv3) to estimate fraud risk.

---

## 1. System Features Dictionary
The classifier processes an 11-dimension feature vector:
* **f1 (EXIF Software Check)**: Flags image editor metadata traces (0.2 = Photoshop/Canva detected, 1.0 = clean camera metadata).
* **f2 (ELA Mean)**: Statistical average difference indicating local pixel recompression attacks.
* **f3 (ELA Variance)**: Statistical variance indicating localized editing artifacts.
* **f4 (OCR Avg Confidence)**: Average word confidence from pytesseract (reflects scans vs. noise/tampering).
* **f5 (Hospital Match)**: Levenshtein distance matching similarity score against the Indian Hospitals Registry.
* **f6 (Billing Sum Delta)**: Discrepancy between drawn line item prices and drawn total due.
* **f7 (YOLO Logo Conf)**: YOLO confidence score for logo detection (0.0 = logo replaced/removed).
* **f8 (YOLO Signature Conf)**: YOLO confidence score for authorized signature (0.0 = signature removed).
* **f9 (YOLO Stamp Conf)**: YOLO confidence score for circular approval stamp (0.0 = stamp removed).
* **f10 (LayoutLM Conf)**: Token classification entity confidence score.
* **f11 (Missing Fields)**: Sum count of missing critical document structural items.

---

## 2. Experimental Results & Performance

Evaluation was conducted against a holdout test split of **150 samples** (75 genuine, 75 fraudulent across 8 distinct attack categories).

### AI Module Performance Metrics
* **OCR average WER**: 8.2%
* **OCR average CER**: 4.5%
* **YOLOv8 layout mAP50**: 91.2%
* **LayoutLMv3 Entity F1**: 87.5%

### XGBoost Classifier Performance
* **Accuracy**: 99.33%
* **Precision**: 100.00%
* **Recall**: 98.67%
* **F1 Score**: 99.33%
* **ROC-AUC**: 100.00%

---

## 3. Classification Report
```text
              precision    recall  f1-score   support

     Genuine       0.99      1.00      0.99        75
  Fraudulent       1.00      0.99      0.99        75

    accuracy                           0.99       150
   macro avg       0.99      0.99      0.99       150
weighted avg       0.99      0.99      0.99       150

```

---

## 4. Research Claim Boundaries
* **In-Scope Claims**: AI-powered medical document verification, multimodal fraud detection, document integrity analysis, medical invoice entity extraction, trust score generation, and crowdfunding campaign verification.
* **Out-of-Scope Claims**: Clinical fraud detection, medical document authentication, and production-grade fraud prevention.
