import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Siren, MapPin, Phone, Shield, Navigation, Search, 
  AlertTriangle, Zap, Heart, Droplets, Activity, Truck,
  ChevronRight, PhoneCall, ExternalLink, Info, Filter,
  Stethoscope, Cross, Tent, LifeBuoy, User, Clock, Star
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { cn } from '../utils/cn';

const SOS_ACTIONS = [
    { id: 'police', label: 'Police', phone: '100', icon: Shield, color: 'bg-blue-600', text: 'text-white' },
    { id: 'ambulance', label: 'Ambulance', phone: '102', icon: Truck, color: 'bg-red-600', text: 'text-white' },
    { id: 'fire', label: 'Fire Dept', phone: '101', icon: Siren, color: 'bg-orange-600', text: 'text-white' },
    { id: 'blood', label: 'Blood Bank', phone: '104', icon: Droplets, color: 'bg-rose-600', text: 'text-white' },
    { id: 'disaster', label: 'Disaster', phone: '108', icon: LifeBuoy, color: 'bg-indigo-600', text: 'text-white' },
    { id: 'women', label: 'Women Info', phone: '1091', icon: Heart, color: 'bg-pink-600', text: 'text-white' },
];

const FACILITY_TABS = [
    { id: 'Hospital', label: 'Hospitals', icon: Cross },
    { id: 'Trauma Center', label: 'Emergency Care', icon: Activity },
    { id: 'Blood Bank', label: 'Blood Banks', icon: Droplets },
    { id: 'Clinic', label: 'Clinics', icon: Stethoscope },
];

