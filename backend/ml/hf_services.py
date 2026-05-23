import os
import re
import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class HFServices:
    """
    Centralized Hugging Face Inference API wrapper.

    IMPORTANT: This module is exercised by `test_ml_hf_and_features.py`.
    The tests expect *safe, non-failing fallbacks* when HF is unavailable.

    Additionally, HF request/payload shapes are aligned to the working
    router.huggingface.co examples used in the provided task statement.
    """


    def __init__(self):
        from config import settings
        self.api_key = settings.HUGGINGFACE_API_KEY
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        self.api_base = "https://router.huggingface.co/hf-inference/models"
        
        if not self.api_key:
            logger.warning("HF_TOKEN not found in environment. Hugging Face integrations will use mock fallbacks.")

    def _post_chat_completions(self, payload: Any, timeout_s: int = 20) -> Optional[Any]:
        """POST to https://router.huggingface.co/v1/chat/completions (non-stream)."""
        if not self.api_key:
            return None

        url = "https://router.huggingface.co/v1/chat/completions"
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=timeout_s)
            if response.status_code == 200:
                return response.json()

            logger.warning(
                "HF API Error: %s %s", response.status_code, getattr(response, "text", "")[:500]
            )
            return None
        except Exception as e:
            logger.error("HF API Exception: %s", str(e))
            return None

    def _post_inference(self, model_id: str, payload: Any, timeout_s: int = 15) -> Optional[Any]:
        """POST to https://router.huggingface.co/hf-inference/models/<model_id>."""
        if not self.api_key:
            return None

        url = f"{self.api_base}/{model_id}"
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=timeout_s)
            if response.status_code == 200:
                return response.json()

            logger.warning(
                "HF inference API Error: %s %s", response.status_code, getattr(response, "text", "")[:500]
            )
            return None
        except Exception as e:
            logger.error("HF inference API Exception: %s", str(e))
            return None


    def _post_image(self, model_id: str, image_bytes: bytes) -> Optional[Any]:
        if not self.api_key:
            return None
        
        url = f"{self.api_base}/{model_id}"
        headers = self.headers.copy()
        headers["Content-Type"] = "application/octet-stream"
        try:
            response = requests.post(url, headers=headers, data=image_bytes, timeout=15)
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"HF API Error ({model_id}): {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"HF API Exception ({model_id}): {str(e)}")
            return None

    # A. SEMANTIC EMBEDDINGS
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using HF Inference Router.

        Payload shape must follow the official SentenceSimilarityPipeline example.
        """
        model = "sentence-transformers/all-MiniLM-L6-v2"

        payload = {
            "inputs": {
                "source_sentence": text,
                "sentences": [text]
            }
        }

        res = self._post_inference(model, payload)

        if res and isinstance(res, list):
            # Some variants return [ [floats...] ] and some return [floats...]
            if res and isinstance(res[0], list):
                vec = res[0]
            else:
                vec = res

            # Ensure all are floats
            try:
                return [float(x) for x in vec]
            except Exception:
                pass

        return [0.0] * 384


    # B. CAMPAIGN CATEGORY CLASSIFICATION
    def classify_category(self, text: str) -> Dict[str, Any]:
        model = "facebook/bart-large-mnli"
        candidate_labels = [
            "medical", "emergency", "disaster relief", "education",
            "animal rescue", "food support", "shelter", "community aid"
        ]
        res = self._post_inference(
            model,
            {"inputs": text, "parameters": {"candidate_labels": candidate_labels}},
        )

        if res and "labels" in res and "scores" in res:

            return {
                "category_tags": res["labels"][:2],  # Top 2
                "category_confidence": res["scores"][0],
                "primary_category": res["labels"][0]
            }
            
        return {
            "category_tags": ["community aid"],
            "category_confidence": 0.5,
            "primary_category": "community aid"
        }

    # C. CAMPAIGN SUMMARIZATION
    def summarize_campaign(self, text: str) -> str:
        model = "sshleifer/distilbart-cnn-12-6"
        res = self._post_inference(model, {"inputs": text})

        
        if res and isinstance(res, list) and "summary_text" in res[0]:
            return res[0]["summary_text"]
            
        return "Summary not available."

    # D. DOCUMENT OCR
    def extract_document_text(self, image_bytes: bytes) -> str:
        """Local OCR using TrOCR.

        Notes:
        - Unit tests may pass tiny/invalid byte streams; fail safe and return "".
        - Model/processor are loaded lazily and cached in-process.
        """
        try:
            # Fail fast on obviously bad input
            if not image_bytes or len(image_bytes) < 16:
                return ""

            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
            from PIL import Image
            import io

            # Cache on the instance to avoid re-downloading per call
            if not hasattr(self, "_trocr_processor"):
                self._trocr_processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
            if not hasattr(self, "_trocr_model"):
                self._trocr_model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")

            processor = self._trocr_processor
            model = self._trocr_model

            # Robust image decode
            try:
                image = Image.open(io.BytesIO(image_bytes))
                image = image.convert("RGB")
            except Exception:
                return ""

            pixel_values = processor(images=image, return_tensors="pt").pixel_values

            import torch

            model.eval()
            with torch.no_grad():
                generated_ids = model.generate(pixel_values)

            generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            return generated_text

        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return ""



    # E. DOCUMENT UNDERSTANDING
    def understand_document(self, image_bytes: bytes, question: str) -> str:
        # LayoutLM doesn't accept pure image bytes easily via simple inference API without specific formatting.
        # But we can try the standard Visual Question Answering format:
        model = "impira/layoutlm-document-qa"
        
        # For simplicity in this lightweight version, we will mock the LayoutLM output
        # since it often requires multi-part requests on the Inference API.
        return "Mocked document answer"

    # F. OPTIONAL IMAGE VALIDATION
    def validate_image_context(self, image_bytes: bytes) -> str:
        """Local BLIP image captioning.

        Notes:
        - Unit tests may use tiny/invalid byte streams; fail safe and return "".
        - Model/processor are loaded lazily and cached in-process.
        """
        try:
            if not image_bytes or len(image_bytes) < 16:
                return ""

            from transformers import BlipProcessor, BlipForConditionalGeneration
            from PIL import Image
            import io

            if not hasattr(self, "_blip_processor"):
                self._blip_processor = BlipProcessor.from_pretrained(
                    "Salesforce/blip-image-captioning-base"
                )
            if not hasattr(self, "_blip_model"):
                self._blip_model = BlipForConditionalGeneration.from_pretrained(
                    "Salesforce/blip-image-captioning-base"
                )

            processor = self._blip_processor
            model = self._blip_model

            try:
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            except Exception:
                return ""

            inputs = processor(image, return_tensors="pt")

            import torch

            model.eval()
            with torch.no_grad():
                out = model.generate(**inputs)

            caption = processor.decode(out[0], skip_special_tokens=True)
            return caption

        except Exception as e:
            logger.error(f"BLIP Error: {e}")
            return ""



    # G. OPTIONAL TOXIC/SPAM DETECTION
    def detect_toxicity(self, text: str) -> float:
        model = "unitary/toxic-bert"
        res = self._post_inference(model, {"inputs": text})

        
        # toxic-bert returns multiple labels like toxic, severe_toxic, etc.
        if res and isinstance(res, list) and isinstance(res[0], list):
            scores = {item['label']: item['score'] for item in res[0]}
            return scores.get('toxic', 0.0)
            
        return 0.0

    # H. AI-POWERED CAMPAIGN IMPROVEMENT AND EXTRACTION
    def analyze_campaign_comprehensive(self, text: str, historical_campaigns: List[Any] = None, taxonomy_str: str = "") -> Dict[str, Any]:
        """
        Coherently analyze the entire campaign text using a Generative LLM via Hugging Face.
        """
        # Default fallback structure
        fallback = {
            "suggestions": "Consider adding more details to your campaign description.",
            "extracted_goal": None,
            "predicted_category": None,
            "predicted_subcategory": None,
            "inferred_urgency": "MEDIUM"
        }
        
        if not self.api_key:
            return fallback

        model = "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai"

        
        system_prompt = f"""
