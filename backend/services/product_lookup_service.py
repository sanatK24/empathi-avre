"""
Product Lookup Service
Searches the web for medical equipment product information, images, and descriptions.
Uses DuckDuckGo Instant Answer API (no API key needed) with fallback to curated data.
"""
import requests
import json
import re
from typing import Dict, Any, Optional, List

# Curated medical equipment database for instant results + fallback
MEDICAL_EQUIPMENT_DB = {
    "oxygen cylinder": {
        "name": "Medical Oxygen Cylinder",
        "brand": "BPL / Philips",
        "category": "medical",
        "description": "High-purity medical-grade oxygen cylinder (99.5% O2) for therapeutic use in hospitals, clinics, and home healthcare. Available in sizes ranging from 1L portable to 47L jumbo. Manufactured under ISO 13485 standards with brass valve and pressure gauge. Essential for respiratory therapy, emergency care, and surgical procedures.",
        "image_url": "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Capacity": "10L / 47L",
            "Purity": "99.5% O2",
            "Pressure": "150 bar",
            "Material": "Seamless Steel",
            "Valve Type": "Brass CGA-540",
            "Certification": "ISO 13485, BIS",
            "Weight": "14.5 kg (10L)",
            "Shelf Life": "5 years"
        }),
        "price_range": "₹4,500 – ₹18,000"
    },
    "pulse oximeter": {
        "name": "Fingertip Pulse Oximeter",
        "brand": "Dr Trust / BPL",
        "category": "medical",
        "description": "FDA-approved fingertip pulse oximeter for non-invasive measurement of blood oxygen saturation (SpO2) and pulse rate. Features bright OLED display with multi-directional reading, auto power-off, and low battery indicator. Suitable for clinical monitoring, home use, and emergency triage.",
        "image_url": "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "SpO2 Range": "70% – 100%",
            "Pulse Rate": "30 – 250 BPM",
            "Display": "OLED Dual Color",
            "Battery": "2x AAA",
            "Accuracy": "±2% SpO2, ±2 BPM",
            "Weight": "50g",
            "Certification": "FDA, CE",
            "Auto Off": "8 seconds"
        }),
        "price_range": "₹800 – ₹2,500"
    },
    "nebulizer": {
        "name": "Compressor Nebulizer Machine",
        "brand": "Omron / Philips",
        "category": "medical",
        "description": "Piston-type compressor nebulizer for effective aerosol drug delivery. Converts liquid medication into fine mist for deep lung penetration. Features adjustable nebulization rate, low noise operation (<55dB), and durable motor. Ideal for asthma, COPD, and respiratory infection management.",
        "image_url": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Type": "Piston Compressor",
            "Nebulization Rate": "0.2 mL/min",
            "Particle Size": "3μm MMAD",
            "Noise Level": "<55 dB",
            "Medication Cup": "6 mL",
            "Power": "230V AC",
            "Certification": "CE, ISO 13485",
            "Warranty": "2 years"
        }),
        "price_range": "₹1,200 – ₹4,000"
    },
    "blood pressure monitor": {
        "name": "Digital Blood Pressure Monitor",
        "brand": "Omron / Dr Morepen",
        "category": "medical",
        "description": "Clinically validated automatic upper-arm blood pressure monitor with irregular heartbeat detection. Features Intellisense technology for comfortable, accurate measurements. Stores up to 60 readings with date/time stamp. Large LCD display suitable for elderly patients.",
        "image_url": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Measurement": "Oscillometric",
            "Range": "0-299 mmHg",
            "Accuracy": "±3 mmHg",
            "Memory": "60 readings",
            "Cuff Size": "22-42 cm",
            "Display": "Large LCD",
            "Power": "4x AA / USB",
            "Certification": "CE, FDA"
        }),
        "price_range": "₹1,500 – ₹3,500"
    },
    "wheelchair": {
        "name": "Foldable Manual Wheelchair",
        "brand": "Karma / Vissco",
        "category": "medical",
        "description": "Lightweight foldable manual wheelchair with chrome-plated steel frame and nylon upholstery. Features swing-away footrests, desk-length armrests, and anti-tip casters for safety. Dual-hub rear wheels for easy self-propulsion. Suitable for indoor and outdoor use.",
        "image_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Frame": "Chrome Steel",
            "Seat Width": "18 inch",
            "Weight Capacity": "120 kg",
            "Wheel Size": "24 inch rear",
            "Weight": "16 kg",
            "Foldable": "Yes",
            "Upholstery": "Nylon",
            "Certification": "ISO 7176"
        }),
        "price_range": "₹4,000 – ₹15,000"
    },
    "surgical mask": {
        "name": "3-Ply Surgical Face Mask",
        "brand": "Venus / Magnum",
        "category": "medical",
        "description": "Disposable 3-ply surgical face mask with melt-blown filter layer for ≥95% bacterial filtration efficiency (BFE). Features adjustable nose clip, elastic ear loops, and fluid-resistant outer layer. Suitable for clinical settings, patient care, and general infection prevention.",
        "image_url": "https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Layers": "3-ply (SMS)",
            "BFE": "≥95%",
            "PFE": "≥95%",
            "Fluid Resistance": "120 mmHg",
            "Ear Loop": "Elastic",
            "Nose Clip": "Adjustable",
            "Pack Size": "50 pcs",
            "Certification": "EN 14683 Type IIR"
        }),
        "price_range": "₹150 – ₹400 per box"
    },
    "thermometer": {
        "name": "Digital Infrared Thermometer",
        "brand": "Dr Trust / Berrcom",
        "category": "medical",
        "description": "Non-contact infrared forehead thermometer with instant 1-second reading. Features tri-color fever alert, memory recall of 32 readings, and switchable °C/°F display. Safe and hygienic contactless measurement ideal for screening, pediatric care, and home use.",
        "image_url": "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Type": "Infrared Non-Contact",
            "Range": "32°C – 42.9°C",
            "Accuracy": "±0.2°C",
            "Reading Time": "1 second",
            "Distance": "3-5 cm",
            "Memory": "32 readings",
            "Battery": "2x AAA",
            "Certification": "CE, FDA"
        }),
        "price_range": "₹800 – ₹2,500"
    },
    "stethoscope": {
        "name": "Dual-Head Stethoscope",
        "brand": "Littmann / MDF",
        "category": "medical",
        "description": "Professional-grade dual-head stethoscope with tunable diaphragm and traditional bell for versatile auscultation. Precision-machined stainless steel chest piece with non-chill rim. Flexible PVC tubing with excellent sound transmission. Suitable for general practice, cardiology, and emergency medicine.",
        "image_url": "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Type": "Dual-Head",
            "Diaphragm": "Tunable",
            "Material": "Stainless Steel",
            "Tubing": "PVC, 27 inch",
            "Weight": "150g",
            "Ear Tips": "Soft Silicone",
            "Frequency": "20-1000 Hz",
            "Warranty": "5 years"
        }),
        "price_range": "₹3,000 – ₹12,000"
    },
    "first aid kit": {
        "name": "Professional First Aid Kit",
        "brand": "St John / Savlon",
        "category": "medical",
        "description": "Comprehensive first aid kit containing 120+ essential items for workplace, travel, and emergency response. Includes bandages, antiseptic wipes, scissors, gloves, CPR mask, burn gel, and trauma dressings. Organized in durable waterproof case with clear labeling.",
        "image_url": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Items": "120+ pieces",
            "Case": "Hard-shell waterproof",
            "Contents": "Bandages, Gauze, Antiseptic, Gloves, Scissors, CPR Mask",
            "Size": "30x20x10 cm",
            "Weight": "1.2 kg",
            "Compliance": "OSHA/ANSI",
            "Expiry": "3 years",
            "Certification": "ISO 13485"
        }),
        "price_range": "₹500 – ₹3,000"
    },
    "glucometer": {
        "name": "Blood Glucose Monitoring System",
        "brand": "Accu-Chek / OneTouch",
        "category": "medical",
        "description": "Compact blood glucose monitor with no-coding technology and tiny 0.6μL sample size. Features 5-second results, 500-test memory with averaging, and connectivity for data transfer. Includes lancing device and test strips. Essential for diabetes management.",
        "image_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Sample Size": "0.6 μL",
            "Test Time": "5 seconds",
            "Range": "20-600 mg/dL",
            "Memory": "500 tests",
            "Battery": "CR2032",
            "Coding": "No Code",
            "Connectivity": "Bluetooth/USB",
            "Certification": "CE, FDA"
        }),
        "price_range": "₹800 – ₹2,000"
    },
    "ventilator": {
        "name": "ICU Mechanical Ventilator",
        "brand": "Drager / Hamilton",
        "category": "medical",
        "description": "Advanced ICU-grade mechanical ventilator with multiple ventilation modes including SIMV, CPAP, BiPAP, and Pressure Support. Features 15-inch touchscreen display, integrated SpO2/EtCO2 monitoring, and intelligent weaning protocols. Built-in battery backup for patient transport.",
        "image_url": "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Modes": "SIMV, CPAP, BiPAP, PSV, PRVC",
            "Tidal Volume": "20-2000 mL",
            "Respiratory Rate": "1-80 BPM",
            "FiO2": "21-100%",
            "Display": "15-inch Touch",
            "Battery": "4 hours backup",
            "Weight": "25 kg",
            "Certification": "CE, FDA, ISO 80601"
        }),
        "price_range": "₹5,00,000 – ₹25,00,000"
    },
    "defibrillator": {
        "name": "Automated External Defibrillator (AED)",
        "brand": "Philips / Zoll",
        "category": "medical",
        "description": "Portable semi-automatic AED with voice and visual prompts for guiding rescuers through CPR and defibrillation. Features real-time CPR feedback, pediatric mode, and pre-connected electrode pads. IP55-rated for indoor/outdoor use. Essential for cardiac emergency preparedness.",
        "image_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Type": "Semi-Automatic AED",
            "Energy": "150-200J Biphasic",
            "Analysis Time": "<10 seconds",
            "CPR Feedback": "Real-time",
            "Battery": "5-year standby",
            "IP Rating": "IP55",
            "Weight": "2.4 kg",
            "Certification": "CE, FDA, AHA"
        }),
        "price_range": "₹80,000 – ₹2,50,000"
    },
    "hospital bed": {
        "name": "Electric ICU Hospital Bed",
        "brand": "Stryker / Hill-Rom",
        "category": "medical",
        "description": "Motorized 3-function ICU hospital bed with adjustable head, knee, and height sections via handset control. Features collapsible side rails, 4-section mattress platform, and central-locking castors. Anti-Trendelenburg positioning and CPR quick-release backrest for emergency use.",
        "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Functions": "3 Electric",
            "Mattress Size": "200x90 cm",
            "Height Range": "40-80 cm",
            "Weight Capacity": "200 kg",
            "Side Rails": "Collapsible",
            "Castors": "5-inch Central Lock",
            "Material": "Steel Frame, ABS",
            "Certification": "CE, ISO 13485"
        }),
        "price_range": "₹45,000 – ₹2,00,000"
    },
    "syringe": {
        "name": "Disposable Medical Syringe",
        "brand": "BD / Hindustan Syringes",
        "category": "medical",
        "description": "Sterile single-use disposable syringe with smooth-gliding plunger and clear barrel markings for precise dosage. Available in 1mL, 2mL, 5mL, and 10mL sizes. Features luer-lock tip for secure needle attachment and EO sterilized individual packaging.",
        "image_url": "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Sizes": "1mL, 2mL, 5mL, 10mL",
            "Tip": "Luer-Lock",
            "Material": "Polypropylene",
            "Sterilization": "EO Gas",
            "Graduation": "0.1 mL",
            "Latex Free": "Yes",
            "Pack Size": "100 pcs",
            "Certification": "ISO 7886, CE"
        }),
        "price_range": "₹100 – ₹500 per box"
    },
    "iv stand": {
        "name": "Stainless Steel IV Stand",
        "brand": "Surgikare / Narang",
        "category": "medical",
        "description": "Height-adjustable stainless steel IV drip stand with 4 hooks for multiple infusion bags. Features 5-leg spider base with locking castors for stability during patient transport. Telescopic pole extends from 135cm to 220cm. Suitable for hospital wards, ICU, and home healthcare.",
        "image_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=400&fit=crop",
        "specifications": json.dumps({
            "Material": "Stainless Steel 304",
            "Height": "135-220 cm",
            "Hooks": "4 (S-type)",
            "Base": "5-leg Spider",
            "Castors": "50mm Locking",
            "Weight": "3.5 kg",
            "Load Capacity": "10 kg",
            "Certification": "CE, ISO 13485"
        }),
        "price_range": "₹1,500 – ₹4,000"
    }
}


