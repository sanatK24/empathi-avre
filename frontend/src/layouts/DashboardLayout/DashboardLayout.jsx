import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  Activity,
  Package,
  Inbox,
  BarChart3,
  Users,
  ShieldCheck,
  Store,
  TrendingUp,
  Heart,
  Siren,
  Sparkles,
  CheckCircle,
  Megaphone,
  Zap
} from 'lucide-react';

import { cn } from '../../utils/cn';
import Button from '../../components/ui/Button';
import { useAppContext } from '../../context/AppContext';
import NotificationBell from '../../components/NotificationBell';
import MobileMenu from '../../components/layout/MobileMenu';

const DashboardLayout = ({ role = 'requester' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const location = useLocation();
  const { profile, logout } = useAppContext();

  const navItems = {
    requester: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/user/dashboard' },
      { label: 'Resource Hub', icon: Zap, path: '/user/resources' },
      { label: 'Campaign Center', icon: TrendingUp, path: '/user/campaigns' },
      { label: 'My Campaigns', icon: Heart, path: '/user/campaigns/my' },
      { label: 'Emergency SOS', icon: Siren, path: '/user/emergency' },
      { label: 'Smart Feed', icon: Sparkles, path: '/user/smart-feed' },
      { label: 'Profile', icon: User, path: '/user/profile' },
      { label: 'Settings', icon: Settings, path: '/user/settings' },
    ],
    vendor: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/vendor/dashboard' },
      { label: 'Inventory', icon: Package, path: '/vendor/inventory' },
      { label: 'Orders', icon: Inbox, path: '/vendor/orders' },
      { label: 'Analytics', icon: BarChart3, path: '/vendor/analytics' },
      { label: 'Profile', icon: User, path: '/vendor/profile' },
    ],
    admin: [
      { label: 'Overview', icon: ShieldCheck, path: '/admin/dashboard' },
      { label: 'Users', icon: Users, path: '/admin/users' },
      { label: 'Vendors', icon: Store, path: '/admin/vendors' }, 
      { label: 'Campaigns', icon: Megaphone, path: '/admin/campaigns' },
      { label: 'System Stats', icon: TrendingUp, path: '/admin/stats' },
      { label: 'Profile', icon: User, path: '/admin/profile' },
    ]
  };

  // Determine role dynamically: use context role or derive from URL path
  let activeRole = role;
  if (location.pathname.startsWith('/vendor')) {
    activeRole = 'vendor';
  } else if (location.pathname.startsWith('/admin')) {
    activeRole = 'admin';
  } else if (location.pathname.startsWith('/user')) {
    activeRole = 'requester';
  }

  const currentNav = navItems[activeRole] || navItems.requester;

  const userInitials = profile.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'GU';

  return (
    <div className="h-screen bg-surface-50 flex overflow-hidden">
      {/* Mobile Menu Component (Only visible on mobile/tablet) */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        navItems={currentNav}
        profile={profile}
        logout={logout}
        userInitials={userInitials}
      />

      {/* Desktop Sidebar (Only visible on lg viewports) */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 transition-all duration-300",
          !isSidebarOpen && "w-20"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <div className={cn("flex items-center space-x-3 mb-10 transition-all", !isSidebarOpen && "justify-center space-x-0")}>
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            {isSidebarOpen && <span className="text-xl font-display font-bold text-slate-900 truncate">EmpathI</span>}
          </div>

          <nav className="flex-grow space-y-2 overflow-y-auto no-scrollbar">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive 
                      ? "bg-primary-50 text-primary-600 shadow-sm shadow-primary-100/30" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                    !isSidebarOpen && "justify-center px-0"
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary-600" : "text-slate-400")} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <button 
              onClick={logout}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full",
                !isSidebarOpen && "justify-center px-0"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
          
          {/* Default Header View (when mobile search is closed) */}
          {!isMobileSearchOpen ? (
            <>
              <div className="flex items-center space-x-4">
                {/* Hamburger for Mobile/Tablet */}
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                  aria-label="Open Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
                
                {/* Collapse Toggle for Desktop Sidebar */}
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="hidden lg:block p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-4 py-2 w-64 xl:w-96">
                  <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Search resources..." 
                    className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Mobile Search Toggle */}
                <button 
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>

                <NotificationBell />
                <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2 hidden sm:block"></div>
                <div className="flex items-center space-x-3 pl-1 md:pl-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-900 leading-none">{profile.fullName || 'Guest User'}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 capitalize">{role === 'requester' ? 'User' : role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20 flex-shrink-0">
                    {userInitials}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Mobile Search Open View */
            <div className="flex w-full items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex-1 flex items-center bg-slate-100 rounded-xl px-4 py-2">
                <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search resources..." 
                  className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 p-0"
                />
              </div>
              <button 
                onClick={() => setIsMobileSearchOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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

