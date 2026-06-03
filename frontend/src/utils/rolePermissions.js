import { USER_ROLES } from './constants'

export const ROLE_PERMISSIONS = {
  [USER_ROLES.DONOR]: [
    'view_feed',
    'donate',
    'view_recommendations',
    'track_donations',
    'view_impact_updates',
  ],
  [USER_ROLES.CREATOR]: [
    'view_feed',
    'create_campaign',
    'manage_campaigns',
    'request_resources',
    'view_recommendations',
  ],
  [USER_ROLES.ADMIN]: [
    'override_allocations',
    'view_audit_log',
    'view_users',
  ],
}

export const ROLE_ROUTE_ACCESS = {
  '/feed': [
    USER_ROLES.DONOR,
    USER_ROLES.CREATOR,
    USER_ROLES.ADMIN,
  ],
  '/campaign/create': [USER_ROLES.CREATOR],
  '/campaign/:id/edit': [USER_ROLES.CREATOR],
  '/admin': [USER_ROLES.ADMIN],
  '/notifications': [
    USER_ROLES.DONOR,
    USER_ROLES.CREATOR,
    USER_ROLES.ADMIN,
  ],
  '/profile': [
    USER_ROLES.DONOR,
    USER_ROLES.CREATOR,
    USER_ROLES.ADMIN,
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
