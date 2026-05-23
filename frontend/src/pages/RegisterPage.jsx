import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { apiService } from '../services/apiService';
import { useAppContext } from '../context/AppContext';

const RegisterPage = () => {
  const [role, setRole] = useState('USER');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const name = `${firstName} ${lastName}`;
    const orgName = formData.get('orgName') || 'Independent';
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      await apiService.register({
        name: name,
        email: email,
        password: password,
        role: role,
        organization_name: orgName,
        city: "Mumbai", // Default city
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
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-100/50 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-accent-100/30 rounded-full blur-[100px] opacity-30"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 md:p-12 shadow-premium rounded-[2.5rem] border-slate-200/50">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-black text-slate-900 mb-3 uppercase tracking-tight">Create your account</h1>
            <p className="text-slate-500 font-medium text-sm">Join EmpathI to support or launch life-changing humanitarian campaigns today.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button 
              type="button"
              onClick={() => setRole('USER')}
              className={cn(
                "p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                role === 'USER' 
                  ? "border-primary-500 bg-primary-50/50 text-primary-700 shadow-md" 
                  : "border-slate-100 hover:border-slate-200 text-slate-500 bg-white"
              )}
            >
              <User className={cn("w-6 h-6", role === 'USER' ? "text-primary-500" : "text-slate-400")} />
              <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">General Donor / User</span>
            </button>
            
            <button 
              type="button"
              onClick={() => setRole('CREATOR')}
              className={cn(
                "p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                role === 'CREATOR' 
                  ? "border-primary-500 bg-primary-50/50 text-primary-700 shadow-md" 
                  : "border-slate-100 hover:border-slate-200 text-slate-500 bg-white"
              )}
            >
              <Building2 className={cn("w-6 h-6", role === 'CREATOR' ? "text-primary-500" : "text-slate-400")} />
              <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Campaign Creator</span>
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="First Name" name="firstName" placeholder="John" autoComplete="given-name" required />
              <Input label="Last Name" name="lastName" placeholder="Doe" autoComplete="family-name" required />
            </div>
            
            <Input 
              label={
                role === 'USER' 
                  ? "Organization / Background" 
                  : "Organization / Creator Name"
              } 
              name="orgName"
              placeholder={
                role === 'USER' 
                  ? "Optional: NGO Name / Independent" 
                  : "Hope Foundation / Independent Creator"
              } 
              autoComplete="organization"
              required={role === 'CREATOR'} 
            />
            
            <Input 
              label="Email Address"
              name="email"
              placeholder="name@company.com"
              type="email"
              autoComplete="email"
              required
            />
            
            <Input 
              label="Password"
              name="password"
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              required
            />

            <div className="text-xs text-slate-500 px-1 font-medium">
              By creating an account, you agree to our <Link to="#" className="font-black text-primary-500 underline underline-offset-4">Terms of Service</Link> and <Link to="#" className="font-black text-primary-500 underline underline-offset-4">Privacy Policy</Link>.
            </div>

            <Button type="submit" size="lg" className="w-full h-14 uppercase font-black tracking-widest text-xs" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-slate-500">
            Already have an account? <Link to="/login" className="font-black text-primary-500 hover:text-primary-600">Login here</Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
