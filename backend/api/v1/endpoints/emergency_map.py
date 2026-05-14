from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from services.overpass_service import OverpassService

router = APIRouter()

@router.get("/nearby")
def get_nearby_resources(
    lat: float,
    lon: float,
    keyword: str = Query("hospital", description="Search keyword like hospital, pharmacy"),
    radius: int = Query(5000, description="Search radius in meters")
):
    """
    Find nearby emergency resources using OpenStreetMap/Overpass API.
    """
    try:
        results = OverpassService.get_nearby_resources(lat, lon, keyword, radius)
        return {"resources": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
