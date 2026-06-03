import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout/DashboardLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';


// User Pages
import UserDashboard from './pages/UserDashboard';
import SharedProfileDashboard from './pages/SharedProfileDashboard';

// Campaign Pages
import CampaignsFeedPage from './pages/CampaignsFeedPage';
import CampaignCreationPage from './pages/CampaignCreationPage';
import CampaignEditPage from './pages/CampaignEditPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import CampaignAnalyticsDashboard from './pages/CampaignAnalyticsDashboard';
import UserProfile from './pages/UserProfile';

// Donation and Feed Pages
import DonationPage from './pages/DonationPage';

import AdminCampaigns from './pages/AdminCampaigns';
import AdminUsers from './pages/AdminUsers';


import { useAppContext } from './context/AppContext';
import { useLocation } from 'react-router-dom';


// Global scroll-to-top handler on route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { profile, authInitialized } = useAppContext();
  
  if (!authInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium animate-pulse tracking-tight">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!profile.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Cross-role protection
  // Active role in session (can be switched by user if dual-role)
  const activeRoleRaw = profile.userRole?.toLowerCase();
  const activeRole = activeRoleRaw === 'admin' ? 'admin' : 'user';
  const requiredRole = allowedRole?.toLowerCase() === 'admin' ? 'admin' : 'user';

  if (requiredRole && activeRole !== requiredRole) {
    const target = activeRole === 'admin' ? '/admin' : '/user';
    return <Navigate to={`${target}/dashboard`} replace />;
  }


  return children;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/campaigns" element={<CampaignsFeedPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Route>

        {/* User Routes */}
        <Route path="/user" element={<ProtectedRoute allowedRole="USER"><DashboardLayout role="user" /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="campaigns" element={<CampaignsFeedPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="campaigns/create" element={<CampaignCreationPage />} />
          <Route path="campaigns/edit/:id" element={<CampaignEditPage />} />
          <Route path="campaigns/my" element={<CampaignAnalyticsDashboard />} />
          <Route path="profiles/:user_id" element={<UserProfile />} />
          <Route path="donations" element={<DonationPage />} />
          <Route path="profile" element={<SharedProfileDashboard />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><DashboardLayout role="admin" /></ProtectedRoute>}>
          <Route index element={<Navigate to="users" />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
        </Route>


        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

