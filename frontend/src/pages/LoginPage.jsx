import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { apiService } from '../services/apiService';
import { useAppContext } from '../context/AppContext';
import { saveAuthSession } from '../services/authService';
const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAppContext();
  const navigate = useNavigate();
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    try {
      const tokenData = await apiService.login(email, password);
      const token = tokenData.access_token;
      const userProfile = await apiService.getMe(token);
      saveAuthSession({ accessToken: token, user: userProfile });
      updateProfile({
        fullName: userProfile.name,
        email: userProfile.email,
        backendRole: userProfile.role,
        userRole: userProfile.role?.toLowerCase() === 'user' ? 'donor' : userProfile.role?.toLowerCase(),
        isAuthenticated: true,
        accessToken: token,
        backendUserId: userProfile.id,
        isVerified: userProfile.is_active
      });
      const role = userProfile.role?.toLowerCase();
      if (role === 'donor' || role === 'user') {
        navigate('/user/dashboard');
      } else if (role === 'admin') {
        navigate('/admin/users');
      } else {
        navigate('/user/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-[calc(100vh-80px)] flex">
      {}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left px-4 md:px-0">
            <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 mb-3 tracking-tight uppercase">Welcome Back</h1>
            <p className="text-slate-500 font-medium text-sm md:text-base">Log in to manage your matches, donations and campaigns.</p>
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
          <p className="mt-10 text-center text-sm font-medium text-slate-500">
            Don't have an account? <Link to="/register" className="font-bold text-primary-500 hover:text-primary-600">Create an account</Link>
          </p>
        </motion.div>
      </div>
      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 bg-slate-50 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/50 rounded-full blur-[120px] opacity-40 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-100/30 rounded-full blur-[100px] opacity-30 -translate-x-1/2 translate-y-1/2"></div>
        <div className="h-full w-full flex flex-col items-center justify-center relative z-10">
          <div className="p-2 bg-white rounded-[2.5rem] shadow-premium max-w-sm border border-slate-200/50">
             <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-[2rem] p-8 text-slate-900 relative overflow-hidden border border-white shadow-inner">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-300/10 rounded-full blur-2xl"></div>
                <img src="/assets/logo.png" alt="EmpathI Logo" className="h-10 object-contain mb-10 relative z-10" />
                <div className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[8px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 uppercase tracking-wider">Active Recommendation</span>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">Medical Aid concentrators for Local Hospitals</h3>
                    </div>
                    <div className="pt-6 border-t border-slate-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matched Reasons</span>
                            <span className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shadow-sm">94% Match</span>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                { title: 'Matches your donation history', label: 'Interests' },
                                { title: 'Located within your city boundary', label: 'Proximity' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center space-x-3 bg-white/80 p-3 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm">
                                    <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-[10px] font-bold text-slate-800 tracking-tight truncate">{item.title}</p>
                                        <p className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
          </div>
          <div className="mt-12 text-center max-w-sm">
             <h2 className="text-2xl font-display font-black text-slate-900 mb-4 uppercase tracking-tight">Empowering Crisis Relief with Fair AI</h2>
             <p className="text-slate-500 font-semibold text-sm leading-relaxed">
                Our engine balances user contextual parameters with dynamic impression records,
                allocating critical help fairly where it makes the absolute most difference.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
