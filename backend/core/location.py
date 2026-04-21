import math
from typing import Optional, Tuple

class LocationUtils:
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great-circle distance between two points in kilometers."""
        if any(v is None for v in [lat1, lon1, lat2, lon2]):
            return 999.0 # Max distance if missing data
            
        R = 6371.0  # Earth's radius in kilometers
        
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        
        a = math.sin(dphi / 2)**2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
            
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    @staticmethod
    def is_in_radius(lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float) -> bool:
        return LocationUtils.haversine_distance(lat1, lon1, lat2, lon2) <= radius_km

    @staticmethod
    def same_city(city1: Optional[str], city2: Optional[str]) -> bool:
        if not city1 or not city2:
            return False
        return city1.strip().lower() == city2.strip().lower()

    @staticmethod
    def get_proximity_score(distance_km: float, decay: float = 0.2) -> float:
        """Returns a score between 0 and 1 using exponential decay."""
        return math.exp(-decay * distance_km)
