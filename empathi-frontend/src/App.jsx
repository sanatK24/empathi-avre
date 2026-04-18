import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout/DashboardLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Requester Pages
import RequesterDashboard from './pages/RequesterDashboard';
import CreateRequest from './pages/CreateRequest';
import MatchResults from './pages/MatchResults';
import RequestHistory from './pages/RequestHistory';

// Campaign Pages
import CampaignsFeedPage from './pages/CampaignsFeedPage';
import CampaignCreationPage from './pages/CampaignCreationPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import CampaignAnalyticsDashboard from './pages/CampaignAnalyticsDashboard';

// Vendor Pages
import InventoryManagement from './pages/InventoryManagement';
import IncomingRequests from './pages/IncomingRequests';
import VendorDashboard from './pages/VendorDashboard';
import VendorAnalytics from './pages/VendorAnalytics';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import UserProfilePage from './pages/UserProfilePage';

import { AppProvider } from './context/AppContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { ResourceProvider } from './context/ResourceContext';

function App() {
  return (
    <AppProvider>
      <EmergencyProvider>
        <NotificationProvider>
          <ResourceProvider>
            <Router>
              <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Requester Routes */}
        <Route path="/requester" element={<DashboardLayout role="requester" />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<RequesterDashboard />} />
          <Route path="create" element={<CreateRequest />} />
          <Route path="results" element={<MatchResults />} />
          <Route path="history" element={<RequestHistory />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>

        {/* Campaign Routes */}
        <Route path="/campaigns" element={<DashboardLayout role="requester" />}>
          <Route index element={<CampaignsFeedPage />} />
          <Route path="create" element={<CampaignCreationPage />} />
          <Route path=":id" element={<CampaignDetailPage />} />
          <Route path="analytics/dashboard" element={<CampaignAnalyticsDashboard />} />
        </Route>


        {/* Vendor Routes */}
        <Route path="/vendor" element={<DashboardLayout role="vendor" />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="orders" element={<IncomingRequests />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">User Management</h2>
            <p className="text-slate-500 font-medium italic">Security module loading...</p>
          </div>} />
          <Route path="vendors" element={<div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Vendor Verification</h2>
            <p className="text-slate-500 font-medium italic">Compliance module loading...</p>
          </div>} />
          <Route path="stats" element={<div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-soft">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">System Statistics</h2>
            <p className="text-slate-500 font-medium italic">Server metrics loading...</p>
          </div>} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
          </ResourceProvider>
        </NotificationProvider>
      </EmergencyProvider>
    </AppProvider>
  );
}

export default App;