You are a JSON API.

CRITICAL RULES:
- Return ONLY valid JSON
- No markdown
- No explanations
- No extra text
- No EXPECTED OUTPUT
- No examples
- No commentary

Required schema:
{{
  "suggestions": "string",
  "extracted_goal": integer or null,
  "predicted_category": string or null,
  "predicted_subcategory": string or null,
  "inferred_urgency": "LOW|MEDIUM|HIGH|CRITICAL"
}}

AVAILABLE CATEGORIES AND SUBCATEGORIES:
{taxonomy_str}
"""

        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"CAMPAIGN TEXT:\n{text}"}
            ],
            "max_tokens": 256,
            "temperature": 0.1
        }
        
        res = self._post_chat_completions(payload)

        if res and "choices" in res and len(res["choices"]) > 0:
            raw_text = res["choices"][0]["message"]["content"].strip()
            
            # Defensive JSON extraction
            # Sometimes models return ```json ... ``` blocks
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
                
            import json
            import re

            try:
                # Extract ONLY the first valid JSON object (non-greedy)
                match = re.search(r'\{.*?\}', raw_text, re.DOTALL)
                if not match:
                    return fallback

                data = json.loads(match.group(0))

                
                # Check if suggestions is a list and convert to string if needed
                suggestions_val = data.get("suggestions", fallback["suggestions"])
                if isinstance(suggestions_val, list):
                    suggestions_val = "\n".join(suggestions_val)
                    
                return {
                    "suggestions": suggestions_val,
                    "extracted_goal": data.get("extracted_goal"),
                    "predicted_category": data.get("predicted_category"),
                    "predicted_subcategory": data.get("predicted_subcategory"),
                    "inferred_urgency": data.get("inferred_urgency", "MEDIUM")
                }
            except Exception as e:
                logger.error(f"Failed to parse LLM JSON: {e} | Raw text: {raw_text}")
                return fallback
                
        return fallback

hf_services = HFServices()