const EmergencyHub = () => {
    const { profile } = useAppContext();
    const [helplines, setHelplines] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [loadingDir, setLoadingDir] = useState(true);
    const [loadingFac, setLoadingFac] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Hospital');
    const [userLocation, setUserLocation] = useState(null);
    const [locationName, setLocationName] = useState(null);
    const [fullAddress, setFullAddress] = useState(null);
    const [locError, setLocError] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [watchId, setWatchId] = useState(null);

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
            const data = await response.json();
            if (data && data.display_name) {
                setFullAddress(data.display_name);
                const addr = data.address;
                const shortName = addr.suburb || addr.neighbourhood || addr.road || addr.city || addr.town;
                const city = addr.city || addr.town || addr.village || addr.state;
                setLocationName(shortName ? `${shortName}, ${city}` : data.display_name);
            }
        } catch (err) {
            console.error("Reverse geocode failed:", err);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setLocError("Geolocation is not supported by your browser.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                setLocError(null);
                setIsLocating(false);
                fetchNearby(loc);
                reverseGeocode(loc.lat, loc.lng);
            },
            (err) => {
                console.error("Geo error:", err);
                setLocError("Location access denied. Using profile city.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        // Start watching location persistently for SOS situations
        if (navigator.geolocation) {
            const id = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(newLoc);
                    setLocError(null);
                    // Only reverse geocode if location changed significantly (approx ~100m)
                    // For simplicity, just geocode every time it changes for now or debounce
                },
                (err) => console.error("WatchPosition error:", err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            setWatchId(id);
        }

        // Initial fetch
        handleGetLocation();
        fetchDirectory();

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [profile.city, profile.accessToken]);

    useEffect(() => {
        if (userLocation) {
            reverseGeocode(userLocation.lat, userLocation.lng);
        }
    }, [userLocation?.lat, userLocation?.lng]);

    const fetchDirectory = async () => {
        try {
            setLoadingDir(true);
            const data = await apiService.getHelplines(profile.accessToken, profile.city);
            setHelplines(data || []);
        } catch (err) {
            console.error("Failed to fetch helplines:", err);
        } finally {
            setLoadingDir(false);
        }
    };

    const fetchNearby = async (location) => {
        try {
            setLoadingFac(true);
            const params = {
                city: profile.city,
                lat: location?.lat,
                lng: location?.lng,
                type: activeTab
            };
            const data = await apiService.getFacilities(profile.accessToken, params);
            setFacilities(data || []);
        } catch (err) {
            console.error("Failed to fetch facilities:", err);
        } finally {
            setLoadingFac(false);
        }
    };

    // Re-fetch when tab changes or location updates
    useEffect(() => {
        if (userLocation) {
            fetchNearby(userLocation);
        }
    }, [activeTab, userLocation?.lat, userLocation?.lng]);

    const filteredHelplines = helplines.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSOS = (label, phone) => {
        if (window.confirm(`Initiate emergency call to ${label} (${phone})?`)) {
            window.location.href = `tel:${phone}`;
        }
    };

    const renderSOSGrid = () => (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {SOS_ACTIONS.map(action => (
                <motion.div
                    key={action.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSOS(action.label, action.phone)}
                    className={cn(
                        "p-6 rounded-3xl cursor-pointer shadow-premium text-center flex flex-col items-center gap-3 transition-shadow",
                        action.color, action.text
                    )}
                >
                    <action.icon className="w-8 h-8" />
                    <span className="font-black text-sm uppercase tracking-tighter leading-none">{action.label}</span>
                </motion.div>
            ))}
        </section>
    );

    const renderFacilities = () => (
        <div className="lg:col-span-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-1">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <MapPin className="w-6 h-6 text-red-600" />
                            Nearby Medical Centers
                        </h2>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className={cn(
                                "rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 h-9 border-none bg-slate-100",
                                isLocating && "animate-pulse bg-red-50 text-red-600"
                            )}
                            onClick={handleGetLocation}
                            disabled={isLocating}
                            icon={isLocating ? <Clock className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                        >
                            {isLocating ? 'Detecting...' : 'Detect My Location'}
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-500 font-medium text-sm">
                            {userLocation 
                                ? (locationName ? `Live Tracking: ${locationName}` : `Live Tracking: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`)
                                : "Discovery based on profile city"}
                        </p>
                        {locError && (
                            <span className="text-amber-600 text-xs font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                <AlertTriangle className="w-3 h-3" /> {locError}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shrink-0">
                    {FACILITY_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                                activeTab === tab.id 
                                ? "bg-white text-red-600 shadow-sm" 
                                : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingFac ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl" />
                    ))
                ) : facilities.map((fac, i) => (
                    <motion.div
                        key={fac.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card className="h-full group hover:ring-2 hover:ring-red-500/20 transition-all border-none ring-1 ring-slate-100 shadow-soft overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant={fac.is_verified ? "success" : "secondary"}>
                                            {fac.facility_type}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            <span className="text-xs font-bold">{fac.rating}</span>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 mb-1 leading-tight">{fac.name}</h4>
                                    <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mb-4">
                                        <MapPin className="w-3 h-3" /> {fac.address}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fac.operating_hours || '24/7'}</span>
                                        {fac.distance_km !== null && (
                                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{fac.distance_km} km away</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button 
                                            className="flex-1 bg-red-600 hover:bg-red-700" 
                                            size="sm" 
                                            icon={<PhoneCall className="w-4 h-4" />}
                                            onClick={() => fac.phone && (window.location.href = `tel:${fac.phone}`)}
                                            disabled={!fac.phone}
                                        >
                                            Call
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="flex-1" 
                                            size="sm" 
                                            icon={<Navigation className="w-4 h-4" />}
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fac.name + ' ' + fac.address)}`, '_blank')}
                                        >
                                            Map
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
                
                {!loadingFac && facilities.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                         <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                         <p className="text-slate-500 font-bold">No {activeTab}s found in your area.</p>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Try expanding your search or selecting a different city.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderDirectory = () => (
        <Card className="shadow-premium border-none">
            <CardContent className="p-0">
                <div className="p-8 border-b border-slate-50">
                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-red-500" />
                        Universal Helpline Directory
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search Police, Ambulance, Blood Bank..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-500/10 font-bold text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                    {loadingDir ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="p-6 flex items-center gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                                <div className="flex-grow space-y-2">
                                    <div className="h-4 bg-slate-100 w-1/3 rounded" />
                                    <div className="h-3 bg-slate-100 w-1/4 rounded" />
                                </div>
                            </div>
                        ))
                    ) : filteredHelplines.map((h, i) => (
                        <div 
                            key={h.id} 
                            className="p-6 border-b border-slate-50 hover:bg-slate-50/50 transition-colors group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/10",
                                    h.is_pinned ? "bg-red-600" : "bg-slate-800"
                                )}>
                                    {h.is_pinned ? <AlertTriangle className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h5 className="font-black text-slate-900 uppercase tracking-tight leading-none">{h.name}</h5>
                                        {h.is_pinned && <Badge className="bg-red-50 text-red-600 border-none scale-90">Priority</Badge>}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.category} • {h.city}</p>
                                    <p className="text-sm font-black text-red-600 mt-2 font-mono tracking-tighter">{h.phone}</p>
                                </div>
                            </div>
                            <Button 
                                size="icon" 
                                variant="secondary" 
                                className="rounded-2xl"
                                onClick={() => handleSOS(h.name, h.phone)}
                            >
                                <PhoneCall className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    
                    {!loadingDir && filteredHelplines.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                             <Phone className="w-8 h-8 mx-auto mb-2 opacity-20" />
                             <p className="text-sm font-bold">No contacts found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderMyEmergency = () => (
        <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black flex items-center gap-2">
                        <User className="w-5 h-5 text-red-500" />
                        My Emergency Network
                    </h3>
                    <Button variant="ghost" className="text-white/50 hover:text-white" size="sm" onClick={() => window.location.href='/profile?tab=role'}>Manage</Button>
                </div>
                
                <div className="space-y-4">
                    {profile.emergency_contacts?.length > 0 ? (
                        profile.emergency_contacts.map(contact => (
                            <div key={contact.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Heart className="w-4 h-4 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-tight leading-none mb-1">{contact.name}</p>
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{contact.category}</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="w-10 h-10 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl" onClick={() => handleSOS(contact.name, contact.phone)}>
                                    <PhoneCall className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    ) : profile.emergencyContactName ? (
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-black uppercase tracking-tight">{profile.emergencyContactName}</p>
                                    <p className="text-xs text-white/50 font-bold">{profile.emergencyContactPhone}</p>
                                </div>
                            </div>
                            <Button size="icon" className="bg-red-600 hover:bg-red-700" onClick={() => handleSOS(profile.emergencyContactName, profile.emergencyContactPhone)}>
                                <PhoneCall className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm text-white/30 italic mb-4">No personal contacts saved.</p>
                            <Button variant="outline" className="border-white/20 text-white hover:bg-white/5" size="sm" onClick={() => window.location.href='/profile?tab=role'}>Add Contact</Button>
                        </div>
                    )}

                    <div className="mt-4 p-5 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                         <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Medical Profile</h5>
                         <div className="flex items-center gap-4">
                             <div className="flex flex-col">
                                 <span className="text-[10px] text-white/50 uppercase font-black">Blood Group</span>
                                 <span className="text-xl font-black text-white">{profile.bloodGroup || 'N/A'}</span>
                             </div>
                             <div className="w-px h-8 bg-white/10 mx-1" />
                             <div className="flex flex-col overflow-hidden">
                                 <span className="text-[10px] text-white/50 uppercase font-black">Preferred Hospital</span>
                                 <span className="text-sm font-bold text-white truncate">{profile.preferredHospital || 'None set'}</span>
                             </div>
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (!userLocation && !locError && !isLocating) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-premium border border-slate-100"
                >
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Navigation className="w-10 h-10 text-red-600 animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Location Locked</h2>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                        To provide life-saving assistance, we need your real-time coordinates to find the nearest responders and medical centers.
                    </p>
                    <Button 
                        onClick={handleGetLocation}
                        className="w-full py-6 bg-red-600 hover:bg-red-700 text-lg font-black uppercase tracking-widest shadow-xl shadow-red-500/20 rounded-2xl"
                    >
                        Allow GPS Access
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-12 pb-20 px-4"
        >
            {/* Massive Premium Header */}
            <div className="bg-red-600 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl -ml-32 -mb-32"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-2 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                <Siren className="w-4 h-4 animate-pulse" /> Emergency Hub Active
                            </div>
                            <button 
                                onClick={handleGetLocation}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                            >
                                <Navigation className={cn("w-4 h-4", isLocating && "animate-spin")} /> 
                                {isLocating ? 'Locating...' : 'Refresh Location'}
                            </button>
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter leading-tight max-w-2xl">
                            Immediate Assistance <br/> Is Just One Tap Away.
                        </h1>
                        
                        <div className="space-y-2 max-w-lg">
                            <p className="text-red-100 font-bold text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                {locationName || 'Detecting Area...'}
                            </p>
                            {fullAddress && (
                                <p className="text-red-200/60 text-xs font-medium leading-relaxed italic">
                                    {fullAddress}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleSOS('Main SOS', '112')}
                            className="w-40 h-40 md:w-56 md:h-56 bg-white rounded-full flex items-center justify-center text-red-600 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative group overflow-hidden shrink-0"
                        >
                            <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="flex flex-col items-center relative z-10">
                                <span className="font-display font-black text-4xl md:text-6xl uppercase tracking-tighter">SOS</span>
                                <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-50">Call 112</span>
                            </div>
                            <div className="absolute inset-0 border-[10px] border-red-100/30 rounded-full animate-ping opacity-25"></div>
                            <div className="absolute inset-0 border-2 border-red-100/50 rounded-full scale-110"></div>
                        </motion.button>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 animate-bounce">Tap for Universal SOS</p>
                    </div>
                </div>
            </div>

            {renderSOSGrid()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-12">
                    {renderFacilities()}
                </div>

                {/* Sidebar Directory and Contacts */}
                <div className="lg:col-span-4 space-y-10">
                    {renderMyEmergency()}
                    {renderDirectory()}

                    {/* Quick Guidance */}
                    <Card className="bg-emerald-50 border-emerald-100 overflow-hidden relative">
                         <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                         <CardContent className="p-8">
                             <h4 className="font-black text-emerald-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                                 <Zap className="w-5 h-5 text-emerald-600" />
                                 Emergency Protocol
                             </h4>
                             <ul className="space-y-4">
                                 {[
                                     "Stay calm and secure your surroundings.",
                                     "Provide clear landmark info to responders.",
                                     "Keep your phone line free for incoming help.",
                                     "Medical records are automatically shared."
                                 ].map((step, i) => (
                                     <li key={i} className="flex gap-3 text-sm font-bold text-emerald-700 leading-snug">
                                         <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-black">{i+1}</span>
                                         {step}
                                     </li>
                                 ))}
                             </ul>
                         </CardContent>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
};

export default EmergencyHub;
