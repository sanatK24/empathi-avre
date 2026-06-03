import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, LogOut, Menu, X, Search, Users, TrendingUp, Heart, Megaphone, ChevronDown, UserCircle, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppContext } from '../../context/AppContext';
import NotificationBell from '../../components/NotificationBell';
import MobileMenu from '../../components/layout/MobileMenu';

const navItems = {
  user: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/user/dashboard' },
    { label: 'Campaign Center', icon: TrendingUp, path: '/user/campaigns' },
    { label: 'My Campaigns', icon: Heart, path: '/user/campaigns/my' },
    { label: 'Profile', icon: User, path: '/user/profile' }
  ],
  admin: [
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Campaigns', icon: Megaphone, path: '/admin/campaigns' }
  ]
};

const DashboardLayout = ({ role = 'user' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAppContext();

  useEffect(() => {
    const f = (e) => !profileMenuRef.current?.contains(e.target) && setShowProfileMenu(false);
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  const searchTimeout = useRef(null);
  const triggerSearch = useCallback((q) => {
    const base = location.pathname.startsWith('/admin') ? '/admin' : '/user';
    navigate(`${base}/campaigns?search=${encodeURIComponent(q.trim())}`);
  }, [navigate, location.pathname]);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    if (val.trim().length > 1) {
      searchTimeout.current = setTimeout(() => triggerSearch(val), 500);
    }
  }, [triggerSearch]);

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      clearTimeout(searchTimeout.current);
      triggerSearch(searchQuery);
      setSearchQuery('');
      setIsMobileSearchOpen(false);
    }
  }, [searchQuery, triggerSearch]);

  const activeRole = location.pathname.startsWith('/admin') ? 'admin' : 'user';
  const currentNav = navItems[activeRole] || navItems.user;
  const userInitials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'GU';

  return (
    <div className="h-screen bg-surface-50 flex overflow-hidden">
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} navItems={currentNav} profile={profile} logout={logout} userInitials={userInitials} />

      <aside className={cn("hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 transition-all duration-300", !isSidebarOpen && "w-20")}>
        <div className="h-full flex flex-col p-6">
          <Link to="/" className={cn("flex items-center mb-10 transition-all", !isSidebarOpen && "justify-center")}>
            <img src="/assets/logo.png" alt="EmpathI Logo" className={cn("object-contain", isSidebarOpen ? "h-10" : "h-8")} />
          </Link>

          <nav className="flex-grow space-y-2 overflow-y-auto no-scrollbar">
            {currentNav.map(({ label, icon: Icon, path }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    active ? "bg-primary-50 text-primary-600 shadow-sm shadow-primary-100/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                    !isSidebarOpen && "justify-center px-0"
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-primary-600" : "text-slate-400")} />
                  {isSidebarOpen && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <button onClick={logout} className={cn("flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full", !isSidebarOpen && "justify-center px-0")}>
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
          {!isMobileSearchOpen ? (
            <>
              <div className="flex items-center space-x-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Open Menu">
                  <Menu className="w-6 h-6" />
                </button>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:block p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                  <Menu className="w-5 h-5" />
                </button>

                <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-slate-100 rounded-xl px-4 py-2 w-64 xl:w-96 focus-within:ring-2 focus-within:ring-primary-200 focus-within:bg-white transition-all">
                  <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                  <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search campaigns..." className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 outline-none" />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="ml-1 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
              </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                <button onClick={() => setIsMobileSearchOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  <Search className="w-5 h-5" />
                </button>

                <NotificationBell />
                
                {profile.city && (
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600" title={[profile.addressLine1, profile.locality, profile.city].filter(Boolean).join(', ')}>
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="truncate max-w-[150px]">{profile.locality ? `${profile.locality}, ${profile.city}` : profile.city}</span>
                  </div>
                )}

                <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2 hidden sm:block"></div>

                <div className="relative" ref={profileMenuRef}>
                  <button onClick={() => setShowProfileMenu(v => !v)} className="flex items-center space-x-2 md:space-x-3 pl-1 md:pl-2 rounded-xl hover:bg-slate-50 pr-2 py-1 transition-colors group" aria-label="Open profile menu">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900 leading-none">{profile.fullName || 'Guest User'}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 capitalize">{role === 'admin' ? 'Admin' : 'User'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20 flex-shrink-0">{userInitials}</div>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform hidden sm:block", showProfileMenu && "rotate-180")} />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                        <p className="text-sm font-black text-slate-900 truncate">{profile.fullName || 'Guest User'}</p>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{profile.email}</p>
                        <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary-50 text-primary-600 rounded-md">{role === 'admin' ? 'Admin' : 'User'}</span>
                      </div>

                      {!location.pathname.startsWith('/admin') && (
                        <nav className="py-2">
                          <Link to="/user/profile" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                            <UserCircle className="w-4 h-4" /> View Profile
                          </Link>
                        </nav>
                      )}

                      <div className="border-t border-slate-100 py-2">
                        <button onClick={() => { setShowProfileMenu(false); logout(); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleSearchSubmit} className="flex w-full items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex-1 flex items-center bg-slate-100 rounded-xl px-4 py-2">
                <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                <input type="text" autoFocus value={searchQuery} onChange={handleSearchChange} placeholder="Search campaigns..." className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 p-0 outline-none" />
              </div>
              <button type="button" onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(''); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </form>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-surface-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
