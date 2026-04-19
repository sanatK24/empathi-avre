import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Building2, FileText, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { updateMyProfile } from '../services/authService';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { cn } from '../utils/cn';

const UserProfilePage = () => {
    const { profile, updateProfile } = useAppContext();
    const [fullName, setFullName] = useState(profile?.fullName || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [organizationName, setOrganizationName] = useState(profile?.organizationName || '');
    const [bio, setBio] = useState(profile?.bio || '');
    
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });

    useEffect(() => {
        if (profile) {
            setFullName(profile.fullName || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setOrganizationName(profile.organizationName || '');
            setBio(profile.bio || '');
        }
    }, [profile]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setStatus({ type: null, message: '' });

        try {
            if (!profile?.accessToken) throw new Error('Not authenticated');

            const backendUser = await updateMyProfile({
                name: fullName,
                email,
                phone,
                organizationName,
                bio,
                accessToken: profile.accessToken,
            });

            updateProfile({
                ...profile,
                fullName: backendUser?.name || fullName,
                email: backendUser?.email || email,
                phone: backendUser?.phone || phone,
                organizationName: backendUser?.organization_name || organizationName,
                bio: backendUser?.bio || bio,
            });

            setStatus({ type: 'success', message: 'Profile updated successfully!' });
            
            // Clear success message after 3 seconds
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
            const { apiService } = await import('../services/apiService');
            await apiService.deleteProfile(profile.accessToken);
            alert('Account deactivated. Logging out...');
            import('../services/authService').then(m => m.logout());
            window.location.href = '/login';
        } catch (error) {
            console.error('Deactivation failed:', error);
            setStatus({ type: 'error', message: 'Failed to deactivate account.' });
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8 pb-12"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight mb-2">
                        Account Settings
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Manage your personal information and organization preferences.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-900">{fullName}</p>
                        <p className="text-xs font-medium text-slate-500 capitalize">{profile?.role}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-black text-lg">
                        {fullName.charAt(0) || <User className="w-6 h-6" />}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Settings */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary-500" />
                                Personal Information
                            </h3>
                            
                            <div className="space-y-6">
                                <Input 
                                    label="Full Name" 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    icon={<User className="w-4 h-4" />}
                                    required
                                />
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Input 
                                        label="Email Address" 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        icon={<Mail className="w-4 h-4" />}
                                        required
                                    />
                                    <Input 
                                        label="Phone Number" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        icon={<Phone className="w-4 h-4" />}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary-500" />
                                Organization Details
                            </h3>
                            
                            <div className="space-y-6">
                                <Input 
                                    label="Organization Name" 
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    placeholder="Company or entity name"
                                    icon={<Building2 className="w-4 h-4" />}
                                />
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">About / Bio</label>
                                    <div className="relative group">
                                        <div className="absolute top-3 left-4 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <textarea 
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={4}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none"
                                            placeholder="Write a brief description about yourself or your organization..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Side Actions */}
                    <div className="space-y-8">
                        <Card className="p-6 sticky top-8">
                            <div className="space-y-4">
                                <Button 
                                    type="submit"
                                    className="w-full justify-center" 
                                    size="lg"
                                    loading={saving}
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Save Changes
                                </Button>
                                
                                {status.message && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={cn(
                                            "p-4 rounded-xl flex items-start gap-3",
                                            status.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                        )}
                                    >
                                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                        <span className="text-sm font-bold leading-tight">{status.message}</span>
                                    </motion.div>
                                )}
                            </div>

                            <hr className="my-6 border-slate-100" />

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Account Actions</p>
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={handleDeactivate}
                                >
                                    Deactivate Account
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </form>
        </motion.div>
    );
};

export default UserProfilePage;

