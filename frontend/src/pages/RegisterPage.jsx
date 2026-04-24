import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, User, Building2, Store } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { apiService } from '../services/apiService';
import { useAppContext } from '../context/AppContext';
import { useGoogleLogin } from '@react-oauth/google';
import { saveAuthSession } from '../services/authService';

const GoogleSignUpButton = ({ onSocialLogin, loading }) => {
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
      Sign up with Google
    </Button>
  );
};

const RegisterPage = () => {
  const [role, setRole] = useState('requester');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAppContext();
  const navigate = useNavigate();
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const handleSocialLogin = async (token, provider) => {
    setLoading(true);
    try {
      // Pass the selected role for registration
      const tokenData = await apiService.socialLogin(token, provider, role.toUpperCase());
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
      console.error(`${provider} registration failed:`, error);
      alert(error.message || `${provider} registration failed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Extract values from form fields
    const firstName = e.target[0].value;
    const lastName = e.target[1].value;
    const name = `${firstName} ${lastName}`;
    const orgName = e.target[2].value; // Organization or 店名
    const email = e.target[3].value;
    const password = e.target[4].value;

    try {
      await apiService.register({
        name: name,
        email: email,
        password: password,
        role: role.toUpperCase(),
        organization_name: orgName,
        city: "Mumbai", // Default or could add field
        is_active: true
      });
      
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (error) {
      console.error('Registration failed:', error);
      alert(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6 md:p-12">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-100 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-accent-100 rounded-full blur-[100px] opacity-30"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 md:p-12 shadow-premium">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-black text-slate-900 mb-3 tracking-tight">Create your account</h1>
            <p className="text-slate-500 font-medium">Join EmpathI and optimize your resource network today.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button 
              onClick={() => setRole('requester')}
              className={cn(
                "p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                role === 'requester' 
                  ? "border-primary-500 bg-primary-50/50 text-primary-700" 
                  : "border-slate-100 hover:border-slate-200 text-slate-500"
              )}
            >
              <User className={cn("w-6 h-6", role === 'requester' ? "text-primary-500" : "text-slate-400")} />
              <span className="font-bold text-sm">User</span>
            </button>
            <button 
              onClick={() => setRole('vendor')}
              className={cn(
                "p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                role === 'vendor' 
                  ? "border-primary-500 bg-primary-50/50 text-primary-700" 
                  : "border-slate-100 hover:border-slate-200 text-slate-500"
              )}
            >
              <Store className={cn("w-6 h-6", role === 'vendor' ? "text-primary-500" : "text-slate-400")} />
              <span className="font-bold text-sm">Vendor</span>
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="First Name" placeholder="John" autoComplete="given-name" required />
              <Input label="Last Name" placeholder="Doe" autoComplete="family-name" required />
            </div>
            
            <Input 
              label={role === 'requester' ? "Basic Information" : "Vendor Name"} 
              placeholder={role === 'requester' ? "Full Name / Organization" : "Medical Supplies Inc."} 
              autoComplete="organization"
              required 
            />
            
            <Input 
              label="Email Address"
              placeholder="name@company.com"
              type="email"
              autoComplete="email"
              required
            />
            
            <Input 
              label="Password"
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              required
            />

            <div className="text-xs text-slate-500 px-1">
              By creating an account, you agree to our <Link to="#" className="font-bold text-primary-500 underline underline-offset-4">Terms of Service</Link> and <Link to="#" className="font-bold text-primary-500 underline underline-offset-4">Privacy Policy</Link>.
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Create Account
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
              <GoogleSignUpButton onSocialLogin={handleSocialLogin} loading={loading} />
            ) : (
              <Button
                variant="secondary"
                className="w-full h-12 shadow-none border-slate-200"
                disabled
              >
                Google Sign-Up unavailable
              </Button>
            )}
          </div>


          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account? <Link to="/login" className="font-bold text-primary-500 hover:text-primary-600">Login here</Link>
          </p>

        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
