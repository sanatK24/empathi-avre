import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { logout as logoutSession, mapBackendRoleToFrontendRole, restoreAuthSession } from '../services/authService'

const AppContext = createContext(null)

const ROLE_PERMISSIONS = {
  donor: ['view_feed', 'donate', 'view_recommendations', 'track_donations', 'view_emergency_fund'],
  ngo: ['view_feed', 'create_campaign', 'manage_campaigns', 'request_resources', 'view_recommendations'],
  verifier: ['view_feed', 'verify_requests', 'view_verification_tasks', 'submit_proof', 'view_recommendations'],
  admin: ['view_feed', 'declare_emergency', 'unlock_fund', 'allocate_funds', 'manage_crises', 'view_audit_log', 'view_users'],
  vendor: ['view_feed', 'view_requests', 'manage_availability', 'fulfill_requests', 'view_recommendations'],
}

function getInitialProfile() {
  try {
    const saved = localStorage.getItem('empathi_profile')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore malformed localStorage values.
  }

  return {
    userId: 1,
    city: '',
    location: null,
    userRole: '', // 'donor' | 'ngo' | 'verifier' | 'admin' | 'vendor'
    isVerified: false,
    email: '',
    phone: '',
    fullName: '',
    organizationName: '',
    bio: '',
    emergencyFundOptIn: true,
    emergencyFundPercentage: 5,
    accessToken: '',
    backendUserId: null,
    backendRole: '',
    isAuthenticated: false,
  }
}

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(getInitialProfile)
  const [authInitialized, setAuthInitialized] = useState(false)

  const updateProfile = (patch) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('empathi_profile', JSON.stringify(next))
      return next
    })
  }

  const setUserRole = (role) => {
    updateProfile({ userRole: role })
  }

  const setVerified = (isVerified, verificationData = {}) => {
    updateProfile({
      isVerified,
      ...verificationData,
    })
  }

  const logout = () => {
    logoutSession()
    const next = {
      userId: 1,
      city: '',
      location: null,
      userRole: '',
      isVerified: false,
      email: '',
      phone: '',
      fullName: '',
      organizationName: '',
      bio: '',
      emergencyFundOptIn: true,
      emergencyFundPercentage: 5,
      accessToken: '',
      backendUserId: null,
      backendRole: '',
      isAuthenticated: false,
    }
    setProfile(next)
    localStorage.setItem('empathi_profile', JSON.stringify(next))
  }

  useEffect(() => {
    let active = true

    const hydrateSession = async () => {
      const session = await restoreAuthSession()
      if (!active) return

      if (session?.user) {
        setProfile((prev) => {
          const next = {
            ...prev,
            accessToken: session.accessToken,
            backendUserId: session.user.id,
            backendRole: session.user.role,
            userRole: prev.userRole || mapBackendRoleToFrontendRole(session.user.role),
            fullName: session.user.name || prev.fullName,
            email: session.user.email || prev.email,
            isAuthenticated: true,
          }
          localStorage.setItem('empathi_profile', JSON.stringify(next))
          return next
        })
      }

      setAuthInitialized(true)
    }

    hydrateSession()

    return () => {
      active = false
    }
  }, [])

  const permissions = ROLE_PERMISSIONS[profile.userRole] || []

  const value = useMemo(
    () => ({
      profile,
      onboardingDone: Boolean(profile.city && profile.userRole),
      updateProfile,
      setUserRole,
      setVerified,
      logout,
      authInitialized,
      permissions,
      hasPermission: (permission) => permissions.includes(permission),
    }),
    [profile, permissions, setUserRole, setVerified, authInitialized],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }
  return context
}