class ProductLookupService:
    @staticmethod
    def search_product(query: str) -> Dict[str, Any]:
        """
        Search for medical equipment product information.
        Uses curated DB first, then falls back to web search.
        """
        query_lower = query.strip().lower()
        
        # 1. Try exact/fuzzy match from curated DB
        best_match = None
        best_score = 0
        for key, data in MEDICAL_EQUIPMENT_DB.items():
            # Check for substring match
            if key in query_lower or query_lower in key:
                score = len(key) / max(len(query_lower), 1)
                if score > best_score:
                    best_score = score
                    best_match = data
            # Check individual words
            query_words = set(query_lower.split())
            key_words = set(key.split())
            overlap = len(query_words & key_words)
            if overlap > 0:
                word_score = overlap / max(len(key_words), 1)
                if word_score > best_score:
                    best_score = word_score
                    best_match = data
        
        if best_match and best_score > 0.3:
            return {
                "found": True,
                "source": "curated_db",
                "product": best_match
            }
        
        # 2. Try DuckDuckGo Instant Answer API
        try:
            web_result = ProductLookupService._search_duckduckgo(query)
            if web_result:
                return {
                    "found": True,
                    "source": "web_search",
                    "product": web_result
                }
        except Exception as e:
            print(f"Web search failed: {e}")
        
        # 3. Generate a generic template
        return {
            "found": False,
            "source": "template",
            "product": {
                "name": query.title(),
                "brand": "",
                "category": "medical",
                "description": f"Medical-grade {query.lower()} for healthcare and clinical use. Please update this description with specific product details.",
                "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop",
                "specifications": json.dumps({
                    "Type": query.title(),
                    "Category": "Medical Equipment",
                    "Certification": "To be specified",
                    "Warranty": "To be specified"
                }),
                "price_range": "Price varies"
            }
        }

    @staticmethod
    def _search_duckduckgo(query: str) -> Optional[Dict[str, Any]]:
        """Use DuckDuckGo Instant Answer API for product info."""
        search_query = f"{query} medical equipment specifications"
        
        resp = requests.get(
            "https://api.duckduckgo.com/",
            params={"q": search_query, "format": "json", "no_html": 1, "skip_disambig": 1},
            timeout=5
        )
        
        if not resp.ok:
            return None
            
        data = resp.json()
        abstract = data.get("AbstractText", "")
        image = data.get("Image", "")
        
        if not abstract and not image:
            # Try related topics for description
            topics = data.get("RelatedTopics", [])
            if topics:
                abstract = topics[0].get("Text", "") if isinstance(topics[0], dict) else ""
        
        if abstract:
            return {
                "name": query.title(),
                "brand": "",
                "category": "medical",
                "description": abstract[:500],
                "image_url": image if image.startswith("http") else f"https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop",
                "specifications": json.dumps({
                    "Type": query.title(),
                    "Source": data.get("AbstractSource", "Web"),
                    "Category": "Medical Equipment"
                }),
                "price_range": "Contact for pricing"
            }
        
        return None

    @staticmethod
    def get_suggestions(prefix: str) -> List[str]:
        """Get product name suggestions based on prefix."""
        prefix_lower = prefix.strip().lower()
        if len(prefix_lower) < 2:
            return list(MEDICAL_EQUIPMENT_DB.keys())[:8]
        
        matches = []
        for key in MEDICAL_EQUIPMENT_DB.keys():
            if prefix_lower in key or any(word.startswith(prefix_lower) for word in key.split()):
                matches.append(MEDICAL_EQUIPMENT_DB[key]["name"])
        
        return matches[:10]

    @staticmethod
    def get_all_templates() -> List[Dict[str, Any]]:
        """Get all common medical equipment templates."""
        return list(MEDICAL_EQUIPMENT_DB.values())
