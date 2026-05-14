import requests
from typing import List, Dict, Any
import math

class OverpassService:
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    
    KEYWORD_MAPPING = {
        "hospital": ['node["amenity"="hospital"]', 'way["amenity"="hospital"]'],
        "pharmacy": ['node["amenity"="pharmacy"]', 'way["amenity"="pharmacy"]'],
        "blood bank": ['node["healthcare"="blood_bank"]', 'way["healthcare"="blood_bank"]', 'node["amenity"="blood_bank"]'],
        "ambulance": ['node["emergency"="ambulance_station"]', 'way["emergency"="ambulance_station"]'],
        "fire station": ['node["amenity"="fire_station"]', 'way["amenity"="fire_station"]'],
        "police": ['node["amenity"="police"]', 'way["amenity"="police"]'],
        "shelter": ['node["amenity"="shelter"]', 'way["amenity"="shelter"]', 'node["social_facility"="shelter"]'],
        "clinic": ['node["amenity"="clinic"]', 'way["amenity"="clinic"]'],
        "veterinary": ['node["amenity"="veterinary"]', 'way["amenity"="veterinary"]'],
        "food": ['node["amenity"="restaurant"]', 'node["amenity"="fast_food"]', 'node["amenity"="food_court"]'],
        "water": ['node["amenity"="drinking_water"]'],
        "toilets": ['node["amenity"="toilets"]'],
        "charging_station": ['node["amenity"="charging_station"]'],
        "ngo": ['node["amenity"="social_facility"]', 'way["amenity"="social_facility"]']
    }

    @staticmethod
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371 # km
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lon2 - lon1)
        a = math.sin(dLat/2) * math.sin(dLat/2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dLon/2) * math.sin(dLon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    @staticmethod
    def get_nearby_resources(lat: float, lon: float, keyword: str = "hospital", radius: int = 5000) -> List[Dict[str, Any]]:
        # Normalize keyword
        kw = keyword.lower().strip()
        tags = OverpassService.KEYWORD_MAPPING.get(kw, OverpassService.KEYWORD_MAPPING["hospital"])
        
        # Build overpass query
        query_lines = []
        for tag in tags:
            query_lines.append(f"{tag}(around:{radius},{lat},{lon});")
            
        overpass_query = f"""
        [out:json];
        (
          {" ".join(query_lines)}
        );
        out center;
        """
        
        try:
            print(f"[Overpass] Querying {kw} at ({lat}, {lon}) within {radius}m")
            headers = {
                'User-Agent': 'EmpathI Emergency App (https://empathi.app)',
                'Accept': 'application/json'
            }
            response = requests.post(OverpassService.OVERPASS_URL, data={'data': overpass_query}, headers=headers, timeout=15)
            response.raise_for_status()
            data = response.json()

            elements = data.get('elements', [])
            print(f"[Overpass] Found {len(elements)} raw elements for {kw}")

            results = []
            for element in elements:
                # node vs way centers
                el_lat = element.get('lat') or element.get('center', {}).get('lat')
                el_lon = element.get('lon') or element.get('center', {}).get('lon')

                if not el_lat or not el_lon:
                    print(f"[Overpass] Skipping element {element.get('id')} - no coordinates")
                    continue

                tags = element.get('tags', {})
                name = tags.get('name', 'Unknown Resource')

                # Exclude truly unknown ones if name is generic and we want quality
                if name == 'Unknown Resource':
                    name = f"Nearby {kw.title()}"

                distance = OverpassService.haversine(lat, lon, el_lat, el_lon)

                # address compilation
                addr_parts = []
                if tags.get('addr:street'):
                    addr_parts.append(tags.get('addr:street'))
                if tags.get('addr:city'):
                    addr_parts.append(tags.get('addr:city'))

                results.append({
                    "id": element['id'],
                    "name": name,
                    "type": kw,
                    "lat": el_lat,
                    "lon": el_lon,
                    "distance": round(distance, 2),
                    "address": ", ".join(addr_parts) if addr_parts else "Location mapped",
                    "phone": tags.get('phone') or tags.get('contact:phone') or ""
                })

            # sort by distance
            results.sort(key=lambda x: x['distance'])
            print(f"[Overpass] Returning {len(results)} results for {kw}")
            return results[:20] # Return top 20
        except Exception as e:
            print(f"[Overpass] Error querying {kw}: {e}")
            import traceback
            traceback.print_exc()
            return []
