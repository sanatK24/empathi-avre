import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Activity } from 'lucide-react';

const PublicLayout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-display font-bold text-slate-900 tracking-tight">EmpathI</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="/#features" className="hover:text-primary-500 transition-colors">Features</a>
            <a href="/#how-it-works" className="hover:text-primary-500 transition-colors">How it Works</a>
            
            {!isLoginPage && (
              <Link to="/login" className="hover:text-primary-500 transition-colors">Login</Link>
            )}
            
            {(!isRegisterPage && !isLoginPage) && (
              <Button size="md" onClick={() => window.location.href='/register'}>Get Started</Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 text-center md:text-left">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-primary-500" />
              <span className="text-xl font-display font-bold text-slate-900">EmpathI</span>
            </div>
            <div className="flex space-x-8 text-sm font-medium text-slate-500">
              <a href="#" className="hover:text-primary-500">Privacy Policy</a>
              <a href="#" className="hover:text-primary-500">Terms of Service</a>
              <a href="#" className="hover:text-primary-500">Contact Us</a>
            </div>
            <p className="text-sm text-slate-400">© 2026 EmpathI Intelligence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
