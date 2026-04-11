const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const AUTH_STORAGE_KEY = 'empathi_auth_session'

const ROLE_MAP = {
  donor: 'requester',
  ngo: 'requester',
  verifier: 'requester',
  vendor: 'vendor',
  admin: 'admin',
}

const BACKEND_TO_FRONTEND_ROLE = {
  requester: 'donor',
  vendor: 'vendor',
  admin: 'admin',
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

function saveAuthSession(session) {
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
    const me = await getMe(session.accessToken)
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

let googleScriptPromise

function ensureGoogleScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  if (googleScriptPromise) {
    return googleScriptPromise
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleGsi = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

async function getGoogleAuthorizationCode() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured')
  }

  await ensureGoogleScript()

  return new Promise((resolve, reject) => {
    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response) => {
        if (!response?.code) {
          reject(new Error('Google did not return an authorization code'))
          return
        }
        resolve(response.code)
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled or failed')),
    })

    codeClient.requestCode()
  })
}

async function registerWithGoogle(code) {
  return apiPost('/register', { code })
}

async function loginWithGoogle(code) {
  return apiPost('/login', { code })
}

async function addRole(token, role) {
  return apiPut('/add/role', { role }, token)
}

async function getMe(token) {
  return apiGet('/me', token)
}

export async function authenticateWithGoogleAndSyncRole(frontendRole) {
  const code = await getGoogleAuthorizationCode()

  try {
    await registerWithGoogle(code)
  } catch (error) {
    // If account exists, continue with login.
    if (!String(error.message || '').toLowerCase().includes('already registered')) {
      throw error
    }
  }

  const loginResult = await loginWithGoogle(code)

  let accessToken = loginResult.access_token
  let user = loginResult.user
  const backendRole = mapFrontendRoleToBackendRole(frontendRole)

  if (user?.role !== backendRole) {
    const roleResult = await addRole(accessToken, backendRole)
    accessToken = roleResult.access_token
    user = roleResult.user
  }

  const me = await getMe(accessToken)

  const session = {
    accessToken,
    user: me || user,
  }

  saveAuthSession(session)
  return session
}

export async function updateMyProfile({ name, email, accessToken }) {
  if (!accessToken) {
    throw new Error('Missing access token')
  }

  return apiPut('/me', { name, email }, accessToken)
}
