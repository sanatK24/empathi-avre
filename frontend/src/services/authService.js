const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'


const AUTH_STORAGE_KEY = 'empathi_auth_session'

const ROLE_MAP = {
  donor: 'requester',
  ngo: 'requester',
  verifier: 'requester',
  vendor: 'vendor',
  admin: 'admin',
}

const BACKEND_TO_FRONTEND_ROLE = {
  REQUESTER: 'donor',
  VENDOR: 'vendor',
  ADMIN: 'admin',
}

function mapFrontendRoleToBackendRole(frontendRole) {
  return ROLE_MAP[frontendRole] || 'requester'
}

export function mapBackendRoleToFrontendRole(backendRole) {
  return BACKEND_TO_FRONTEND_ROLE[backendRole] || 'donor'
}

async function apiPost(path, body, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  return payload
}

async function apiPut(path, body, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  return payload
}

async function apiGet(path, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  return payload
}

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export async function restoreAuthSession() {
  const session = getAuthSession()
  if (!session?.accessToken) {
    return null
  }

  try {
    const me = await apiGet('/auth/profile', session.accessToken)
    const nextSession = {
      accessToken: session.accessToken,
      user: me,
    }
    saveAuthSession(nextSession)
    return nextSession
  } catch {
    clearAuthSession()
    return null
  }
}

export function logout() {
  clearAuthSession()
}



async function getMe(token) {
  return apiGet('/auth/me', token)
}

export async function login(email, password) {
  const formData = new FormData()
  formData.append('username', email)
  formData.append('password', password)

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'Login failed')
  }

  const me = await getMe(payload.access_token)
  
  // Normalize roles from backend to frontend expectations
  if (me && me.role) {
    me.frontendRole = mapBackendRoleToFrontendRole(me.role);
  }

  const session = {
    accessToken: payload.access_token,
    user: me,
  }

  saveAuthSession(session)
  return session
}

export async function register(userData) {
  return apiPost('/auth/register', userData)
}

export async function updateMyProfile({ 
  name, email, phone, organizationName, bio, password, 
  city, address, bloodGroup, preferredHospital, 
  emergencyContactName, emergencyContactPhone, accessibilityNeeds,
  personal_categories, 
  addressLine1, addressLine2, locality, stateProvince, postalCode, countryCode, lat, lng,
  accessToken 
}) {
  if (!accessToken) {
    throw new Error('Missing access token')
  }

  return apiPut('/auth/profile', { 
    name, 
    email, 
    phone, 
    organization_name: organizationName, 
    bio,
    password,
    city,
    address,
    blood_group: bloodGroup,
    preferred_hospital: preferredHospital,
    emergency_contact_name: emergencyContactName,
    emergency_contact_phone: emergencyContactPhone,
    accessibility_needs: accessibilityNeeds,
    personal_categories,
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    locality,
    state_province: stateProvince,
    postal_code: postalCode,
    country_code: countryCode,
    lat,
    lng
  }, accessToken)
}
