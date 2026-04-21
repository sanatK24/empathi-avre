import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, Building2, FileText, Save, Trash2, CheckCircle2, 
  AlertCircle, MapPin, Home, Siren, Shield, Users, Activity, 
  Lock, Bell, Palette, Globe, Clock, ShieldCheck, TrendingUp, 
  Package, Inbox, BarChart3, Store, Eye, EyeOff, Sparkles, Megaphone, Heart, History
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { updateMyProfile } from '../services/authService';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';

const SharedProfileDashboard = () => {
    const { profile, updateProfile, logout } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    // Form states
    const [formData, setFormData] = useState({
        // Common
        fullName: '',
        email: '',
        phone: '',
        organizationName: '',
        bio: '',
        city: '',
        address: '',
        language: 'English',
        timezone: 'UTC+5:30',
        
        // User Specific
        bloodGroup: '',
        preferredHospital: '',
        emergencyContacts: [],
        personalCategories: [],
        newCategory: '',
        accessibilityNeeds: '',
        
        // Form helper for new contact
        newContact: {
            name: '',
            phone: '',
            category: 'Family'
        },
        
        // Vendor Specific
        shopName: '',
        businessCategory: '',
        registrationId: '',
        serviceAreas: '',
        operatingHours: '',
        leadTime: '',
        isActive: true,
        
        // Security
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        
        // Preferences
        notifications: {
            email: true,
            push: true,
            sms: false,
            urgencyAlerts: true
        },
        theme: 'light',
        privacy: 'public'
    });

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                fullName: profile.fullName || '',
                email: profile.email || '',
                phone: profile.phone || '',
                organizationName: profile.organizationName || profile.shopName || '',
                bio: profile.bio || '',
                city: profile.city || '',
                address: profile.address || '',
                bloodGroup: profile.bloodGroup || '',
                preferredHospital: profile.preferredHospital || '',
                emergencyContacts: profile.emergency_contacts || [],
                personalCategories: profile.personal_categories ? profile.personal_categories.split(',') : ['Medical', 'Education', 'Food'],
                accessibilityNeeds: profile.accessibilityNeeds || '',
                shopName: profile.shopName || '',
                businessCategory: profile.businessCategory || profile.category || '',
                registrationId: profile.registrationId || '',
                serviceAreas: profile.serviceAreas || '',
                operatingHours: profile.operatingHours || '',
                leadTime: profile.leadTime || '',
                isActive: profile.is_active !== undefined ? profile.is_active : true
            }));
            loadStats();
        }
    }, [profile]);

    const loadStats = async () => {
        try {
            let data = null;
            if (profile.role === 'requester') {
                data = await apiService.getRequesterStats(profile.accessToken);
            } else if (profile.role === 'vendor') {
                data = await apiService.getVendorStats(profile.accessToken);
            } else if (profile.role === 'admin') {
                data = await apiService.getAdminStats(profile.accessToken);
            }
            setStats(data);
        } catch (err) {
            console.error('Failed to load role stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddContact = async () => {
        if (!formData.newContact.name || !formData.newContact.phone) return;
        setSaving(true);
        try {
            const contact = await apiService.addEmergencyContact(profile.accessToken, formData.newContact);
            setFormData(prev => ({
                ...prev,
                emergencyContacts: [...prev.emergencyContacts, contact],
                newContact: { name: '', phone: '', category: 'Family' }
            }));
            setStatus({ type: 'success', message: 'Contact added!' });
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to add contact.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = async (id) => {
        try {
            await apiService.deleteEmergencyContact(profile.accessToken, id);
            setFormData(prev => ({
                ...prev,
                emergencyContacts: prev.emergencyContacts.filter(c => c.id !== id)
            }));
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to delete contact.' });
        }
    };

    const handleAddCategory = () => {
        if (!formData.newCategory || formData.personalCategories.includes(formData.newCategory)) return;
        setFormData(prev => ({
            ...prev,
            personalCategories: [...prev.personalCategories, prev.newCategory],
            newCategory: ''
        }));
    };

    const handleRemoveCategory = (cat) => {
        setFormData(prev => ({
            ...prev,
            personalCategories: prev.personalCategories.filter(c => c !== cat)
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setStatus({ type: null, message: '' });

        try {
            let backendUser;
            if (profile.role === 'vendor') {
                backendUser = await apiService.updateVendorProfile(profile.accessToken, {
                    shop_name: formData.shopName || formData.organizationName,
                    category: formData.businessCategory,
                    phone: formData.phone,
                    city: formData.city,
                    address: formData.address,
                    bio: formData.bio,
                    registration_id: formData.registrationId,
                    service_areas: formData.serviceAreas,
                    lead_time: formData.leadTime,
                    opening_hours: formData.operatingHours,
                    is_active: formData.isActive,
                    lat: profile.lat || 19.0760,
                    lng: profile.lng || 72.8777
                });
            } else {
                backendUser = await updateMyProfile({
                    name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    organizationName: formData.organizationName,
                    bio: formData.bio,
                    city: formData.city,
                    address: formData.address,
                    bloodGroup: formData.bloodGroup,
                    preferredHospital: formData.preferredHospital,
                    personal_categories: formData.personalCategories.join(','),
                    accessibilityNeeds: formData.accessibilityNeeds,
                    accessToken: profile.accessToken,
                });
            }

            updateProfile({
                ...profile,
                fullName: backendUser?.name || formData.fullName,
                email: backendUser?.email || formData.email,
                phone: backendUser?.phone || formData.phone,
                organizationName: backendUser?.organization_name || formData.organizationName,
                bio: backendUser?.bio || formData.bio,
                city: backendUser?.city || formData.city,
                address: backendUser?.address || formData.address,
                bloodGroup: backendUser?.blood_group || formData.bloodGroup,
                preferredHospital: backendUser?.preferred_hospital || formData.preferredHospital,
                accessibilityNeeds: backendUser?.accessibility_needs || formData.accessibilityNeeds,
                personal_categories: backendUser?.personal_categories || formData.personalCategories.join(','),
                emergency_contacts: formData.emergencyContacts, // Locally synced
                shopName: backendUser?.shop_name || formData.shopName,
                businessCategory: backendUser?.category || formData.businessCategory
            });

            setStatus({ type: 'success', message: 'Profile updated successfully!' });
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        } catch (error) {
            console.error('Update failed:', error);
            setStatus({ type: 'error', message: error.message || 'Failed to update profile.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async () => {
        if (!window.confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) return;
        
        try {
            await apiService.deleteProfile(profile.accessToken);
            alert('Account deactivated. Logging out...');
            logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Deactivation failed:', error);
            setStatus({ type: 'error', message: 'Failed to deactivate account.' });
        }
    };

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-primary-500/20 group-hover:scale-105 transition-transform">
                        {formData.fullName.charAt(0) || 'U'}
                    </div>
                    <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-primary-500 transition-colors">
                        <Palette className="w-4 h-4" />
                    </button>
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">
                            {formData.fullName || 'Guest User'}
                        </h1>
                        <Badge variant={profile.isVerified ? 'success' : 'secondary'} className="h-6">
                            {profile.isVerified ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                            {profile.role === 'requester' ? 'User' : profile.role}
                        </Badge>
                    </div>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {formData.email}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                        <Badge variant="ghost" className="bg-slate-100 text-slate-600">
                            Status: Active
                        </Badge>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            Joined {new Date(profile.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <Button variant="outline" icon={<Eye className="w-4 h-4" />}>Public View</Button>
                <Button variant="primary" icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>
                    Save Changes
                </Button>
            </div>
        </div>
    );

    const renderTabs = () => (
        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
            {[
                { id: 'general', label: 'General', icon: User },
                { id: 'security', label: 'Security', icon: Lock },
                { id: 'preferences', label: 'Preferences', icon: Bell },
                { id: 'activity', label: 'Activity', icon: TrendingUp },
                { id: 'role', label: 'Role Specific', icon: Sparkles }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                        activeTab === tab.id 
                            ? "bg-white text-primary-600 shadow-sm" 
                            : "text-slate-500 hover:text-slate-900"
                    )}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const renderGeneralInfo = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-500" />
                    Personal Information
                </h3>
                <div className="space-y-6">
                    <Input 
                        label="Full Name" 
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="Full Name"
                        icon={<User className="w-4 h-4" />}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Email" 
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            icon={<Mail className="w-4 h-4" />}
                        />
                        <Input 
                            label="Phone" 
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            icon={<Phone className="w-4 h-4" />}
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-500" />
                    Location & Contact
                </h3>
                <div className="space-y-6">
                    <Input 
                        label="City" 
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        icon={<MapPin className="w-4 h-4" />}
                    />
                    <Input 
                        label="Full Address" 
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        icon={<Home className="w-4 h-4" />}
                    />
                </div>
            </Card>

            <Card className="p-8 lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    Bio & Professional Identity
                </h3>
                <div className="space-y-6">
                    <Input 
                        label={profile.role === 'vendor' ? "Shop/Business Name" : "Organization Name"} 
                        value={formData.organizationName}
                        onChange={(e) => handleInputChange('organizationName', e.target.value)}
                        icon={<Building2 className="w-4 h-4" />}
                    />
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">About / Bio</label>
                        <textarea 
                            value={formData.bio}
                            onChange={(e) => handleInputChange('bio', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                            placeholder="Tell us about yourself or your organization..."
                        />
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderSecuritySettings = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-500" />
                    Change Password
                </h3>
                <div className="space-y-6">
                    <Input label="Current Password" type="password" />
                    <Input label="New Password" type="password" />
                    <Input label="Confirm New Password" type="password" />
                    <Button variant="secondary" className="w-full">Update Password</Button>
                </div>
            </Card>

            <Card className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-500" />
                    Privacy & Login
                </h3>
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-900">Two-Factor Authentication</p>
                            <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                        </div>
                        <Badge variant="ghost" className="bg-slate-100 text-slate-400">Disabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-900">Active Sessions</p>
                            <p className="text-xs text-slate-500">Currently logged in on 2 devices.</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500">Logout All</Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderPreferences = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary-500" />
                    Notification Preferences
                </h3>
                <div className="space-y-6">
                    {[
                        { id: 'email', label: 'Email Notifications' },
                        { id: 'push', label: 'Push Notifications' },
                        { id: 'sms', label: 'SMS Alerts' },
                        { id: 'urgencyAlerts', label: 'Urgent Dispatch Alerts' }
                    ].map(pref => (
                        <div key={pref.id} className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">{pref.label}</span>
                            <div 
                                onClick={() => handleNestedChange('notifications', pref.id, !formData.notifications[pref.id])}
                                className={cn(
                                    "w-12 h-6 rounded-full transition-all cursor-pointer relative",
                                    formData.notifications[pref.id] ? "bg-primary-500" : "bg-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                    formData.notifications[pref.id] ? "left-7" : "left-1"
                                )} />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    Localization & Display
                </h3>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Interface Language</label>
                        <select className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium">
                            <option>English</option>
                            <option>Hindi</option>
                            <option>Marathi</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Timezone</label>
                        <select className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium">
                            <option>UTC +5:30 (India Standard Time)</option>
                            <option>UTC +0:00 (GMT)</option>
                        </select>
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderActivitySummary = () => {
        const roleStats = {
            requester: [
                { label: 'Active Requests', value: stats?.active_requests || 0, icon: Activity, color: 'text-primary-500' },
                { label: 'Impact Score', value: stats?.impact_score || 0, icon: TrendingUp, color: 'text-emerald-500' },
                { label: 'Lives Affected', value: stats?.lives_affected || 0, icon: Heart, color: 'text-rose-500' }
            ],
            vendor: [
                { label: 'Total Sales', value: stats?.total_value || '₹0', icon: TrendingUp, color: 'text-emerald-500' },
                { label: 'Inventory Items', value: stats?.inventory_count || 0, icon: Package, color: 'text-primary-500' },
                { label: 'Orders Fulfilled', value: stats?.completed_orders || 0, icon: CheckCircle2, color: 'text-indigo-500' }
            ],
            admin: [
                { label: 'Audits Performed', value: stats?.audits_count || 0, icon: ShieldCheck, color: 'text-primary-500' },
                { label: 'Moderations', value: stats?.moderations_count || 0, icon: AlertCircle, color: 'text-amber-500' },
                { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-emerald-500' }
            ]
        };

        const currentStats = roleStats[profile.role] || [];

        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {currentStats.map((s, i) => (
                        <Card key={i} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                                <div className={cn("p-2 rounded-lg bg-slate-50", s.color)}>
                                    <s.icon className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-2xl font-black text-slate-900">{s.value}</h4>
                        </Card>
                    ))}
                </div>

                <Card className="p-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Recent Account Activity
                    </h3>
                    <div className="space-y-6">
                        {[
                            { action: 'Profile Updated', date: '2 hours ago', icon: User },
                            { action: 'Logged in from Mumbai, IN', date: '5 hours ago', icon: MapPin },
                            { action: 'Security Settings Viewed', date: 'Yesterday', icon: Lock }
                        ].map((act, i) => (
                            <div key={i} className="flex items-center justify-between pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                        <act.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{act.action}</p>
                                        <p className="text-xs text-slate-400">{act.date}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Details</Button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    };

    const renderRoleSpecific = () => {
        if (profile.role === 'requester') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 text-rose-600">
                            <Siren className="w-5 h-5" />
                            Emergency Profile
                        </h3>
                        {/* Health info */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Blood Group</label>
                                <select 
                                    value={formData.bloodGroup}
                                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                                    className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium"
                                >
                                    <option value="">Select</option>
                                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                </select>
                            </div>
                            <Input 
                                label="Hospital Preference" 
                                value={formData.preferredHospital}
                                onChange={(e) => handleInputChange('preferredHospital', e.target.value)}
                                icon={<Building2 className="w-4 h-4" />}
                            />
                        </div>

                        {/* Contacts Management */}
                        <div className="space-y-6">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4" /> Personal Contacts
                            </h4>
                            <div className="space-y-3">
                                {formData.emergencyContacts.map(contact => (
                                    <div key={contact.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-500">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{contact.name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{contact.phone} • <span className="text-primary-600 uppercase font-black tracking-tighter text-[10px]">{contact.category}</span></p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Contact Form */}
                            <div className="p-6 bg-slate-100/50 rounded-3xl space-y-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add New Contact</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        placeholder="Name" 
                                        value={formData.newContact.name}
                                        onChange={e => handleNestedChange('newContact', 'name', e.target.value)}
                                        className="px-4 py-2 text-xs font-bold rounded-xl border-none ring-1 ring-slate-200 outline-none focus:ring-primary-500" 
                                    />
                                    <input 
                                        placeholder="Phone" 
                                        value={formData.newContact.phone}
                                        onChange={e => handleNestedChange('newContact', 'phone', e.target.value)}
                                        className="px-4 py-2 text-xs font-bold rounded-xl border-none ring-1 ring-slate-200 outline-none focus:ring-primary-500" 
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <select 
                                        value={formData.newContact.category}
                                        onChange={e => handleNestedChange('newContact', 'category', e.target.value)}
                                        className="flex-1 px-4 py-2 text-xs font-bold rounded-xl border-none ring-1 ring-slate-200 outline-none"
                                    >
                                        {['Family', 'Doctor', 'Friend', 'Neighbor', 'Work'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <Button size="sm" onClick={handleAddContact} loading={saving}>Add Contact</Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary-500" />
                            Personal Categories
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                            Define the topics and service areas you care about. These categories influence your feed and emergency discovery.
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-8">
                            <AnimatePresence>
                                {formData.personalCategories.map(cat => (
                                    <motion.div
                                        key={cat}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                    >
                                        <Badge 
                                            variant="ghost" 
                                            className="bg-primary-50 text-primary-700 border border-primary-100 flex items-center gap-1 py-1.5"
                                        >
                                            {cat}
                                            <Trash2 className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" onClick={() => handleRemoveCategory(cat)} />
                                        </Badge>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-2">
                            <Input 
                                placeholder="New category (e.g. Yoga, Cancer Care)" 
                                value={formData.newCategory}
                                onChange={e => handleInputChange('newCategory', e.target.value)}
                                className="flex-grow"
                            />
                            <Button size="icon" onClick={handleAddCategory}><Sparkles className="w-4 h-4" /></Button>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-50">
                             <Input label="Alert Threshold Distance (km)" type="number" placeholder="20" icon={<MapPin className="w-4 h-4" />} />
                        </div>
                    </Card>
                </div>
            );
        }

        if (profile.role === 'vendor') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Store className="w-5 h-5 text-indigo-500" />
                            Business Information
                        </h3>
                        <div className="space-y-6">
                            <Input label="Business Category" value={formData.businessCategory} onChange={(e) => handleInputChange('businessCategory', e.target.value)} icon={<Inbox className="w-4 h-4" />} />
                            <Input label="GST / Registration ID" value={formData.registrationId} onChange={(e) => handleInputChange('registrationId', e.target.value)} icon={<Shield className="w-4 h-4" />} />
                            <Input label="Operating Hours" value={formData.operatingHours} onChange={(e) => handleInputChange('operatingHours', e.target.value)} icon={<Clock className="w-4 h-4" />} />
                        </div>
                    </Card>

                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-500" />
                            Operations
                        </h3>
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900">Accept New Requests</p>
                                    <p className="text-xs text-slate-500">Toggle visibility in matching engine.</p>
                                </div>
                                <div 
                                    onClick={() => handleInputChange('isActive', !formData.isActive)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-all cursor-pointer relative",
                                        formData.isActive ? "bg-emerald-500" : "bg-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        formData.isActive ? "left-7" : "left-1"
                                    )} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900">Vacation Mode</p>
                                    <p className="text-xs text-slate-500">Pause all operations temporarily.</p>
                                </div>
                                <div 
                                    onClick={() => handleInputChange('isActive', !formData.isActive)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-all cursor-pointer relative",
                                        !formData.isActive ? "bg-amber-500" : "bg-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        !formData.isActive ? "left-7" : "left-1"
                                    )} />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            );
        }

        if (profile.role === 'admin') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary-500" />
                            Admin Identity
                        </h3>
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Access Level</p>
                                <p className="text-lg font-bold text-slate-900">Root Administrator</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Permissions</p>
                                <div className="flex flex-wrap gap-2">
                                    {['User Management', 'Vendor Verification', 'Financial Audit', 'System Config'].map(p => (
                                        <Badge key={p} variant="ghost" className="bg-indigo-50 text-indigo-700">{p}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Security Controls
                        </h3>
                        <Button variant="secondary" className="w-full justify-start mb-4">View System Access Logs</Button>
                        <Button variant="outline" className="w-full justify-start text-amber-600 hover:bg-amber-50">Revoke External API Access</Button>
                    </Card>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="w-16 h-16 border-t-4 border-primary-500 border-solid rounded-full animate-spin"></div>
                <p className="text-lg font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing EmpathI Neural Profile...</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto px-4 pb-20"
        >
            {renderHeader()}
            {renderTabs()}

            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'general' && renderGeneralInfo()}
                        {activeTab === 'security' && renderSecuritySettings()}
                        {activeTab === 'preferences' && renderPreferences()}
                        {activeTab === 'activity' && renderActivitySummary()}
                        {activeTab === 'role' && renderRoleSpecific()}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-red-500 hover:bg-red-50" icon={<Trash2 className="w-4 h-4" />} onClick={handleDeactivate}>
                        Deactivate Account
                    </Button>
                </div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    EmpathI Profile Engine v1.2 • End-to-End Encrypted
                </p>
            </div>

            {/* Status Toasts */}
            <AnimatePresence>
                {status.message && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                            "fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50",
                            status.type === 'success' ? "bg-slate-900 text-white" : "bg-red-600 text-white"
                        )}
                    >
                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-bold text-sm tracking-tight">{status.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SharedProfileDashboard;
