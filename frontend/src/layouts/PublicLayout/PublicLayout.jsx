import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Menu, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppContext } from '../../context/AppContext';

const PublicLayout = () => {
  const { profile } = useAppContext();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <img src="/assets/logo.png" alt="EmpathI Logo" className="h-14 object-contain group-hover:scale-105 transition-transform" />
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="/#features" className="hover:text-primary-500 transition-colors">Features</a>
            <a href="/#how-it-works" className="hover:text-primary-500 transition-colors">How it Works</a>
            <Link to="/campaigns" className={cn("hover:text-primary-500 transition-colors", location.pathname === '/campaigns' && "text-primary-600")}>Campaigns</Link>
            
            {profile.isAuthenticated ? (
              <div className="flex items-center space-x-6 pl-4 border-l border-slate-100">
                <Link to={profile.userRole === 'admin' ? '/admin/users' : '/user/dashboard'}>
                  <Button size="sm" variant="outline" className="border-primary-100 text-primary-600 bg-primary-50 hover:bg-primary-100">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link to={profile.userRole === 'admin' ? '/admin/users' : '/user/profile'} className="flex items-center space-x-3 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                </Link>
              </div>

            ) : (
              <>
                {!isLoginPage && (
                  <Link to="/login" className="hover:text-primary-500 transition-colors">Login</Link>
                )}
                {(!isRegisterPage && !isLoginPage) && (
                  <Button size="md" onClick={() => window.location.href='/register'}>Get Started</Button>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-lg z-40">
            <div className="px-6 py-4 flex flex-col space-y-4">
              <a href="/#features" className="text-slate-600 font-semibold hover:text-primary-500" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
              <a href="/#how-it-works" className="text-slate-600 font-semibold hover:text-primary-500" onClick={() => setIsMobileMenuOpen(false)}>How it Works</a>
              <Link to="/campaigns" className={cn("text-slate-600 font-semibold hover:text-primary-500", location.pathname === '/campaigns' && "text-primary-600")} onClick={() => setIsMobileMenuOpen(false)}>Campaigns</Link>
              
              <div className="pt-4 border-t border-slate-100 flex flex-col space-y-3">
                {profile.isAuthenticated ? (
                  <>
                    <Link to={profile.userRole === 'admin' ? '/admin/users' : '/user/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                      <Button size="md" variant="outline" className="w-full border-primary-100 text-primary-600 bg-primary-50">
                        Go to Dashboard
                      </Button>
                    </Link>

                  </>
                ) : (
                  <>
                    {!isLoginPage && (
                      <Button variant="outline" size="md" fullWidth onClick={() => { window.location.href='/login'; setIsMobileMenuOpen(false); }}>Login</Button>
                    )}
                    {(!isRegisterPage && !isLoginPage) && (
                      <Button size="md" fullWidth onClick={() => { window.location.href='/register'; setIsMobileMenuOpen(false); }}>Get Started</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 text-center md:text-left">
            <Link to="/" className="flex items-center group">
              <img src="/assets/logo.png" alt="EmpathI Logo" className="h-8 object-contain group-hover:scale-105 transition-transform" />
            </Link>
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
