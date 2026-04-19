import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, User, Building2, Store } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { apiService } from '../services/apiService';

const RegisterPage = () => {
  const [role, setRole] = useState('requester');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        role: role,
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
            <p className="text-slate-500 font-medium">Join AVRE and optimize your resource network today.</p>
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
              <Building2 className={cn("w-6 h-6", role === 'requester' ? "text-primary-500" : "text-slate-400")} />
              <span className="font-bold text-sm">Requester</span>
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
              <Input label="First Name" placeholder="John" required />
              <Input label="Last Name" placeholder="Doe" required />
            </div>
            
            <Input 
              label={role === 'requester' ? "Organization Name" : "Vendor Name"} 
              placeholder={role === 'requester' ? "City Hospital" : "Medical Supplies Inc."} 
              required 
            />
            
            <Input 
              label="Email Address"
              placeholder="name@company.com"
              type="email"
              required
            />
            
            <Input 
              label="Password"
              placeholder="••••••••"
              type="password"
              required
            />

            <div className="text-xs text-slate-500 px-1">
              By creating an account, you agree to our <Link to="#" className="font-bold text-primary-500 underline underline-offset-4">Terms of Service</Link> and <Link to="#" className="font-bold text-primary-500 underline underline-offset-4">Privacy Policy</Link>.
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account? <Link to="/login" className="font-bold text-primary-500 hover:text-primary-600">Login here</Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
