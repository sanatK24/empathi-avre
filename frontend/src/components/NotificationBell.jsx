import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2, Info, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationContext } from '../context/NotificationContext';
import Badge from './ui/Badge';
import Button from './ui/Button';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotificationContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'success': return <Check className="w-4 h-4 text-emerald-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Zap className="w-4 h-4 text-primary-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-300 group active:scale-95"
      >
        <Bell className={`w-6 h-6 transition-colors ${unreadCount > 0 ? 'text-primary-500' : 'text-slate-500 group-hover:text-slate-700'}`} />
        {unreadCount > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 flex h-4 w-4"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-500 border-2 border-white text-[8px] font-black text-white items-center justify-center">
              {unreadCount}
            </span>
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 mt-4 w-[calc(100vw-2rem)] sm:w-96 max-h-[80vh] sm:max-h-[500px] bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-premium z-50 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Notifications</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">You have {unreadCount} unread messages</p>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button 
                    onClick={clearNotifications}
                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setShowDropdown(false)}
                  className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              {notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-1">We'll let you know when something happens</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={`group p-4 flex gap-4 cursor-pointer hover:bg-primary-50/50 transition-all duration-300 relative ${!notif.isRead ? 'before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:bg-primary-500 before:rounded-r-full' : ''}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${!notif.isRead ? 'bg-white shadow-soft' : 'bg-slate-50'}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className={`text-xs font-black uppercase tracking-tight truncate ${!notif.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                            {notif.title}
                          </h5>
                          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${!notif.isRead ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                          {notif.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  fullWidth 
                  className="h-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary-500"
                  onClick={() => setShowDropdown(false)}
                >
                  View All Activity
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
