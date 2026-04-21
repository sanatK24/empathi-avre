from typing import List, Any, Optional
from sqlalchemy.orm import Session
from models import User, Request, RequestStatus, UrgencyLevel, EmergencyContact, PublicFacility
from repositories.emergency_repo import emergency_repo
from services.matching_service import MatchingService
from core.location import LocationUtils
from core.exceptions import ValidationException

class EmergencyService:
    @staticmethod
    def create_emergency_request(db: Session, user: User, data: Any) -> Request:
        # Emergency requests MUST have CRITICAL urgency
        data.urgency_level = UrgencyLevel.CRITICAL
        from services.request_service import RequestService
        request = RequestService.create_request(db, user, data)
        
        # Immediate match triggering for emergencies
        MatchingService.get_or_generate_matches(db, request)
        
        return request

    @staticmethod
    def get_dashboard_data(db: Session) -> dict:
        emergencies = emergency_repo.get_active_emergencies(db)
        return {
            "active_count": len(emergencies),
            "critical_items": [
                {
                    "id": e.id,
                    "resource": e.resource_name,
                    "city": e.city,
                    "urgency": e.urgency_level,
                    "requester_name": e.requester.name if e.requester else "Anonymous",
                    "requester_phone": e.requester.phone if e.requester else "N/A",
                    "blood_group": e.requester.blood_group if e.requester else None,
                    "created_at": e.created_at
                } for e in emergencies[:10]
            ]
        }

    @staticmethod
    def get_helplines(db: Session, city: Optional[str] = None) -> List[EmergencyContact]:
        query = db.query(EmergencyContact)
        if city:
            # Show national plus city-specific
            query = query.filter((EmergencyContact.city == "National") | (EmergencyContact.city.ilike(city)))
        else:
            query = query.filter(EmergencyContact.city == "National")
        
        # Order by pinned first, then category
        return query.order_by(EmergencyContact.is_pinned.desc(), EmergencyContact.category.asc()).all()

    @staticmethod
    def search_nearby_facilities(
        db: Session, 
        city: Optional[str] = None, 
        lat: Optional[float] = None, 
        lng: Optional[float] = None,
        facility_type: Optional[str] = None
    ) -> List[Any]:
        query = db.query(PublicFacility)
        
        if facility_type:
            query = query.filter(PublicFacility.facility_type.ilike(f"%{facility_type}%"))
            
        if city:
            query = query.filter(PublicFacility.city.ilike(city))
        
        facilities = query.all()
        
        if lat and lng:
            # Map distance and sort
            results = []
            for f in facilities:
                dist = LocationUtils.haversine_distance(lat, lng, f.lat, f.lng)
                # Set distance_km dynamically for the schema
                f.distance_km = round(dist, 1)
                results.append(f)
            
            # Sort by distance
            results.sort(key=lambda x: x.distance_km)
            return results
            
        return facilities
