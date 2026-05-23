import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Bell, Sliders, Globe, Shield, RefreshCw, Key, Copy, Check,
  AlertTriangle, ShieldAlert, Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { updateMyProfile } from '../services/authService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';

const SettingsPage = () => {
  const { profile, updateProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState('security');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  // Security tab states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [twoFactor, setTwoFactor] = useState(false);

  // Proximity Alert tab states
  const [proximityRadius, setProximityRadius] = useState(profile.proximityThreshold || 25);
  const [notifications, setNotifications] = useState({
    criticalProximity: true,
    campaignLaunches: true,
    weeklyDigest: false,
    smsAlerts: false,
    anonymousActivity: true
  });

  // UI preferences
  const [theme, setTheme] = useState(localStorage.getItem('empathi_theme') || 'light');
  const [language, setLanguage] = useState('English');
  const [defaultLanding, setDefaultLanding] = useState('dashboard');

  // Dev integration mockup states
  const [apiKey, setApiKey] = useState('emp_live_7f8a92bcd4e5f6a78b9c0d1e2f3a4b5c');
  const [apiSecret, setApiSecret] = useState('es_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3a4b5');
  const [copiedKey, setCopiedKey] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Handle password update
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setStatus({ type: 'error', message: 'New password cannot be empty.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      await updateMyProfile({
        name: profile.fullName,
        email: profile.email,
        password: newPassword,
        accessToken: profile.accessToken,
      });

      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus({ type: null, message: '' }), 4000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setSaving(false);
    }
  };

  // Sync theme to document body/root element
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('empathi_theme', newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setStatus({ type: 'success', message: `Theme switched to ${newTheme}!` });
    setTimeout(() => setStatus({ type: null, message: '' }), 2000);
  };

  // Handle saving of alerts & notifications preferences
  const handleSaveAlertPreferences = (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Save locally or in AppContext profile
    updateProfile({
      proximityThreshold: proximityRadius
    });

    setTimeout(() => {
      setSaving(false);
      setStatus({ type: 'success', message: 'Notification & threshold settings updated!' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }, 800);
  };

  // Handle Mock Developer Key Generation
  const handleRegenerateKeys = () => {
    setGenerating(true);
    setTimeout(() => {
      const newKey = 'emp_live_' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
      const newSecret = 'es_sec_' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
      setApiKey(newKey);
      setApiSecret(newSecret);
      setGenerating(false);
      setStatus({ type: 'success', message: 'API Credentials regenerated successfully!' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }, 1200);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const tabs = [
    { id: 'security', label: 'Security & Access', icon: Lock },
    { id: 'alerts', label: 'Proximity Alerts', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    ...(profile.userRole === 'admin' || profile.userRole === 'ngo' || profile.userRole === 'volunteer_ngo'
      ? [{ id: 'developer', label: 'Developer API', icon: Key }]
      : [])
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">Settings</h1>
          <p className="text-slate-500 font-semibold mt-1">Configure your crisis radius, system theme, and profile security</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-2xl border border-primary-100/50">
          <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
          <span className="text-xs font-bold text-primary-800 uppercase tracking-tight">AI Engine Sync Active</span>
        </div>
      </div>

      {/* Main Grid: Tabs and Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Tab Selector */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setStatus({ type: null, message: '' });
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-left",
                    isActive 
                      ? "bg-primary-50 text-primary-600 shadow-sm shadow-primary-100/10" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary-500" : "text-slate-400")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-500 space-y-2">
            <div className="flex justify-between">
              <span>Account Type:</span>
              <span className="font-bold text-slate-800 capitalize">{profile.userRole}</span>
            </div>
            <div className="flex justify-between">
              <span>Home Location:</span>
              <span className="font-bold text-slate-800">{profile.city || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span>Verification Status:</span>
              <span className={cn("font-bold", profile.isVerified ? "text-emerald-600" : "text-amber-500")}>
                {profile.isVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          
          {/* Action Toasts */}
          <AnimatePresence mode="wait">
            {status.message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "mb-6 p-4 rounded-xl border flex items-start gap-3 font-semibold text-sm shadow-sm",
                  status.type === 'success' && "bg-emerald-50 border-emerald-100 text-emerald-800",
                  status.type === 'error' && "bg-red-50 border-red-100 text-red-800",
                  status.type === 'info' && "bg-blue-50 border-blue-100 text-blue-800"
                )}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : status.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />
                )}
                <div>{status.message}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            
            {/* Panel: Security */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary-500" />
                      Update Profile Password
                    </CardTitle>
                    <CardDescription>
                      Ensure your account remains private with a secure, highly-complex password.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handlePasswordChange}>
                    <CardContent className="space-y-4">
                      
                      <div className="relative">
                        <Input 
                          label="Current Password" 
                          type={showPassword.current ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                          className="absolute right-4 bottom-3 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <Input 
                            label="New Password" 
                            type={showPassword.new ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                            className="absolute right-4 bottom-3 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <div className="relative">
                          <Input 
                            label="Confirm New Password" 
                            type={showPassword.confirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                            className="absolute right-4 bottom-3 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" loading={saving}>
                        Save Password
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

                {/* Card: 2-Factor Authentication */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        Multi-Factor Authentication (MFA)
                      </CardTitle>
                      <CardDescription className="max-w-[480px]">
                        Verify active authentication attempts via SMS or Authenticator App notifications before granting database session authorizations.
                      </CardDescription>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={twoFactor}
                        onChange={() => {
                          setTwoFactor(!twoFactor);
                          setStatus({ 
                            type: 'info', 
                            message: !twoFactor ? 'Securing device profile... SMS Verification generated for 2FA.' : 'MFA disabled.' 
                          });
                          setTimeout(() => setStatus({ type: null, message: '' }), 3000);
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </CardHeader>
                </Card>
              </motion.div>
            )}

            {/* Panel: Alerts & Distance Proximity */}
            {activeTab === 'alerts' && (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-primary-500" />
                      Dynamic Alert Proximity Radius
                    </CardTitle>
                    <CardDescription>
                      Define the maximum distance radius in kilometers for real-time crisis notifications and local emergency highlights.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSaveAlertPreferences}>
                    <CardContent className="space-y-8">
                      
                      {/* Radius Slider Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Discovery Alert Threshold:</span>
                            <span className="text-xl font-black text-primary-600 bg-primary-50 px-3 py-1 rounded-xl">
                              {proximityRadius} km
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="100" 
                            value={proximityRadius}
                            onChange={(e) => setProximityRadius(Number(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none"
                          />
                          <div className="flex justify-between text-xs text-slate-400 font-bold">
                            <span>1 km (Ultra local)</span>
                            <span>50 km</span>
                            <span>100 km (Wide area)</span>
                          </div>
                        </div>

                        {/* circular reach widget */}
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-primary-50/50">
                            {/* pulsing reach rings */}
                            <motion.div 
                              animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.4, 0.15] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              style={{ width: `${60 + (proximityRadius / 2)}px`, height: `${60 + (proximityRadius / 2)}px` }}
                              className="absolute rounded-full bg-primary-400/20 border border-primary-400/30"
                            />
                            <div className="w-10 h-10 rounded-full bg-primary-gradient shadow-md shadow-primary-500/25 flex items-center justify-center text-white font-bold text-xs z-10">
                              Pin
                            </div>
                          </div>
                          <p className="mt-4 text-xs font-bold text-slate-500 text-center max-w-[200px]">
                            Prioritizing emergencies within <span className="text-slate-800 font-black">{proximityRadius} km</span> of {profile.city || 'your current location'}.
                          </p>
                        </div>
                      </div>

                      {/* Detailed Checkboxes */}
                      <div className="border-t border-slate-100 pt-6 space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Notification Channels</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={notifications.criticalProximity}
                              onChange={(e) => setNotifications(n => ({ ...n, criticalProximity: e.target.checked }))}
                              className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500/30"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Critical Proximity Alerts</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Email instantly on high-urgency crises within radius</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={notifications.campaignLaunches}
                              onChange={(e) => setNotifications(n => ({ ...n, campaignLaunches: e.target.checked }))}
                              className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500/30"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">New Campaign Notifications</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Alert me when new campaigns are launched by followed NGOs</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={notifications.weeklyDigest}
                              onChange={(e) => setNotifications(n => ({ ...n, weeklyDigest: e.target.checked }))}
                              className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500/30"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Weekly Digest Newsletter</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Receive a weekly summary of impact and donation allocations</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={notifications.smsAlerts}
                              onChange={(e) => setNotifications(n => ({ ...n, smsAlerts: e.target.checked }))}
                              className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500/30"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Direct SMS Crisis Broadcasts</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Receive text/WhatsApp notifications for extreme local disasters</p>
                            </div>
                          </label>
                        </div>
                      </div>

                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button type="submit" variant="primary" loading={saving}>
                        Save Proximity Settings
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            )}

            {/* Panel: Account Preferences */}
            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary-500" />
                      Localization & UI Preferences
                    </CardTitle>
                    <CardDescription>
                      Customize the look, layout preferences, and language translations of your workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Theme switcher */}
                    <div className="space-y-3">
                      <span className="text-sm font-bold text-slate-700">Display Theme</span>
                      <div className="grid grid-cols-3 gap-3">
                        {['light', 'dark', 'system'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleThemeChange(t)}
                            className={cn(
                              "py-3 rounded-xl border font-bold capitalize text-sm transition-all duration-200",
                              theme === t 
                                ? "border-primary-500 bg-primary-50/30 text-primary-600 shadow-sm" 
                                : "border-slate-100 hover:bg-slate-50 text-slate-500"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-0.5">Language Localization</label>
                        <select 
                          value={language}
                          onChange={(e) => {
                            setLanguage(e.target.value);
                            setStatus({ type: 'success', message: `Language updated to ${e.target.value}!` });
                            setTimeout(() => setStatus({ type: null, message: '' }), 2000);
                          }}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-slate-800 transition-all font-semibold"
                        >
                          <option>English</option>
                          <option>Hindi (हिन्दी)</option>
                          <option>Spanish (Español)</option>
                          <option>French (Français)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-0.5">Default Landing Screen</label>
                        <select 
                          value={defaultLanding}
                          onChange={(e) => {
                            setDefaultLanding(e.target.value);
                            setStatus({ type: 'success', message: `Preferred landing screen set to ${e.target.value}!` });
                            setTimeout(() => setStatus({ type: null, message: '' }), 2000);
                          }}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-slate-800 transition-all font-semibold"
                        >
                          <option value="dashboard">Dashboard Overview</option>
                          <option value="campaigns">Active Campaigns Feed</option>
                          <option value="profile">User Profile Dashboard</option>
                        </select>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Panel: Developer Access mockup */}
            {activeTab === 'developer' && (
              <motion.div
                key="developer"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-primary-500" />
                      Developer & Integration Settings
                    </CardTitle>
                    <CardDescription>
                      Generate API keys to programmatically sync humanitarian campaigns, fetch crisis statistics, and integrate donation feeds.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-600 font-semibold space-y-1">
                        <p className="font-bold text-slate-800">Secure API Authentication</p>
                        <p>Keep your credentials confidential. These keys allow complete programmatic read and write database access for campaigns created under your organization.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* client key */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Client Public Key</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={apiKey}
                            className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-700 flex-1 select-all outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => copyToClipboard(apiKey)}
                            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0"
                          >
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* client secret */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Client Private Secret</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={apiSecret}
                            className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-700 flex-1 select-all outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => copyToClipboard(apiSecret)}
                            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0"
                          >
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Last rotated: Today, 16:45</span>
                    <Button type="button" variant="secondary" loading={generating} onClick={handleRegenerateKeys}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Rotate Keys
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>

    </div>
  );
};

export default SettingsPage;
