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
import CreateRequest from './pages/CreateRequest';
import MatchResults from './pages/MatchResults';
import RequestHistory from './pages/RequestHistory';
import ResourceHubPage from './pages/ResourceHubPage';

// Campaign Pages
import CampaignsFeedPage from './pages/CampaignsFeedPage';
import CampaignCreationPage from './pages/CampaignCreationPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import CampaignAnalyticsDashboard from './pages/CampaignAnalyticsDashboard';

// Donation and Emergency Pages
import DonationPage from './pages/DonationPage';
import RecommendationsPage from './pages/RecommendationsPage';
import EmergencyHub from './pages/EmergencyHub'; // Assuming I will create/update this

// Vendor Pages
import InventoryManagement from './pages/InventoryManagement';
import IncomingRequests from './pages/IncomingRequests';
import VendorDashboard from './pages/VendorDashboard';
import VendorAnalytics from './pages/VendorAnalytics';

import AdminDashboard from './pages/AdminDashboard';
import AdminVendorManagement from './pages/AdminVendorManagement';
import AdminCampaigns from './pages/AdminCampaigns';
import SharedProfileDashboard from './pages/SharedProfileDashboard';

import { useAppContext } from './context/AppContext';

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
  const activeRole = profile.userRole?.toLowerCase();
  const requiredRole = allowedRole?.toLowerCase() === 'requester' ? 'donor' : allowedRole?.toLowerCase();

  if (requiredRole && activeRole !== requiredRole) {
    const target = activeRole === 'donor' ? '/user' : `/${activeRole || 'user'}`;
    return <Navigate to={`${target}/dashboard`} replace />;
  }


  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/campaigns" element={<CampaignsFeedPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Route>

        {/* User Routes (Formerly Requester) */}
        <Route path="/user" element={<ProtectedRoute allowedRole="REQUESTER"><DashboardLayout role="requester" /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="create" element={<CreateRequest />} />
          <Route path="resources" element={<ResourceHubPage />} />
          <Route path="results" element={<MatchResults />} />
          <Route path="history" element={<RequestHistory />} />
          <Route path="matches" element={<MatchResults />} />
          <Route path="campaigns" element={<CampaignsFeedPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="campaigns/create" element={<CampaignCreationPage />} />
          <Route path="campaigns/my" element={<CampaignAnalyticsDashboard />} />
          <Route path="donations" element={<DonationPage />} />
          <Route path="emergency" element={<EmergencyHub />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="profile" element={<SharedProfileDashboard />} />
          <Route path="settings" element={<div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Settings</h2>
            <p className="text-slate-500 font-medium italic">Security and notification preferences coming soon.</p>
          </div>} />
        </Route>

        {/* Vendor Routes */}
        <Route path="/vendor" element={<ProtectedRoute allowedRole="VENDOR"><DashboardLayout role="vendor" /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="orders" element={<IncomingRequests />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="profile" element={<SharedProfileDashboard />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><DashboardLayout role="admin" /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">User Management</h2>
            <p className="text-slate-500 font-medium italic">Security module active. Direct user access restricted to root admin.</p>
          </div>} />
          <Route path="vendors" element={<AdminVendorManagement />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="stats" element={<div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">System Statistics</h2>
            <p className="text-slate-500 font-medium italic">Server metrics synchronized with cloud instances.</p>
          </div>} />
          <Route path="profile" element={<SharedProfileDashboard />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

