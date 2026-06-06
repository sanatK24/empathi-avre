import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { apiService } from '../services/apiService';
import { useAppContext } from '../context/AppContext';
const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const name = `${firstName} ${lastName}`;
    const email = formData.get('email');
    const password = formData.get('password');
    try {
      await apiService.register({
        name: name,
        email: email,
        password: password,
        role: 'USER',
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
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="First Name" name="firstName" placeholder="John" autoComplete="given-name" required />
              <Input label="Last Name" name="lastName" placeholder="Doe" autoComplete="family-name" required />
            </div>

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
