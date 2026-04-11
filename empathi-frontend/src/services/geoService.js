// Geo Service for location-based operations
// Uses Google Maps API for geocoding and distance calculations

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

if (!GOOGLE_MAPS_API_KEY) {
  console.warn(
    'VITE_GOOGLE_MAPS_API_KEY not set. Geocoding will use mock responses.',
  )
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function getLocationDistance(from, to) {
  if (
    !from ||
    !to ||
    !from.lat ||
    !from.lng ||
    !to.lat ||
    !to.lng
  ) {
    return 0
  }

  const R = 6371 // Earth's radius in km
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Find nearest locations from a reference point
 */
export function findNearest(referenceLocation, locations, limit = 5) {
  if (!referenceLocation || !locations) return []

  const withDistance = locations.map((loc) => ({
    ...loc,
    distance: getLocationDistance(referenceLocation, {
      lat: loc.lat || loc.location?.lat,
      lng: loc.lng || loc.location?.lng,
    }),
  }))

  return withDistance.sort((a, b) => a.distance - b.distance).slice(0, limit)
}

/**
 * Check if location is within a geographic radius
 */
export function isWithinRadius(targetLocation, centerLocation, radiusKm) {
  const distance = getLocationDistance(centerLocation, targetLocation)
  return distance <= radiusKm
}

// Helper function to convert degrees to radians
function toRad(degrees) {
  return (degrees * Math.PI) / 180
}

// Mock functions for development/testing
function mockReverseGeocode(lat, lng) {
  const cityNames = [
    'Mumbai',
    'Delhi',
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
  ]
  const randomCity = cityNames[Math.floor(Math.random() * cityNames.length)]

  return {
    address: `Mock Address, ${randomCity}, India`,
    locality: 'Mock Locality',
    city: randomCity,
    state: 'Maharashtra',
    country: 'India',
    zipCode: '400000',
  }
}

function mockGeocodeAddress(address) {
  // Simple mock: return center of Mumbai approximately
  return {
    lat: 19.0760 + Math.random() * 0.1,
    lng: 72.8777 + Math.random() * 0.1,
  }
}
