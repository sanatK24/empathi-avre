import React from 'react';
import UserProfile from './UserProfile';

// For now, admin profile uses the same profile component to ensure no backend mismatch.
// Routing and UI shell still remain admin-consistent via DashboardLayout.
const AdminProfile = () => {
  return <UserProfile />;
};

export default AdminProfile;

