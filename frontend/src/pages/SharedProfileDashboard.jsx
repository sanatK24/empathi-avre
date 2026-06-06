import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Building2, Save, Trash2, CheckCircle2,
  AlertCircle, MapPin, Home, Users, Activity,
  Palette, Globe, ShieldCheck, TrendingUp,
  Package, Eye, Sparkles, Heart, History
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { updateMyProfile } from '../services/authService';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const CONTACT_CATEGORIES = ['Family', 'Friend', 'Doctor', 'Caregiver', 'Other'];
const TABS = [
  { id: 'general', label: 'General', icon: User },
  { id: 'medical', label: 'Medical Profile', icon: Heart },
  { id: 'activity', label: 'Activity', icon: TrendingUp },
  { id: 'saved_campaigns', label: 'Saved Campaigns', icon: Heart }
];
const PROFILE_FIELDS = [
  ['fullName', 'fullName'], ['email', 'email'], ['phone', 'phone'],
  ['bio', 'bio'], ['city', 'city'],
  ['address', 'address'], ['addressLine1', 'addressLine1'], ['addressLine2', 'addressLine2'],
  ['locality', 'locality'], ['stateProvince', 'stateProvince'], ['postalCode', 'postalCode'],
  ['countryCode', 'countryCode'], ['bloodGroup', 'bloodGroup'],
  ['preferredHospital', 'preferredHospital'], ['accessibilityNeeds', 'accessibilityNeeds']
];
const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
const SharedProfileDashboard = () => {
  const { profile, updateProfile, logout } = useAppContext();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', bio: '', city: '',
    address: '', addressLine1: '', addressLine2: '', locality: '', stateProvince: '',
    postalCode: '', countryCode: '', lat: null, lng: null, language: 'English',
    timezone: 'UTC+5:30', bloodGroup: '', preferredHospital: '', emergencyContacts: [],
    personalCategories: [], newCategory: '', accessibilityNeeds: '',
    newContact: { name: '', phone: '', category: 'Family' },
    currentPassword: '', newPassword: '', confirmPassword: '',
    notifications: { email: true, push: true, sms: false, urgencyAlerts: true },
    theme: 'light', privacy: 'public'
  });
  useEffect(() => {
    if (!profile?.accessToken) return;
    apiService.getSavedCampaigns(profile.accessToken)
      .then(data => setSavedCampaigns(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load saved campaigns:', err))
      .finally(() => setSavedLoading(false));
    setActivitiesLoading(true);
    apiService.getDonationHistory(profile.accessToken)
      .then(donationData => {
        const donations = (donationData || []).map(item => ({
          type: 'donation', icon: Heart,
          action: `Donated ${formatINR(item.amount)} to "${item.campaign_title || 'Humanitarian Campaign'}"`,
          date: new Date(item.created_at).toLocaleDateString(),
          details: `Status: ${item.status || 'Completed'}`
        }));
        setActivities(donations.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }).catch(err => console.error('Failed to load activities:', err))
      .finally(() => setActivitiesLoading(false));
  }, [profile?.accessToken]);
  useEffect(() => {
    if (!profile) return;
    const updates = {};
    PROFILE_FIELDS.forEach(([formKey, profileKey]) => { updates[formKey] = profile[profileKey] || ''; });
    updates.lat = profile.lat || null;
    updates.lng = profile.lng || null;
    updates.emergencyContacts = profile.emergency_contacts || [];
    updates.personalCategories = profile.personal_categories ? profile.personal_categories.split(',') : ['Medical', 'Education', 'Food'];
    setFormData(prev => ({ ...prev, ...updates }));
    loadStats();
  }, [profile]);
  const loadStats = async () => {
    try {
      const data = profile.role === 'admin'
        ? await apiService.getAdminStats(profile.accessToken)
        : await apiService.getUserStats(profile.accessToken);
      setStats(data);
    } catch (err) { console.error('Failed to load role stats:', err); }
    finally { setLoading(false); }
  };
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const setNested = (parent, field, value) => setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const handleDetectLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation is not supported by your browser.'); return; }
    setLoadingGeo(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          if (!res.ok) throw new Error('Geocoding server error');
          const { address: addr = {} } = await res.json();
          const landmark = addr.amenity || addr.building || addr.office || addr.shop || addr.tourism || addr.historic || addr.landmark || addr.leisure || addr.house_name || '';
          const road = addr.road || addr.pedestrian || '';
          const area = addr.suburb || addr.neighbourhood || addr.residential || addr.commercial || addr.industrial || addr.retail || addr.village || addr.hamlet || addr.subdivision || '';
          const line2Parts = [landmark, road, area].filter((v, i, arr) => v && arr.indexOf(v) === i);
          const line2 = line2Parts.join(', ');
          const locality = addr.suburb || addr.village || addr.neighbourhood || addr.county || '';
          const city = addr.city || addr.town || addr.village || addr.suburb || 'Mumbai';
          const state = addr.state || addr.region || '';
          const postcode = addr.postcode || '';
          const rawCC = (addr.country_code || 'IND').toUpperCase();
          const countryCode = rawCC === 'IN' ? 'IND' : rawCC.substring(0, 3);
          setFormData(prev => {
            const fullParts = [prev.addressLine1, line2, locality, city, state, postcode, countryCode].filter(Boolean);
            return { ...prev, addressLine2: line2, locality, city, stateProvince: state, postalCode: postcode, countryCode, address: fullParts.join(', '), lat: latitude, lng: longitude };
          });
        } catch (err) {
          console.error('Reverse geocoding failed', err);
          setGeoError('Could not auto-detect detailed address. You can enter it manually.');
          setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));
        } finally { setLoadingGeo(false); }
      },
      (err) => { console.error('Geolocation error', err); setGeoError('Location permission denied or lookup failed. Please enter manually.'); setLoadingGeo(false); }
    );
  };
  const handleAddContact = async () => {
    if (!formData.newContact.name || !formData.newContact.phone) return;
    setSaving(true);
    try {
      const contact = await apiService.addEmergencyContact(profile.accessToken, formData.newContact);
      setFormData(prev => ({ ...prev, emergencyContacts: [...prev.emergencyContacts, contact], newContact: { name: '', phone: '', category: 'Family' } }));
      setStatus({ type: 'success', message: 'Contact added!' });
    } catch { setStatus({ type: 'error', message: 'Failed to add contact.' }); }
    finally { setSaving(false); }
  };
  const handleDeleteContact = async (id) => {
    try {
      await apiService.deleteEmergencyContact(profile.accessToken, id);
      setFormData(prev => ({ ...prev, emergencyContacts: prev.emergencyContacts.filter(c => c.id !== id) }));
    } catch { setStatus({ type: 'error', message: 'Failed to delete contact.' }); }
  };
  const handleAddCategory = () => {
    if (!formData.newCategory || formData.personalCategories.includes(formData.newCategory)) return;
    setFormData(prev => ({ ...prev, personalCategories: [...prev.personalCategories, prev.newCategory], newCategory: '' }));
  };
  const handleRemoveCategory = (cat) => setFormData(prev => ({ ...prev, personalCategories: prev.personalCategories.filter(c => c !== cat) }));
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true); setStatus({ type: null, message: '' });
    try {
      const payload = {
        name: formData.fullName, email: formData.email, phone: formData.phone,
        bio: formData.bio, city: formData.city,
        address: formData.address, bloodGroup: formData.bloodGroup, preferredHospital: formData.preferredHospital,
        personal_categories: formData.personalCategories.join(','), accessibilityNeeds: formData.accessibilityNeeds,
        addressLine1: formData.addressLine1, addressLine2: formData.addressLine2, locality: formData.locality,
        stateProvince: formData.stateProvince, postalCode: formData.postalCode, countryCode: formData.countryCode,
        lat: formData.lat, lng: formData.lng, accessToken: profile.accessToken
      };
      const u = await updateMyProfile(payload);
      updateProfile({
        ...profile,
        fullName: u?.name || formData.fullName, email: u?.email || formData.email,
        phone: u?.phone || formData.phone,
        bio: u?.bio || formData.bio, city: u?.city || formData.city, address: u?.address || formData.address,
        bloodGroup: u?.blood_group || formData.bloodGroup, preferredHospital: u?.preferred_hospital || formData.preferredHospital,
        accessibilityNeeds: u?.accessibility_needs || formData.accessibilityNeeds,
        personal_categories: u?.personal_categories || formData.personalCategories.join(','),
        emergency_contacts: formData.emergencyContacts,
        addressLine1: formData.addressLine1, addressLine2: formData.addressLine2, locality: formData.locality,
        stateProvince: formData.stateProvince, postalCode: formData.postalCode, countryCode: formData.countryCode,
        lat: formData.lat, lng: formData.lng
      });
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      console.error('Update failed:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to update profile.' });
    } finally { setSaving(false); }
  };
  const locationFields = [
    ['Address Line 1', 'addressLine1', 'Building name, Flat/House number, Street', <Home className="w-4 h-4 text-slate-400" />],
    ['Address Line 2', 'addressLine2', 'Landmark, sector, or area', <Building2 className="w-4 h-4 text-slate-400" />]
  ];
  const locationGrid1 = [
    ['Locality', 'locality', 'Sub-neighborhood / village'],
    ['City / Town', 'city', 'City, town, or district']
  ];
  const locationGrid2 = [
    ['State / Province', 'stateProvince', 'State or region'],
    ['Postal Code (PIN/ZIP)', 'postalCode', 'e.g., 400703']
  ];
  const renderGeneralInfo = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-500" /> Personal Information
        </h3>
        <div className="space-y-6">
          <Input label="Full Name" value={formData.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Full Name" icon={<User className="w-4 h-4" />} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={formData.email} onChange={e => set('email', e.target.value)} icon={<Mail className="w-4 h-4" />} />
            <Input label="Phone" value={formData.phone} onChange={e => set('phone', e.target.value)} icon={<Phone className="w-4 h-4" />} />
          </div>
        </div>
      </Card>
      <Card className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500 animate-pulse" /> Location Profile
          </h3>
          <Button type="button" variant="secondary" size="sm" onClick={handleDetectLocation} loading={loadingGeo}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/50 hover:border-emerald-300 font-bold transition-all duration-300 shadow-sm shadow-emerald-100/50 flex items-center gap-2"
            icon={<MapPin className="w-3.5 h-3.5" />}>
            {loadingGeo ? 'Detecting...' : 'Detect Location'}
          </Button>
        </div>
        {geoError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><div>{geoError}</div>
          </motion.div>
        )}
        {formData.lat && formData.lng && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-wrap gap-4 items-center justify-between text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-700 font-bold">Coordinates Verified</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">Lat: <span className="font-mono text-slate-800">{Number(formData.lat).toFixed(6)}</span></span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">Lng: <span className="font-mono text-slate-800">{Number(formData.lng).toFixed(6)}</span></span>
            </div>
          </motion.div>
        )}
        <div className="space-y-4">
          {locationFields.map(([label, key, ph, icon]) => (
            <Input key={key} label={label} value={formData[key]} onChange={e => set(key, e.target.value)} placeholder={ph} icon={icon} />
          ))}
          {[locationGrid1, locationGrid2].map((pair, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              {pair.map(([label, key, ph]) => (
                <Input key={key} label={label} value={formData[key]} onChange={e => set(key, e.target.value)} placeholder={ph} />
              ))}
            </div>
          ))}
          <Input label="Country Code (ISO 3-Letter)" value={formData.countryCode} onChange={e => set('countryCode', e.target.value)} placeholder="e.g., IND" maxLength={3} icon={<Globe className="w-4 h-4 text-slate-400" />} />
          <input type="hidden" value={formData.address} />
        </div>
      </Card>
      <Card className="p-8 lg:col-span-2">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-500" /> Bio & Personal Statement
        </h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">About / Bio</label>
            <textarea value={formData.bio} onChange={e => set('bio', e.target.value)} rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
              placeholder="Tell us about yourself..." />
          </div>
        </div>
      </Card>
    </div>
  );
  const renderMedicalProfile = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" /> Medical Information
        </h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Blood Group</label>
            <select value={formData.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none">
              <option value="">Select Blood Group</option>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <Input label="Preferred Hospital" value={formData.preferredHospital} onChange={e => set('preferredHospital', e.target.value)} placeholder="Enter your preferred hospital" icon={<MapPin className="w-4 h-4" />} />
        </div>
      </Card>
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" /> Emergency Contacts
          </h3>
          {formData.emergencyContacts?.length > 0 && (
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">{formData.emergencyContacts.length} Added</Badge>
          )}
        </div>
        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
          {formData.emergencyContacts?.length > 0 ? formData.emergencyContacts.map((contact, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-between justify-between group hover:bg-slate-100 transition-colors">
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-sm">{contact.name}</p>
                <p className="text-xs text-slate-500 font-medium">{contact.category}</p>
                <p className="text-sm text-primary-600 font-bold mt-1">{contact.phone}</p>
              </div>
              <button onClick={() => handleDeleteContact(contact.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 rounded-lg text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )) : <p className="text-sm text-slate-500 italic">No emergency contacts added yet</p>}
        </div>
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-bold text-slate-900">Add New Contact</h4>
          <Input label="Name" value={formData.newContact.name} onChange={e => setNested('newContact', 'name', e.target.value)} placeholder="Contact name" icon={<User className="w-4 h-4" />} />
          <Input label="Phone" value={formData.newContact.phone} onChange={e => setNested('newContact', 'phone', e.target.value)} placeholder="Phone number" icon={<Phone className="w-4 h-4" />} />
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Relationship</label>
            <select value={formData.newContact.category} onChange={e => setNested('newContact', 'category', e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none">
              {CONTACT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Button onClick={handleAddContact} className="w-full" disabled={!formData.newContact.name || !formData.newContact.phone}>Add Contact</Button>
        </div>
      </Card>
      <Card className="p-8 lg:col-span-2">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" /> Personal Categories
        </h3>
        <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
          Define the topics and service areas you care about. These categories influence your feed and emergency discovery.
        </p>
        <div className="flex flex-wrap gap-2 mb-8">
          <AnimatePresence>
            {formData.personalCategories.map(cat => (
              <motion.div key={cat} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Badge variant="ghost" className="bg-primary-50 text-primary-700 border border-primary-100 flex items-center gap-1 py-1.5">
                  {cat}
                  <Trash2 className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" onClick={() => handleRemoveCategory(cat)} />
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="New category (e.g. Yoga, Cancer Care)" value={formData.newCategory} onChange={e => set('newCategory', e.target.value)} className="flex-grow" />
          <Button size="icon" onClick={handleAddCategory}><Sparkles className="w-4 h-4" /></Button>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-50">
          <Input label="Alert Threshold Distance (km)" type="number" placeholder="20" icon={<MapPin className="w-4 h-4" />} />
        </div>
      </Card>
    </div>
  );
  const renderActivitySummary = () => {
    const roleStats = {
      user: [
        { label: 'Active Campaigns', value: stats?.active_requests || stats?.active_campaigns || 0, icon: Activity, color: 'text-primary-500' },
        { label: 'Impact Score', value: stats?.impact_score || 0, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'Lives Affected', value: stats?.lives_affected || 0, icon: Heart, color: 'text-rose-500' }
      ],
      admin: [
        { label: 'Audits Performed', value: stats?.audits_count || 0, icon: ShieldCheck, color: 'text-primary-500' },
        { label: 'Moderations', value: stats?.moderations_count || 0, icon: AlertCircle, color: 'text-amber-500' },
        { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-emerald-500' }
      ]
    };
    const currentStats = profile.role === 'admin' ? roleStats.admin : roleStats.user;
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {currentStats.map((s, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                <div className={cn("p-2 rounded-lg bg-slate-50", s.color)}><s.icon className="w-4 h-4" /></div>
              </div>
              <h4 className="text-2xl font-black text-slate-900">{s.value}</h4>
            </Card>
          ))}
        </div>
        <Card className="p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" /> Recent Account Activity & Transactions
          </h3>
          <div className="space-y-6">
            {activitiesLoading ? (
              <div className="text-center py-4 text-slate-500 font-medium">Loading transaction log...</div>
            ) : activities.length > 0 ? activities.map((act, i) => (
              <div key={i} className="flex items-center justify-between pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-xl text-white shadow-sm shrink-0", act.type === 'donation' ? "bg-emerald-500" : "bg-primary-500")}>
                    <act.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{act.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 font-semibold">{act.date}</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <p className="text-xs text-slate-400 font-semibold">{act.details}</p>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400 italic">
                <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                No recent activity or transactions found.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };
  const renderSavedCampaigns = () => (
    <Card className="p-8">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Heart className="w-5 h-5 text-rose-500" /> Saved Campaigns
      </h3>
      {savedLoading ? (
        <div className="text-center py-8"><p className="text-slate-500">Loading...</p></div>
      ) : savedCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500">No saved campaigns yet</p>
          <p className="text-sm text-slate-400 mt-2">Save campaigns to access them later</p>
          <Button className="mt-4" onClick={() => window.location.href = '/campaigns'}>Browse Campaigns</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedCampaigns.map(campaign => (
            <div key={campaign.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/campaigns/${campaign.id}`}>
              <h4 className="font-bold text-slate-900 mb-2">{campaign.title}</h4>
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{campaign.description}</p>
              <div className="flex justify-between items-center text-sm">
                <Badge className="bg-slate-100 text-slate-600">{campaign.category}</Badge>
                <span className="text-primary-600 font-bold">₹{campaign.raised_amount?.toFixed(0) || 0} / ₹{campaign.goal_amount?.toFixed(0) || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 border-t-4 border-primary-500 border-solid rounded-full animate-spin"></div>
        <p className="text-lg font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing EmpathI Neural Profile...</p>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto px-4 pb-20">
      {}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-primary-gradient flex items-center justify-center text-white font-black text-2xl md:text-3xl shadow-xl shadow-primary-500/20 group-hover:scale-105 transition-transform">
              {formData.fullName.charAt(0) || 'U'}
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-primary-500 transition-colors">
              <Palette className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
          <div className="text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight uppercase">{formData.fullName || 'Guest User'}</h1>
              <Badge variant={profile.isVerified ? 'success' : 'secondary'} className="h-6">
                {profile.isVerified ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                {profile.role === 'admin' ? 'Admin' : 'User'}
              </Badge>
            </div>
            <p className="text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2 text-sm"><Mail className="w-4 h-4" />{formData.email}</p>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
              <Badge variant="ghost" className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border border-slate-100">Status: Active</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button variant="secondary" fullWidth className="md:w-auto shadow-none border-slate-100 h-12" icon={<Eye className="w-4 h-4" />}
            onClick={() => setStatus({ type: 'info', message: 'Generating public preview... Your profile is currently set to public.' })}>
            Preview
          </Button>
          <Button variant="primary" fullWidth className="md:w-auto h-12" icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
      {}
      <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
              activeTab === tab.id ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      {}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {activeTab === 'general' && renderGeneralInfo()}
            {activeTab === 'medical' && renderMedicalProfile()}
            {activeTab === 'activity' && renderActivitySummary()}
            {activeTab === 'saved_campaigns' && renderSavedCampaigns()}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-200">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">EmpathI Profile Engine v1.2 • End-to-End Encrypted</p>
      </div>
      {}
      <AnimatePresence>
        {status.message && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={cn("fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50",
              status.type === 'success' ? "bg-slate-900 text-white" : "bg-red-600 text-white")}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-tight">{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default SharedProfileDashboard;
