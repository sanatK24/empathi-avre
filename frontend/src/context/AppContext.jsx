import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { logout as logoutSession, mapBackendRoleToFrontendRole, restoreAuthSession } from '../services/authService'

const AppContext = createContext(null)

const ROLE_PERMISSIONS = {
  donor: ['view_feed', 'donate', 'view_recommendations', 'track_donations'],
  ngo: ['view_feed', 'create_campaign', 'manage_campaigns', 'request_resources', 'view_recommendations'],
  verifier: ['view_feed', 'verify_requests', 'view_verification_tasks', 'submit_proof', 'view_recommendations'],
  admin: ['view_feed', 'declare_emergency', 'manage_crises', 'view_audit_log', 'view_users'],
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
    emergency_contacts: [],
    personal_categories: '',
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
    try {
      console.log('Logging out...');
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
        emergency_contacts: [],
        personal_categories: '',
        accessToken: '',
        backendUserId: null,
        backendRole: '',
        isAuthenticated: false,
      }
      setProfile(next)
      localStorage.setItem('empathi_profile', JSON.stringify(next))
      console.log('Profile cleared, redirecting...');
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback redirect
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    let active = true

    const hydrateSession = async () => {
      const session = await restoreAuthSession()
      if (!active) return

      if (session?.user) {
        const next = {
          accessToken: session.accessToken,
          backendUserId: session.user.id,
          backendRole: session.user.role,
          userRole: mapBackendRoleToFrontendRole(session.user.role),
          fullName: session.user.name || '',
          email: session.user.email || '',
          phone: session.user.phone || '',
          city: session.user.city || '',
          emergency_contacts: session.user.emergency_contacts || [],
          personal_categories: session.user.personal_categories || '',
          bloodGroup: session.user.blood_group,
          preferredHospital: session.user.preferred_hospital,
          canSwitchRole: session.user.can_switch_role,
          isVendor: session.user.is_vendor,
          isAuthenticated: true,
        }
        setProfile(next)
        localStorage.setItem('empathi_profile', JSON.stringify(next))

        // Auto-redirect if on login or landing page
        const path = window.location.pathname
        if (path === '/login' || path === '/register' || path === '/') {
          const dashboardPath = `/${next.userRole === 'donor' ? 'user' : (next.userRole === 'admin' ? 'admin' : (next.userRole === 'vendor' ? 'vendor' : 'user'))}/dashboard`
          window.location.href = dashboardPath
        }
      } else {
        // Clear if invalid session found
        localStorage.removeItem('empathi_profile')
      }

      setAuthInitialized(true)
    }

    hydrateSession()

    return () => {
      active = false
    }
  }, [])

  const permissions = ROLE_PERMISSIONS[profile.userRole] || []

  const switchRole = (newRole) => {
    updateProfile({ userRole: newRole })
    // Refresh to update layouts if necessary, or just rely on state
    const dashboardPath = `/${newRole === 'donor' ? 'user' : (newRole === 'admin' ? 'admin' : (newRole === 'vendor' ? 'vendor' : 'user'))}/dashboard`
    window.location.href = dashboardPath
  }

  const value = useMemo(
    () => ({
      profile,
      onboardingDone: Boolean(profile.city && profile.userRole),
      updateProfile,
      setUserRole,
      switchRole,
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
