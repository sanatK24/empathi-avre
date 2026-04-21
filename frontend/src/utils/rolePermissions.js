import { USER_ROLES } from './constants'

export const ROLE_PERMISSIONS = {
  [USER_ROLES.DONOR]: [
    'view_feed',
    'donate',
    'view_recommendations',
    'track_donations',
    'view_emergency_fund',
    'view_impact_updates',
    'manage_emergency_fund_settings',
  ],
  [USER_ROLES.NGO]: [
    'view_feed',
    'create_campaign',
    'manage_campaigns',
    'request_resources',
    'view_recommendations',
    'see_verified_badge',
  ],
  [USER_ROLES.VERIFIER]: [
    'view_feed',
    'verify_requests',
    'view_verification_tasks',
    'submit_proof',
    'view_recommendations',
    'access_verification_queue',
  ],
  [USER_ROLES.ADMIN]: [
    'view_feed',
    'declare_emergency',
    'unlock_fund',
    'allocate_funds',
    'manage_crises',
    'view_audit_log',
    'view_users',
    'manage_verifiers',
    'override_allocations',
    'access_crisis_signals',
  ],
  [USER_ROLES.VENDOR]: [
    'view_feed',
    'view_requests',
    'manage_availability',
    'fulfill_requests',
    'view_recommendations',
    'declare_resources',
  ],
}

export const ROLE_ROUTE_ACCESS = {
  '/feed': [
    USER_ROLES.DONOR,
    USER_ROLES.NGO,
    USER_ROLES.VERIFIER,
    USER_ROLES.ADMIN,
    USER_ROLES.VENDOR,
  ],
  '/campaign/create': [USER_ROLES.NGO],
  '/campaign/:id/edit': [USER_ROLES.NGO],
  '/verify': [USER_ROLES.VERIFIER],
  '/resource/declare': [USER_ROLES.VENDOR, USER_ROLES.NGO],
  '/resource/request': [USER_ROLES.NGO, USER_ROLES.VENDOR],
  '/admin': [USER_ROLES.ADMIN],
  '/admin/emergency': [USER_ROLES.ADMIN],
  '/admin/crisis': [USER_ROLES.ADMIN],
  '/admin/fund': [USER_ROLES.ADMIN],
  '/vendor/dashboard': [USER_ROLES.VENDOR],
  '/donor/fund-status': [USER_ROLES.DONOR],
  '/notifications': [
    USER_ROLES.DONOR,
    USER_ROLES.NGO,
    USER_ROLES.VERIFIER,
    USER_ROLES.ADMIN,
    USER_ROLES.VENDOR,
  ],
  '/profile': [
    USER_ROLES.DONOR,
    USER_ROLES.NGO,
    USER_ROLES.VERIFIER,
    USER_ROLES.ADMIN,
    USER_ROLES.VENDOR,
  ],
  '/audit-trail': [USER_ROLES.ADMIN],
}

/**
 * Check if a user role has permission for an action
 */
export function hasPermission(userRole, permission) {
  if (!userRole) return false
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.includes(permission)
}

/**
 * Check if a user role can access a specific route
 */
export function canAccessRoute(userRole, route) {
  if (!userRole) return false
  // Match exact route or parameterized route
  const allowedRoles = ROLE_ROUTE_ACCESS[route]
  if (allowedRoles) return allowedRoles.includes(userRole)

  // Check parameterized routes
  Object.keys(ROLE_ROUTE_ACCESS).forEach((key) => {
    if (key.includes(':')) {
      const pattern = new RegExp(`^${key.replace(/:[^\s/]+/g, '[^/]+')}$`)
      if (pattern.test(route)) {
        return ROLE_ROUTE_ACCESS[key].includes(userRole)
      }
    }
  })

  return false
}
