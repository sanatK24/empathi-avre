export function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const pLat1 = toNumber(lat1, NaN)
  const pLng1 = toNumber(lng1, NaN)
  const pLat2 = toNumber(lat2, NaN)
  const pLng2 = toNumber(lng2, NaN)

  if (![pLat1, pLng1, pLat2, pLng2].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY
  }

  const toRad = (deg) => (deg * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(pLat2 - pLat1)
  const dLng = toRad(pLng2 - pLng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pLat1)) *
      Math.cos(toRad(pLat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}
