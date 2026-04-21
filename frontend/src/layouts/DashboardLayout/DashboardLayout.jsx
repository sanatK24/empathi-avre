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
  Megaphone
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../../components/ui/Button';
import { useAppContext } from '../../context/AppContext';

const DashboardLayout = ({ role = 'requester' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = {
    requester: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/user/dashboard' },
      { label: 'Requests', icon: History, path: '/user/history' },
      { label: 'Create Request', icon: PlusCircle, path: '/user/create' },
      { label: 'My Matches', icon: CheckCircle, path: '/user/matches' },
      { label: 'Campaigns', icon: TrendingUp, path: '/user/campaigns' },
      { label: 'Create Campaign', icon: Megaphone, path: '/user/campaigns/create' },
      { label: 'My Campaigns', icon: BarChart3, path: '/user/campaigns/my' },
      { label: 'Donations', icon: Heart, path: '/user/donations' },
      { label: 'Emergency Help', icon: Siren, path: '/user/emergency' },
      { label: 'My Emergencies', icon: History, path: '/user/emergency' }, // Reusing emergencyhub for now
      { label: 'Recommendations', icon: Sparkles, path: '/user/recommendations' },
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

  const currentNav = navItems[role] || navItems.requester;

  const { profile, logout } = useAppContext();
  const userInitials = profile.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'GU';

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xl font-display font-bold text-slate-900">EmpathI</span>
          </div>

          <nav className="flex-grow space-y-2">
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
                      ? "bg-primary-50 text-primary-600" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary-600" : "text-slate-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <button 
              onClick={() => {
                console.log('Logout button clicked');
                logout();
              }}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-4 py-2 w-96">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl relative transition-all active:scale-95">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="flex items-center space-x-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{profile.fullName || 'Guest User'}</p>
                <p className="text-xs font-medium text-slate-500 mt-1 capitalize">{role === 'requester' ? 'User' : role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8 flex-grow overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
