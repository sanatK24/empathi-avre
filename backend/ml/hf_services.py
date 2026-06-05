import os
import re
import json
import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class HFServices:
    def __init__(self):
        from config import settings
        self.api_key = settings.HUGGINGFACE_API_KEY
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        self.api_base = "https://router.huggingface.co/hf-inference/models"
        if not self.api_key: logger.warning("HF_TOKEN not found in environment. Hugging Face integrations will use mock fallbacks.")
    def _post_chat_completions(self, payload: Any, timeout_s: int = 20) -> Optional[Any]:
        if not self.api_key: return None
        try:
            r = requests.post("https://router.huggingface.co/v1/chat/completions", headers=self.headers, json=payload, timeout=timeout_s)
            if r.status_code == 200: return r.json()
            logger.warning("HF API Error: %s %s", r.status_code, getattr(r, "text", "")[:500])
        except Exception as e: logger.error("HF API Exception: %s", e)
        return None
    def _post_inference(self, model_id: str, payload: Any, timeout_s: int = 15) -> Optional[Any]:
        if not self.api_key: return None
        try:
            r = requests.post(f"{self.api_base}/{model_id}", headers=self.headers, json=payload, timeout=timeout_s)
            if r.status_code == 200: return r.json()
            logger.warning("HF inference API Error: %s %s", r.status_code, getattr(r, "text", "")[:500])
        except Exception as e: logger.error("HF inference API Exception: %s", e)
        return None
    def _post_image(self, model_id: str, image_bytes: bytes) -> Optional[Any]:
        if not self.api_key: return None
        headers = {**self.headers, "Content-Type": "application/octet-stream"}
        try:
            r = requests.post(f"{self.api_base}/{model_id}", headers=headers, data=image_bytes, timeout=15)
            if r.status_code == 200: return r.json()
            logger.warning(f"HF API Error ({model_id}): {r.status_code} - {r.text}")
        except Exception as e: logger.error(f"HF API Exception ({model_id}): {e}")
        return None
    def generate_embedding(self, text: str) -> List[float]:
        res = self._post_inference("BAAI/bge-small-en-v1.5", {"inputs": text})
        if res and isinstance(res, list):
            vec = res[0] if (res and isinstance(res[0], list)) else res
            try: return [float(x) for x in vec]
            except Exception: pass
        return [0.0] * 384
    def classify_category(self, text: str) -> Dict[str, Any]:
        res = self._post_inference("MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33", {"inputs": text, "parameters": {"candidate_labels": ["medical", "emergency", "disaster relief", "education", "animal rescue", "food support", "shelter", "community aid"]}})
        if res and "labels" in res and "scores" in res:
            return {"category_tags": res["labels"][:2], "category_confidence": res["scores"][0], "primary_category": res["labels"][0]}
        return {"category_tags": ["community aid"], "category_confidence": 0.5, "primary_category": "community aid"}
    def summarize_campaign(self, text: str) -> str:
        res = self._post_inference("sshleifer/distilbart-cnn-12-6", {"inputs": text})
        return res[0]["summary_text"] if res and isinstance(res, list) and "summary_text" in res[0] else "Summary not available."

    def validate_image_context(self, image_bytes: bytes) -> str:
        try:
            if not image_bytes or len(image_bytes) < 16: return ""
            from transformers import BlipProcessor, BlipForConditionalGeneration
            from PIL import Image
            import io
            if not hasattr(self, "_blip_processor"): self._blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
            if not hasattr(self, "_blip_model"): self._blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
            try: image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            except Exception: return ""
            import torch
            self._blip_model.eval()
            with torch.no_grad():
                out = self._blip_model.generate(**self._blip_processor(image, return_tensors="pt"))
            return self._blip_processor.decode(out[0], skip_special_tokens=True)
        except Exception as e:
            logger.error(f"BLIP Error: {e}")
            return ""
    def detect_toxicity(self, text: str) -> float:
        if not self.api_key: return 0.0
        try:
            res = self._post_inference("unitary/toxic-bert", {"inputs": text}, timeout_s=5)
            if res and isinstance(res, list) and isinstance(res[0], list):
                val = {i.get('label'): i.get('score') for i in res[0] if isinstance(i, dict)}.get('toxic')
                return float(val) if val is not None else 0.0
        except Exception: pass
        return 0.0
    def analyze_campaign_comprehensive(self, text: str, historical_campaigns: List[Any] = None, taxonomy_str: str = "") -> Dict[str, Any]:
        fallback = {"suggestions": "Consider adding more details to your campaign description.", "extracted_goal": None, "predicted_category": None, "predicted_subcategory": None, "inferred_urgency": "MEDIUM"}
        if not self.api_key: return fallback
        sys_prompt = f"\nYou are a JSON API.\n\nCRITICAL RULES:\n- Return ONLY valid JSON\n- No markdown, extra text, or commentary\n- For `extracted_goal`, perform CALCULATIVE ANALYSIS on the text. Find the sum total of the budget required or the overall estimated cost. Then, remove all commas and extract the FULL integer. For example, if you see 'TOTAL ESTIMATED COST £44,000.00' and 'we need USD 1,80,000', use the final requested amount (180000). Do NOT just return `1`. \n- `predicted_category` and `predicted_subcategory` MUST be chosen EXACTLY from the provided list below. DO NOT invent new categories.\n\nRequired schema:\n{{\n  \"suggestions\": \"string\",\n  \"extracted_goal\": integer or null,\n  \"predicted_category\": \"Exact Category Name\",\n  \"predicted_subcategory\": \"Exact Subcategory Name\",\n  \"inferred_urgency\": \"LOW|MEDIUM|HIGH|CRITICAL\"\n}}\n\nAVAILABLE CATEGORIES AND SUBCATEGORIES:\n{taxonomy_str}\n"
        res = self._post_chat_completions({"model": "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai", "messages": [{"role": "system", "content": sys_prompt}, {"role": "user", "content": f"CAMPAIGN TEXT:\n{text}"}], "max_tokens": 256, "temperature": 0.1})
        if res and "choices" in res and len(res["choices"]) > 0:
            raw_text = res["choices"][0]["message"]["content"].strip()
            if "```" in raw_text: raw_text = raw_text.split("```json" if "```json" in raw_text else "```")[1].split("```")[0].strip()
            try:
                match = re.search(r'\{.*?\}', raw_text, re.DOTALL)
                if not match: return fallback
                data = json.loads(match.group(0))
                sug = data.get("suggestions", fallback["suggestions"])
                return {"suggestions": "\n".join(sug) if isinstance(sug, list) else sug, "extracted_goal": data.get("extracted_goal"), "predicted_category": data.get("predicted_category"), "predicted_subcategory": data.get("predicted_subcategory"), "inferred_urgency": data.get("inferred_urgency", "MEDIUM")}
            except Exception as e: logger.error(f"Failed to parse LLM JSON: {e} | Raw text: {raw_text}")
        return fallback
    def refine_campaign_description(self, text: str) -> str:
        if not self.api_key: return text + "\n\n(Note: HF API Key missing. Original text returned.)"
        res = self._post_chat_completions({
            "model": "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai",
            "messages": [{"role": "system", "content": "You are a professional copywriter. Rewrite the given humanitarian or medical campaign description to make it more emotional, attention-grabbing, and compelling. Improve clarity and impact. Keep it realistic. Just return the new text, no intro, no markdown blocks, no outro."}, {"role": "user", "content": text}],
            "max_tokens": 1024,
            "temperature": 0.7
        })
        return res["choices"][0]["message"]["content"].strip() if res and "choices" in res and res["choices"] else text

    def analyze_report(self, campaign_title: str, campaign_description: str, report_reason: str) -> str:
        if not self.api_key: return "Mock AI Analysis: Checked report reason. No severe violations detected."
        sys_prompt = "You are an AI moderator assistant. Analyze the user's report reason for a fundraising campaign. Provide a concise, 1-2 sentence analysis summarizing the validity and severity of the report. Keep it professional."
        user_prompt = f"Campaign Title: {campaign_title}\nCampaign Description: {campaign_description}\nReport Reason: {report_reason}"
        res = self._post_chat_completions({
            "model": "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai",
            "messages": [{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}],
            "max_tokens": 128,
            "temperature": 0.3
        })
        return res["choices"][0]["message"]["content"].strip() if res and "choices" in res and res["choices"] else "AI Analysis: Analysis unavailable."

hf_services = HFServices()
