import { readExcelSheet } from './excelLoader'
import { haversineKm, toNumber } from '../utils/geo'

const DATA_FILES = {
  posts: '/data/posts.xlsx',
  donations: '/data/donations.xlsx',
  matchRequests: '/data/match_requests.xlsx',
  recommendations: '/data/recommendations.xlsx',
  users: '/data/users.xlsx',
  vendors: '/data/vendors.xlsx',
}

let memoryDb = null

function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  )
}

function safeJsonParse(input) {
  if (!input || typeof input !== 'string') return null

  try {
    return JSON.parse(input)
  } catch {
    // The dataset stores Python-like objects with single quotes and booleans.
    const normalized = input
      .replace(/None/g, 'null')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false')
      .replace(/'/g, '"')
    try {
      return JSON.parse(normalized)
    } catch {
      return null
    }
  }
}

async function loadDb() {
  if (memoryDb) return memoryDb

  const [posts, donations, matchRequests, recommendations, users, vendors] = await Promise.all([
    readExcelSheet(DATA_FILES.posts),
    readExcelSheet(DATA_FILES.donations),
    readExcelSheet(DATA_FILES.matchRequests),
    readExcelSheet(DATA_FILES.recommendations),
    readExcelSheet(DATA_FILES.users),
    readExcelSheet(DATA_FILES.vendors),
  ])

  memoryDb = {
    posts: posts.map(normalizeRow),
    donations: donations.map(normalizeRow),
    matchRequests: matchRequests.map(normalizeRow),
    recommendations: recommendations.map(normalizeRow),
    users: users.map(normalizeRow),
    vendors: vendors.map(normalizeRow),
  }

  return memoryDb
}

function postGoal(post) {
  const urgency = toNumber(post.urgency_score, 0)
  return Math.max(20000, 10000 + Math.round(urgency * 500))
}

function getRaisedByPost(donations) {
  const map = new Map()
  for (const d of donations) {
    if (String(d.status).toLowerCase() !== 'completed') continue
    const postId = Number(d.post_id)
    const amount = toNumber(d.amount, 0)
    map.set(postId, (map.get(postId) || 0) + amount)
  }
  return map
}

function withPostMetrics(post, raisedByPost, userLocation) {
  const id = Number(post.id)
  const raised = raisedByPost.get(id) || 0
  const goal = postGoal(post)
  const lat = toNumber(post.lat, NaN)
  const lng = toNumber(post.lng, NaN)
  const distanceKm = userLocation
    ? haversineKm(userLocation.lat, userLocation.lng, lat, lng)
    : Number.POSITIVE_INFINITY

  return {
    ...post,
    id,
    raised,
    goal,
    progressPct: Math.min(100, Math.round((raised / goal) * 100)),
    urgency: toNumber(post.urgency_score, 0),
    distanceKm,
  }
}

export async function getHomeFeed({ city, location }) {
  const db = await loadDb()
  const raisedByPost = getRaisedByPost(db.donations)

  const posts = db.posts
    .filter((post) => String(post.status).toLowerCase() === 'approved')
    .map((post) => withPostMetrics(post, raisedByPost, location))
    .sort((a, b) => {
      const cityA = String(a.city).toLowerCase() === String(city).toLowerCase() ? 1 : 0
      const cityB = String(b.city).toLowerCase() === String(city).toLowerCase() ? 1 : 0
      if (cityA !== cityB) return cityB - cityA
      if (b.urgency !== a.urgency) return b.urgency - a.urgency
      return a.distanceKm - b.distanceKm
    })

  return posts
}

export async function getPostDetails(postId, userLocation) {
  const db = await loadDb()
  const raisedByPost = getRaisedByPost(db.donations)
  const post = db.posts.find((item) => Number(item.id) === Number(postId))

  if (!post) return null

  const donations = db.donations
    .filter((item) => Number(item.post_id) === Number(postId))
    .sort((a, b) => Number(b.id) - Number(a.id))

  const request = db.matchRequests.find((item) => {
    const q = String(item.query || '').toLowerCase()
    return q.includes(String(post.city).toLowerCase()) || q.includes(String(post.locality).toLowerCase())
  })

  return {
    post: withPostMetrics(post, raisedByPost, userLocation),
    donations,
    request,
  }
}

export async function createDonation({ postId, userId, amount, method }) {
  const db = await loadDb()

  const nextId = db.donations.reduce((max, item) => Math.max(max, Number(item.id)), 0) + 1
  const payload = {
    id: nextId,
    user_id: userId,
    post_id: Number(postId),
    amount: Number(amount),
    status: 'completed',
    payment_method: method,
    created_at: new Date().toISOString(),
  }

  db.donations.push(payload)
  return payload
}

function getAvailability(vendor) {
  const capacity = toNumber(vendor.capacity, 0)
  const currentLoad = toNumber(vendor.current_load, 0)
  const free = Math.max(0, capacity - currentLoad)

  if (free <= 0) return 'Busy'
  if (free <= 2) return 'Limited'
  return 'Available'
}

export async function getMatchingOptions({ requestId, postId }) {
  const db = await loadDb()

  let request = null
  if (requestId) {
    request = db.matchRequests.find((item) => Number(item.id) === Number(requestId))
  }

  if (!request && postId) {
    const post = db.posts.find((item) => Number(item.id) === Number(postId))
    if (post) {
      request = db.matchRequests.find((item) => {
        const q = String(item.query || '').toLowerCase()
        return q.includes(String(post.city).toLowerCase()) || q.includes(String(post.locality).toLowerCase())
      })
    }
  }

  if (!request) {
    return { request: null, vendors: [] }
  }

  const matches = safeJsonParse(request.matched_vendors) || []

  const vendors = matches
    .map((match) => {
      const matchStatus =
        String(match?.match_status || match?.status || 'pending').toLowerCase()
      const isSelectable =
        typeof match?.is_selectable === 'boolean'
          ? match.is_selectable
          : ['pending', 'accepted_by_vendor'].includes(matchStatus)

      const vendorId = Number(match?.vendor?.id)
      const vendor = db.vendors.find((item) => Number(item.id) === vendorId)
      if (!vendor) return null

      return {
        ...vendor,
        id: vendorId,
        matchId: Number(match?.match_id || match?.id || 0),
        matchStatus,
        isSelectable,
        score: toNumber(match.score, 0),
        distanceKm: toNumber(match.distance_km, 999),
        etaMinutes: toNumber(match.eta_minutes, 999),
        availability: getAvailability(vendor),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)

  return { request, vendors }
}

export async function selectVendor(requestId, vendorId) {
  const db = await loadDb()
  const request = db.matchRequests.find((item) => Number(item.id) === Number(requestId))
  if (!request) throw new Error('Match request not found')

  request.selected_vendor_id = Number(vendorId)
  request.completion_status = 'completed'
  return request
}

export async function getRecommendationFeed({ userId, city, location }) {
  const db = await loadDb()

  const userRecs = db.recommendations
    .filter((item) => Number(item.user_id) === Number(userId))
    .sort((a, b) => toNumber(b.score, 0) - toNumber(a.score, 0))

  const vendorSuggestions = userRecs
    .map((rec, index) => {
      const vendor = db.vendors.find((item) => Number(item.id) === Number(rec.vendor_id))
      if (!vendor) return null

      const distanceKm = location
        ? haversineKm(location.lat, location.lng, toNumber(vendor.lat, NaN), toNumber(vendor.lng, NaN))
        : Number.POSITIVE_INFINITY

      let label = 'Based on your activity'
      if (toNumber(rec.score, 0) >= 0.9) label = 'Trending'
      if (distanceKm < 5) label = 'Nearby'

      return {
        ...vendor,
        recScore: toNumber(rec.score, 0),
        distanceKm,
        label,
        rank: index + 1,
      }
    })
    .filter(Boolean)
    .slice(0, 12)

  const raisedByPost = getRaisedByPost(db.donations)
  const postSuggestions = db.posts
    .filter((post) => String(post.status).toLowerCase() === 'approved')
    .map((post) => withPostMetrics(post, raisedByPost, location))
    .filter((post) => String(post.city).toLowerCase() === String(city).toLowerCase())
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 8)

  return {
    vendors: vendorSuggestions,
    posts: postSuggestions,
  }
}
