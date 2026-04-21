import { Link, NavLink } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useNotificationContext } from '../context/NotificationContext'
import { USER_ROLES } from '../utils/constants'

function Layout({ children }) {
  const { profile, onboardingDone, logout } = useAppContext()
  const { unreadCount } = useNotificationContext()

  const renderRoleNavigation = () => {
    if (!onboardingDone) return null

    const { userRole } = profile

    return (
      <>
        {[USER_ROLES.DONOR, USER_ROLES.NGO, USER_ROLES.VENDOR, USER_ROLES.VERIFIER, USER_ROLES.ADMIN].includes(
          userRole,
        ) && (
          <>
            <NavLink to="/feed">Feed</NavLink>
            <NavLink to="/recommendations">Recommendations</NavLink>
          </>
        )}

        {userRole === USER_ROLES.NGO && (
          <>
            <NavLink to="/campaign/create">Create Campaign</NavLink>
            <NavLink to="/resource/request">Request Resources</NavLink>
          </>
        )}

        {userRole === USER_ROLES.VERIFIER && (
          <>
            <NavLink to="/verify">Verify Requests</NavLink>
          </>
        )}

        {userRole === USER_ROLES.VENDOR && (
          <>
            <NavLink to="/vendor/dashboard">Dashboard</NavLink>
            <NavLink to="/resource/declare">Declare Resources</NavLink>
          </>
        )}

        {userRole === USER_ROLES.ADMIN && (
          <>
            <NavLink to="/admin">Dashboard</NavLink>
            <NavLink to="/admin/emergency">Emergency</NavLink>
            <NavLink to="/admin/fund">Emergency Fund</NavLink>
            <NavLink to="/audit-trail">Audit Trail</NavLink>
          </>
        )}

        <NavLink to="/notifications">
          Notifications
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </NavLink>
        <NavLink to="/profile">Profile</NavLink>
      </>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/feed" className="brand">
          EmpathI
        </Link>
        <nav>{renderRoleNavigation()}</nav>
        <div className="header-right">
          {onboardingDone && profile.userRole && (
            <span className="role-badge">{profile.userRole}</span>
          )}
          <div className="city-pill">{profile.city || 'Select city'}</div>
          {onboardingDone && (
            <Link to="/" className="button ghost" onClick={logout}>
              Logout
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default Layout
