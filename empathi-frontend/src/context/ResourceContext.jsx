import { createContext, useContext, useMemo, useState } from 'react'

const ResourceContext = createContext(null)

function generateId() {
  return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getInitialResources() {
  try {
    const saved = localStorage.getItem('empathi_resources')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore malformed data
  }

  return {
    resourceDeclarations: [],
    resourceRequests: [],
    resourceMatches: [],
  }
}

export function ResourceProvider({ children }) {
  const [resources, setResources] = useState(getInitialResources)

  const updateResources = (patch) => {
    setResources((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('empathi_resources', JSON.stringify(next))
      return next
    })
  }

  const declareResourceAvailability = (userId, resourceData) => {
    const declaration = {
      id: generateId(),
      userId,
      resourceType: resourceData.resourceType,
      quantity: resourceData.quantity,
      unit: resourceData.unit || 'units',
      expiryDate: resourceData.expiryDate || null,
      availableFrom: resourceData.availableFrom || new Date().toISOString(),
      availableUntil: resourceData.availableUntil || null,
      location: resourceData.location,
      pickupOnly: resourceData.pickupOnly || false,
      verified: false,
      createdAt: new Date().toISOString(),
    }

    updateResources((prev) => ({
      ...prev,
      resourceDeclarations: [...prev.resourceDeclarations, declaration],
    }))

    return declaration
  }

  const createResourceRequest = (userId, resourceData) => {
    const request = {
      id: generateId(),
      userId,
      postId: resourceData.postId || null,
      resourceType: resourceData.resourceType,
      quantityNeeded: resourceData.quantityNeeded,
      urgencyLevel: resourceData.urgencyLevel || 'medium',
      location: resourceData.location,
      reason: resourceData.reason,
      status: 'pending_match',
      verifiedBy: null,
      neededBy: resourceData.neededBy,
      createdAt: new Date().toISOString(),
    }

    updateResources((prev) => ({
      ...prev,
      resourceRequests: [...prev.resourceRequests, request],
    }))

    return request
  }

  const matchResources = (resourceRequestId) => {
    const request = resources.resourceRequests.find((r) => r.id === resourceRequestId)
    if (!request) return []

    // Simple matching algorithm: find available resources of same type
    const compatibleDeclarations = resources.resourceDeclarations.filter((d) =>
      d.resourceType === request.resourceType &&
      d.quantity >= request.quantityNeeded &&
      !d.pickupOnly, // or logic for pickup handling
    )

    // Calculate match scores based on proximity, availability window, perishability
    const matches = compatibleDeclarations.map((decl) => ({
      id: generateId(),
      resourceAvailabilityId: decl.id,
      resourceRequestId,
      matchScore:
        (decl.quantity <= request.quantityNeeded * 1.5 ? 0.8 : 0.6) +
        (decl.verified ? 0.2 : 0),
      distanceKm: calculateDistance(request.location, decl.location),
      createdAt: new Date().toISOString(),
    }))

    // Sort by score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore)

    updateResources((prev) => ({
      ...prev,
      resourceMatches: [...prev.resourceMatches, ...matches],
    }))

    return matches
  }

  const completeResourceTransfer = (resourceMatchId, proof) => {
    // Mark match as completed and update request status
    updateResources((prev) => ({
      ...prev,
      resourceMatches: prev.resourceMatches.map((m) =>
        m.id === resourceMatchId ? { ...m, completed: true, proof } : m,
      ),
    }))
  }

  const value = useMemo(
    () => ({
      ...resources,
      declareResourceAvailability,
      createResourceRequest,
      matchResources,
      completeResourceTransfer,
    }),
    [resources, declareResourceAvailability, createResourceRequest, matchResources, completeResourceTransfer],
  )

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  )
}

export function useResourceContext() {
  const context = useContext(ResourceContext)
  if (!context) {
    throw new Error('useResourceContext must be used inside ResourceProvider')
  }
  return context
}

// Simple distance calculation (same as haversine in utils)
function calculateDistance(from, to) {
  if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
    return 0
  }

  const R = 6371 // Earth radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
