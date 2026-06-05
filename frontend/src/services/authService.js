const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const AUTH_STORAGE_KEY = 'empathi_auth_session'
const ROLE_MAP = { donor: 'user', creator: 'creator', admin: 'admin' }
const BACKEND_TO_FRONTEND_ROLE = { USER: 'donor', DONOR: 'donor', CREATOR: 'creator', ADMIN: 'admin' }
const mapFrontendRoleToBackendRole = r => ROLE_MAP[r] || 'user'
export const mapBackendRoleToFrontendRole = r => BACKEND_TO_FRONTEND_ROLE[r] || 'donor'
const apiRequest = async (m, p, b, t) => {
  const res = await fetch(`${API_BASE_URL}${p}`, {
    method: m,
    headers: { ...(b ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    ...(b ? { body: JSON.stringify(b) } : {})
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d?.detail || d?.message || `Request failed (${res.status})`)
  return d
}
export const saveAuthSession = s => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s))
export const getAuthSession = () => { try { const r = localStorage.getItem(AUTH_STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null } }
export const clearAuthSession = () => { localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem('campaignCreationData') }
export const restoreAuthSession = async () => {
  const s = getAuthSession()
  if (!s?.accessToken) return null
  try {
    const next = { accessToken: s.accessToken, user: await apiRequest('GET', '/auth/profile', null, s.accessToken) }
    saveAuthSession(next)
    return next
  } catch {
    clearAuthSession()
    return null
  }
}
export const logout = () => clearAuthSession()
const getMe = t => apiRequest('GET', '/auth/me', null, t)
export const login = async (email, password) => {
  const fd = new FormData(); fd.append('username', email); fd.append('password', password)
  const res = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', body: fd })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error || 'Login failed')
  const me = await getMe(d.access_token)
  if (me?.role) me.frontendRole = mapBackendRoleToFrontendRole(me.role)
  const s = { accessToken: d.access_token, user: me }
  saveAuthSession(s)
  return s
}
export const register = u => apiRequest('POST', '/auth/register', u)
export const updateMyProfile = async ({ 
  name, email, phone, bio, password, city, address, bloodGroup, preferredHospital, 
  emergencyContactName, emergencyContactPhone, accessibilityNeeds, personal_categories, 
  addressLine1, addressLine2, locality, stateProvince, postalCode, countryCode, lat, lng, accessToken 
}) => {
  if (!accessToken) throw new Error('Missing access token')
  return apiRequest('PUT', '/auth/profile', { 
    name, email, phone, bio, password, city, address, 
    blood_group: bloodGroup, preferred_hospital: preferredHospital, 
    emergency_contact_name: emergencyContactName, emergency_contact_phone: emergencyContactPhone, 
    accessibility_needs: accessibilityNeeds, personal_categories, 
    address_line_1: addressLine1, address_line_2: addressLine2, locality, 
    state_province: stateProvince, postal_code: postalCode, country_code: countryCode, lat, lng 
  }, accessToken)
}
