import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { apiService } from '../services/apiService';

import { useAppContext } from '../context/AppContext';
import { useGoogleLogin } from '@react-oauth/google';
import { saveAuthSession } from '../services/authService';

const GoogleSignInButton = ({ onSocialLogin, loading }) => {
  const loginWithGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => onSocialLogin(codeResponse.access_token, 'google'),
    onError: (error) => console.log('Google Login Failed:', error)
  });

  return (
    <Button
      variant="secondary"
      className="w-full h-12 shadow-none border-slate-200"
      onClick={() => loginWithGoogle()}
      disabled={loading}
    >
      <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 mr-2" />
      Sign in with Google
    </Button>
  );
};

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAppContext();
  const navigate = useNavigate();
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      // 1. Authenticate and get token
      const tokenData = await apiService.login(email, password);
      const token = tokenData.access_token;

      // 2. Fetch user profile with the token
      const userProfile = await apiService.getMe(token);

      // 3. Save session for persistence
      saveAuthSession({ accessToken: token, user: userProfile });

      // 4. Update global context
      updateProfile({
        fullName: userProfile.name,
        email: userProfile.email,
        backendRole: userProfile.role, // Essential for ProtectedRoute
        userRole: userProfile.role?.toLowerCase() === 'requester' ? 'donor' : userProfile.role?.toLowerCase(),
        isAuthenticated: true,
        accessToken: token,
        backendUserId: userProfile.id,
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
        // Fallback to user dashboard if role is unknown but authenticated
        navigate('/user/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };


  const handleSocialLogin = async (token, provider) => {
    setLoading(true);
    try {
      const tokenData = await apiService.socialLogin(token, provider);
      const accessToken = tokenData.access_token;
      const userProfile = await apiService.getMe(accessToken);

      // Save session for persistence
      saveAuthSession({ accessToken: accessToken, user: userProfile });

      updateProfile({
        fullName: userProfile.name,
        email: userProfile.email,
        backendRole: userProfile.role,
        userRole: userProfile.role?.toLowerCase() === 'requester' ? 'donor' : userProfile.role?.toLowerCase(),
        isAuthenticated: true,
        accessToken: accessToken,
        backendUserId: userProfile.id,
        avatarUrl: userProfile.avatar_url,
        isVerified: userProfile.is_active
      });


      // 5. Redirect based on role
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
      console.error(`${provider} login failed:`, error);
      alert(error.message || `${provider} login failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-display font-black text-slate-900 mb-3 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 font-medium">Log in to manage your matches, donations and campaigns.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="Email Address"
              name="email"
              placeholder="name@company.com"
              type="email"
              autoComplete="email"
              required
            />
            
            <div className="relative">
              <Input 
                label="Password"
                name="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
              />

              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/20 transition-all" />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <Link to="#" className="text-sm font-bold text-primary-500 hover:text-primary-600 transition-colors">Forgot password?</Link>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Log In
            </Button>
          </form>

          <div className="mt-8 relative text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <span className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
          </div>

          <div className="mt-8">
            {hasGoogleClientId ? (
              <GoogleSignInButton onSocialLogin={handleSocialLogin} loading={loading} />
            ) : (
              <Button
                variant="secondary"
                className="w-full h-12 shadow-none border-slate-200"
                disabled
              >
                Google Sign-In unavailable
              </Button>
            )}
          </div>



          <p className="mt-10 text-center text-sm font-medium text-slate-500">
            Don't have an account? <Link to="/register" className="font-bold text-primary-500 hover:text-primary-600">Create an account</Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 bg-slate-50 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100 rounded-full blur-[120px] opacity-40 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-100 rounded-full blur-[100px] opacity-30 -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="h-full w-full flex flex-col items-center justify-center relative z-10">
          <div className="p-2 bg-white rounded-3xl shadow-premium max-w-sm">
             <div className="bg-slate-900 rounded-[1.5rem] p-8 text-white">
                <div className="flex items-center space-x-3 mb-10">
                    <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                    </div>
                    <span className="font-display font-bold text-xl">EmpathI</span>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="h-2 w-20 bg-primary-500/30 rounded"></div>
                        <div className="h-4 w-full bg-white/10 rounded"></div>
                        <div className="h-4 w-2/3 bg-white/10 rounded"></div>
                    </div>
                    <div className="pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-400">Top Matches</span>
                            <span className="text-xs text-primary-400">View all</span>
                        </div>
                        <div className="space-y-3">
                            {[1, 2].map(i => (
                                <div key={i} className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="w-8 h-8 bg-white/10 rounded-lg"></div>
                                    <div className="flex-grow space-y-1">
                                        <div className="h-2 w-24 bg-white/20 rounded"></div>
                                        <div className="h-1 w-16 bg-white/5 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
          </div>
          
          <div className="mt-12 text-center max-w-sm">
             <h2 className="text-2xl font-display font-bold text-slate-900 mb-4">Mastering Predictive Resource Intelligence</h2>
             <p className="text-slate-500 font-medium">
                Our engine combines historical data with real-time variables to provide 
                the most accurate resource coordination in the industry.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
