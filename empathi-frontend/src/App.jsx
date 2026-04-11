import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAppContext } from './context/AppContext'
import { canAccessRoute } from './utils/rolePermissions'
import DonationPage from './pages/DonationPage'
import FeedPage from './pages/FeedPage'
import MatchingPage from './pages/MatchingPage'
import OnboardingPage from './pages/OnboardingPage'
import PostDetailPage from './pages/PostDetailPage'
import RecommendationsPage from './pages/RecommendationsPage'
import CampaignCreationPage from './pages/CampaignCreationPage'
import CampaignDetailPage from './pages/CampaignDetailPage'
import CampaignEditPage from './pages/CampaignEditPage'
import VerificationDashboard from './pages/VerificationDashboard'
import VerificationDetailPage from './pages/VerificationDetailPage'
import ResourceDeclarationPage from './pages/ResourceDeclarationPage'
import ResourceRequestPage from './pages/ResourceRequestPage'
import ResourceMatchingPage from './pages/ResourceMatchingPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminEmergencyPanel from './pages/AdminEmergencyPanel'
import CrisisDeclarationPage from './pages/CrisisDeclarationPage'
import EmergencyFundManagement from './pages/EmergencyFundManagement'
import VendorDashboard from './pages/VendorDashboard'
import UserProfilePage from './pages/UserProfilePage'
import NotificationCenter from './pages/NotificationCenter'
import AuditTrailPage from './pages/AuditTrailPage'

function ProtectedRoute({ children, requiredRole = null }) {
  const { onboardingDone, profile } = useAppContext()

  if (!onboardingDone) {
    return <Navigate to="/" replace />
  }

  if (requiredRole && !canAccessRoute(profile.userRole, window.location.pathname)) {
    return (
      <section>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <a href="/feed">Go back to feed</a>
      </section>
    )
  }

  return children
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />

        {/* Existing Routes */}
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/posts/:id"
          element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matching/:requestId?"
          element={
            <ProtectedRoute>
              <MatchingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donate/:postId"
          element={
            <ProtectedRoute>
              <DonationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <RecommendationsPage />
            </ProtectedRoute>
          }
        />

        {/* Campaign Routes */}
        <Route
          path="/campaign/create"
          element={
            <ProtectedRoute requiredRole="ngo">
              <CampaignCreationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaign/:id"
          element={
            <ProtectedRoute>
              <CampaignDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaign/:id/edit"
          element={
            <ProtectedRoute requiredRole="ngo">
              <CampaignEditPage />
            </ProtectedRoute>
          }
        />

        {/* Verification Routes */}
        <Route
          path="/verify"
          element={
            <ProtectedRoute requiredRole="verifier">
              <VerificationDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify/:postId"
          element={
            <ProtectedRoute requiredRole="verifier">
              <VerificationDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Resource Routes */}
        <Route
          path="/resource/declare"
          element={
            <ProtectedRoute>
              <ResourceDeclarationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resource/request"
          element={
            <ProtectedRoute>
              <ResourceRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resource/matches"
          element={
            <ProtectedRoute>
              <ResourceMatchingPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/emergency"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminEmergencyPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/crisis"
          element={
            <ProtectedRoute requiredRole="admin">
              <CrisisDeclarationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fund"
          element={
            <ProtectedRoute requiredRole="admin">
              <EmergencyFundManagement />
            </ProtectedRoute>
          }
        />

        {/* Vendor Routes */}
        <Route
          path="/vendor/dashboard"
          element={
            <ProtectedRoute requiredRole="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          }
        />

        {/* User Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-trail"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
