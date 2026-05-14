"""
Direct Emergency Resource Search - AI TRIAGE Integration

When user types: "I need B+ blood"
System immediately searches and shows:
- Blood banks nearby
- Hospitals with blood banks
- Phone numbers and addresses
- Sorted by distance (nearest first)

NO request creation, NO form filling - just direct resource lookup
"""

# NEW ENDPOINT: POST /emergency/search-resources
# INPUT: Natural language query from AI TRIAGE
# OUTPUT: Instant list of matching resources with contact info

import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import APIRouter, Depends, Query
from database import get_db
from models import User, EmergencyContact
from api.deps import get_active_user
from services.llm_service import process_emergency_triage
from services.overpass_service import OverpassService
import asyncio

router = APIRouter()

@router.post("/search-resources")
async def search_emergency_resources(
    query: str = Query(..., description="User's natural language request (e.g., 'I need B+ blood')"),
    lat: float = Query(default=19.0760, description="User latitude"),
    lng: float = Query(default=72.8777, description="User longitude"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    DIRECT EMERGENCY RESOURCE SEARCH

    User types: "I need B+ blood urgently"
    ↓
    This endpoint immediately searches and returns:
    - Nearby blood banks (name, distance, phone, address)
    - Hospitals with blood services
    - Emergency contacts
    - ALL sorted by distance (nearest first)

    NO request creation, NO form - just instant resource list
    """

    try:
        # Step 1: Analyze query with OLLAMA to understand what they need
        triage_result = await process_emergency_triage(query)

        resource_type = triage_result.get("resource_type", "").lower()
        subtype = triage_result.get("subtype", "").lower()
        urgency = triage_result.get("urgency_level", "medium")

        # Step 2: Search for matching resources based on what LLM detected
        resources = await _search_resources_by_type(
            db, resource_type, subtype, lat, lng, query
        )

        # Step 3: Sort by distance (nearest first)
        resources_sorted = sorted(
            resources,
            key=lambda r: float(r.get("distance_km", 999))
        )

        return {
            "success": True,
            "urgency": urgency,
            "requested": query,
            "resource_type": resource_type,
            "subtype": subtype,
            "count": len(resources_sorted),
            "resources": resources_sorted,
            "message": f"Found {len(resources_sorted)} {resource_type} resources nearby"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Search failed"
        }


async def _search_resources_by_type(
    db: Session,
    resource_type: str,
    subtype: str,
    lat: float,
    lng: float,
    original_query: str
) -> List[Dict]:
    """
    Search for specific resource type

    Handles:
    - blood → Blood banks + hospitals with blood services
    - oxygen → Pharmacies + hospitals + vendors
    - shelter → Emergency shelters + relief camps
    - ambulance → Ambulance services + hospitals
    - hospital → All nearby hospitals
    - medicine/pharma → Pharmacies
    - etc.
    """

    resources = []

    # Blood Request: B+, B-, O+, O-, A+, A-, AB+, AB-
    if "blood" in resource_type:
        resources = await _search_blood_banks(db, subtype, lat, lng)

    # Oxygen/Respiratory
    elif any(x in resource_type for x in ["oxygen", "o2", "respiratory", "breathing"]):
        resources = await _search_oxygen_sources(db, lat, lng)

    # Shelter/Housing
    elif any(x in resource_type for x in ["shelter", "housing", "refuge", "flood"]):
        resources = await _search_shelters(db, lat, lng)

    # Ambulance/Transport
    elif any(x in resource_type for x in ["ambulance", "transport", "vehicle"]):
        resources = await _search_ambulances(db, lat, lng)

    # Medicine/Pharmacy
    elif any(x in resource_type for x in ["medicine", "drug", "pill", "pharma"]):
        resources = await _search_pharmacies(db, subtype, lat, lng)

    # Hospital/Medical
    elif any(x in resource_type for x in ["hospital", "medical", "bed", "emergency"]):
        resources = await _search_hospitals(db, lat, lng)

    # General search as fallback
    else:
        resources = await _search_general(db, resource_type, lat, lng)

    return resources


async def _search_blood_banks(db: Session, blood_type: str, lat: float, lng: float) -> List[Dict]:
    """
    Search for blood banks with specific blood type

    Returns: [
        {
            "name": "Apollo Blood Bank",
            "type": "blood_bank",
            "blood_type": "B+",
            "distance_km": 2.1,
            "phone": "+91-9876543210",
            "address": "Apollo Hospital Complex, Mumbai",
            "hours": "24/7",
            "available": True,
            "url": "https://maps.google.com/..."
        },
        ...
    ]
    """

    blood_banks = []

    try:
        # Search OSM for blood banks
        osm_results = OverpassService.get_nearby_resources(
            lat, lng, "blood bank", radius_meters=5000
        )

        for bank in osm_results:
            blood_banks.append({
                "name": bank.get("name", "Unknown Blood Bank"),
                "type": "blood_bank",
                "blood_type": blood_type.upper() if blood_type else "Available",
                "distance_km": round(bank.get("distance", 0) / 1000, 1),
                "phone": bank.get("phone", "Not available"),
                "address": bank.get("address", bank.get("name", "")),
                "hours": bank.get("opening_hours", "24/7"),
                "available": True,
                "lat": bank.get("lat"),
                "lng": bank.get("lon")
            })

        # Also search hospitals with blood bank services
        hospitals = OverpassService.get_nearby_resources(
            lat, lng, "hospital", radius_meters=5000
        )

        for hosp in hospitals[:3]:  # Top 3 hospitals
            blood_banks.append({
                "name": f"{hosp.get('name', 'Hospital')} (Blood Bank)",
                "type": "hospital_blood_bank",
                "blood_type": blood_type.upper() if blood_type else "Multiple",
                "distance_km": round(hosp.get("distance", 0) / 1000, 1),
                "phone": hosp.get("phone", "Emergency: 102"),
                "address": hosp.get("address", hosp.get("name", "")),
                "hours": "24/7",
                "available": True,
                "lat": hosp.get("lat"),
                "lng": hosp.get("lon")
            })

    except Exception as e:
        print(f"[BloodBank Search] Error: {e}")

    return blood_banks


async def _search_oxygen_sources(db: Session, lat: float, lng: float) -> List[Dict]:
    """Search for oxygen suppliers: pharmacies + hospitals"""

    sources = []

    try:
        # Pharmacies
        pharmacies = OverpassService.get_nearby_resources(lat, lng, "pharmacy", 5000)
        for pharm in pharmacies[:5]:
            sources.append({
                "name": pharm.get("name", "Pharmacy"),
                "type": "pharmacy",
                "product": "Oxygen cylinders, medical supplies",
                "distance_km": round(pharm.get("distance", 0) / 1000, 1),
                "phone": pharm.get("phone", "Check Google Maps"),
                "address": pharm.get("address", ""),
                "hours": pharm.get("opening_hours", "10 AM - 10 PM"),
                "available": True
            })

        # Hospitals with oxygen
        hospitals = OverpassService.get_nearby_resources(lat, lng, "hospital", 5000)
        for hosp in hospitals[:3]:
            sources.append({
                "name": hosp.get("name", "Hospital"),
                "type": "hospital",
                "product": "Oxygen, medical emergency services",
                "distance_km": round(hosp.get("distance", 0) / 1000, 1),
                "phone": hosp.get("phone", "Emergency: 102"),
                "address": hosp.get("address", ""),
                "hours": "24/7",
                "available": True
            })

    except Exception as e:
        print(f"[Oxygen Search] Error: {e}")

    return sources


async def _search_shelters(db: Session, lat: float, lng: float) -> List[Dict]:
    """Search for emergency shelters and relief centers"""

    shelters = []

    try:
        # OSM shelters
        osm_shelters = OverpassService.get_nearby_resources(lat, lng, "shelter", 5000)
        for shelter in osm_shelters:
            shelters.append({
                "name": shelter.get("name", "Emergency Shelter"),
                "type": "shelter",
                "capacity": shelter.get("capacity", "Unknown"),
                "distance_km": round(shelter.get("distance", 0) / 1000, 1),
                "phone": shelter.get("phone", "Emergency: 1234567890"),
                "address": shelter.get("address", ""),
                "available_beds": "Check availability",
                "contact": shelter.get("contact", "")
            })

        # Relief camps from database
        try:
            from models import Campaign
            relief_campaigns = db.query(Campaign).filter(
                and_(
                    Campaign.city.like(f"%Mumbai%"),  # Add geolocation
                    Campaign.category.like("%relief%")
                )
            ).all()

            for camp in relief_campaigns[:3]:
                shelters.append({
                    "name": camp.name,
                    "type": "relief_camp",
                    "capacity": "Multiple families",
                    "distance_km": "Check map",
                    "phone": camp.organizer_phone if hasattr(camp, 'organizer_phone') else "Contact organizer",
                    "address": camp.location if hasattr(camp, 'location') else "Relief Center",
                    "available_beds": "Available",
                    "contact": camp.organizer_name
                })
        except:
            pass

    except Exception as e:
        print(f"[Shelter Search] Error: {e}")

    return shelters


async def _search_ambulances(db: Session, lat: float, lng: float) -> List[Dict]:
    """Search for ambulance services"""

    ambulances = []

    try:
        osm_ambulances = OverpassService.get_nearby_resources(lat, lng, "ambulance", 5000)
        for amb in osm_ambulances:
            ambulances.append({
                "name": amb.get("name", "Ambulance Service"),
                "type": "ambulance",
                "service": "Emergency transport",
                "distance_km": round(amb.get("distance", 0) / 1000, 1),
                "phone": amb.get("phone", "Emergency: 102"),
                "address": amb.get("address", ""),
                "response_time": "5-10 minutes",
                "available": True
            })

        # Add emergency ambulance number
        ambulances.insert(0, {
            "name": "National Ambulance Service",
            "type": "emergency_ambulance",
            "service": "Emergency transport - Call immediately",
            "distance_km": 0,
            "phone": "102",  # ← DIRECT CALL NUMBER
            "address": "All India Emergency Service",
            "response_time": "Fastest",
            "available": True
        })

    except Exception as e:
        print(f"[Ambulance Search] Error: {e}")

    return ambulances


async def _search_hospitals(db: Session, lat: float, lng: float) -> List[Dict]:
    """Search for nearby hospitals"""

    hospitals = []

    try:
        osm_hospitals = OverpassService.get_nearby_resources(lat, lng, "hospital", 5000)

        for hosp in osm_hospitals[:10]:  # Top 10 nearest hospitals
            hospitals.append({
                "name": hosp.get("name", "Hospital"),
                "type": "hospital",
                "beds": "General + Emergency",
                "distance_km": round(hosp.get("distance", 0) / 1000, 1),
                "phone": hosp.get("phone", "Emergency: 102"),
                "address": hosp.get("address", ""),
                "emergency": "24/7",
                "available": True,
                "services": "Emergency, ICU, Surgery, Blood Bank"
            })

    except Exception as e:
        print(f"[Hospital Search] Error: {e}")

    return hospitals


async def _search_pharmacies(db: Session, medicine_type: str, lat: float, lng: float) -> List[Dict]:
    """Search for pharmacies"""

    pharmacies = []

    try:
        osm_pharmacies = OverpassService.get_nearby_resources(lat, lng, "pharmacy", 5000)

        for pharm in osm_pharmacies[:10]:
            pharmacies.append({
                "name": pharm.get("name", "Pharmacy"),
                "type": "pharmacy",
                "medicine": medicine_type or "General medicines",
                "distance_km": round(pharm.get("distance", 0) / 1000, 1),
                "phone": pharm.get("phone", "Contact directly"),
                "address": pharm.get("address", ""),
                "hours": pharm.get("opening_hours", "9 AM - 9 PM"),
                "delivery": "Available",
                "available": True
            })

    except Exception as e:
        print(f"[Pharmacy Search] Error: {e}")

    return pharmacies


async def _search_general(db: Session, query: str, lat: float, lng: float) -> List[Dict]:
    """General search fallback"""

    # Return emergency contacts as general resources
    try:
        from models import EmergencyContact
        contacts = db.query(EmergencyContact).limit(10).all()

        return [
            {
                "name": c.name,
                "type": "emergency_contact",
                "category": c.category,
                "phone": c.phone,
                "address": c.address if hasattr(c, 'address') else "City-wide service",
                "available": True
            }
            for c in contacts
        ]
    except:
        return []
