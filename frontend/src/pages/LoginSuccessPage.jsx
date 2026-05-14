import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { saveAuthSession } from '../services/authService';

const LoginSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateProfile } = useAppContext();

  useEffect(() => {
    const handleLoginSuccess = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        console.error('No token found in URL');
        navigate('/login?error=no_token');
        return;
      }

      try {
        // 1. Fetch user profile with the token
        const userProfile = await apiService.getMe(token);

        // 2. Save session for persistence
        saveAuthSession({ accessToken: token, user: userProfile });

        // 3. Update global context
        updateProfile({
          fullName: userProfile.name,
          email: userProfile.email,
          backendRole: userProfile.role,
          userRole: userProfile.role?.toLowerCase() === 'requester' ? 'donor' : userProfile.role?.toLowerCase(),
          isAuthenticated: true,
          accessToken: token,
          backendUserId: userProfile.id,
          avatarUrl: userProfile.avatar_url,
          isVerified: userProfile.is_active
        });

        // 4. Redirect based on role
        const role = userProfile.role?.toLowerCase();
        if (role === 'vendor') {
          navigate('/vendor/dashboard');
        } else if (role === 'requester' || role === 'donor' || role === 'user') {
          navigate('/user/dashboard');
        } else if (role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/user/dashboard');
        }
      } catch (error) {
        console.error('Failed to initialize session from token:', error);
        navigate('/login?error=session_initialization_failed');
      }
    };

    handleLoginSuccess();
  }, [searchParams, navigate, updateProfile]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse tracking-tight uppercase">Completing Secure Login...</p>
      </div>
    </div>
  );
};

export default LoginSuccessPage;
