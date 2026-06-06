import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut } from 'lucide-react';
import { cn } from '../../utils/cn';
const MobileMenu = ({ isOpen, onClose, navItems, profile, logout, userInitials }) => {
  const location = useLocation();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
          />
          {}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl z-[70] flex flex-col lg:hidden"
          >
            {}
            <div className="p-6 flex items-center justify-between border-b border-slate-100">
              <Link to="/" onClick={onClose} className="flex items-center group">
              <img src="/assets/logo.png" alt="EmpathI Logo" className="h-10 object-contain group-hover:scale-105 transition-transform" />
            </Link>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {}
            <div className="p-6 bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                  {userInitials}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{profile.fullName || 'Guest User'}</p>
                  <p className="text-xs font-medium text-slate-500 capitalize">{profile.userRole || 'User'}</p>
                </div>
              </div>
            </div>
            {}
            <nav className="flex-grow overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      "flex items-center space-x-4 px-4 py-4 rounded-2xl text-base font-semibold transition-all duration-200",
                      isActive
                        ? "bg-primary-50 text-primary-600 shadow-sm shadow-primary-100/50"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className={cn("w-6 h-6", isActive ? "text-primary-600" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            {}
            <div className="p-6 border-t border-slate-100">
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-base font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all w-full shadow-lg shadow-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default MobileMenu;
