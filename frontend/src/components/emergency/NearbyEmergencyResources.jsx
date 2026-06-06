import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet'; import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Navigation, Phone, ExternalLink, Activity, AlertTriangle, Loader2, MapPin, Clock, Star } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { apiService } from '../../services/apiService';
import Button from '../ui/Button'; import Badge from '../ui/Badge'; import { cn } from '../../utils/cn';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });
const userIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const RecenterAutomatically = ({ lat, lon }) => {
    const map = useMap();
    useEffect(() => { map.setView([lat, lon]); }, [lat, lon, map]);
    return null;
};
const CATEGORIES = [{ id: 'hospital', label: 'Hospitals' }, { id: 'pharmacy', label: 'Pharmacies' }, { id: 'blood bank', label: 'Blood Banks' }, { id: 'ambulance', label: 'Ambulances' }, { id: 'clinic', label: 'Clinics' }, { id: 'fire station', label: 'Fire Dept' }];
const NearbyEmergencyResources = () => {
    const { profile } = useAppContext();
    const [userLoc, setUserLoc] = useState({ lat: profile?.lat || 19.0760, lon: profile?.lng || 72.8777 });
    const [resources, setResources] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState(null), [activeCategory, setActiveCategory] = useState('hospital'), [searchQuery, setSearchQuery] = useState(''), [mapReady, setMapReady] = useState(false), [currentPage, setCurrentPage] = useState(1), ITEMS_PER_PAGE = 5;
    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(p => setUserLoc({ lat: p.coords.latitude, lon: p.coords.longitude }), err => console.warn("Geolocation denied, using profile location or default.", err));
        setTimeout(() => setMapReady(true), 100);
    }, []);
    const fetchResources = async (keyword) => {
        if (!userLoc.lat || !userLoc.lon) return;
        setLoading(true); setError(null);
        try {
            const data = await apiService.getNearbyEmergencyResources(profile.accessToken, userLoc.lat, userLoc.lon, keyword, 3000, { timeout: 60000 });
            setResources(data.resources || []);
        } catch (err) {
            console.error("Failed to fetch nearby resources", err); setError("Could not load nearby resources right now."); setResources([]);
        } finally { setLoading(false); }
    };
    useEffect(() => {
        setCurrentPage(1);
        const timeout = setTimeout(() => fetchResources(searchQuery.trim() || activeCategory), 800);
        return () => clearTimeout(timeout);
    }, [activeCategory, searchQuery, userLoc.lat, userLoc.lon]);
    const handleCall = phone => phone && (window.location.href = `tel:${phone}`);
    const handleNavigate = (lat, lon) => window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLoc.lat},${userLoc.lon};${lat},${lon}`, '_blank');
    return (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2"><Activity className="w-4 md:w-5 h-4 md:h-5 text-red-500" />Nearby Facilities</h3>
            </div>
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 text-slate-400" />
                    <input type="text" placeholder="Search specific hospital..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl py-2 md:py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }} className={`px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === cat.id && !searchQuery ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>{cat.label}</button>
                    ))}
                </div>
            </div>
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 mb-4 md:mb-6 shrink-0 relative z-0" style={{ height: resources.length > 0 ? '200px' : '160px' }}>
                {mapReady && (
                    <MapContainer center={[userLoc.lat, userLoc.lon]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' />
                        <RecenterAutomatically lat={userLoc.lat} lon={userLoc.lon} />
                        <Marker position={[userLoc.lat, userLoc.lon]} icon={userIcon}><Popup>You are here</Popup></Marker>
                        {resources.map(res => (
                            <Marker key={res.id} position={[res.lat, res.lon]}>
                                <Popup><div className="font-bold text-sm">{res.name}</div><div className="text-xs text-slate-500">{res.distance} km away</div></Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}
            </div>
            <div className="overflow-y-auto space-y-2 md:space-y-3 no-scrollbar relative z-10">
                {loading ? (
                    <div className="flex items-center justify-center py-8 md:py-12"><Loader2 className="w-6 md:w-8 h-6 md:h-8 text-blue-500 animate-spin" /></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12 text-slate-400"><AlertTriangle className="w-6 md:w-8 h-6 md:h-8 mb-2 opacity-50" /><p className="text-xs md:text-sm font-medium text-center">{error}</p></div>
                ) : resources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12 text-slate-400"><p className="text-xs md:text-sm font-medium text-center">No results found within 3km.</p></div>
                ) : (
                    <>
                        {resources.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((res, i) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={res.id} className="p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                                <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
                                    <Badge variant="secondary" className="text-[8px] md:text-[10px] flex-shrink-0">{activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}</Badge>
                                    <div className="flex items-center gap-1 text-slate-400 flex-shrink-0"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /><span className="text-xs font-bold">4.5</span></div>
                                </div>
                                <div className="mb-2">
                                    <h4 className="font-bold text-slate-900 leading-tight text-sm md:text-base group-hover:text-blue-600 transition-colors line-clamp-2">{res.name}</h4>
                                    <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider mt-0.5">{res.distance} KM AWAY</p>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 font-medium flex items-start gap-1 mb-2 line-clamp-2"><MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" /> {res.address}</p>
                                <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-3"><Clock className="w-3 h-3 flex-shrink-0" /> 24/7</p>
                                <div className="flex items-center gap-2">
                                    {res.phone && <Button className="flex-1 bg-red-600 hover:bg-red-700 text-xs h-8" size="sm" icon={<Phone className="w-3.5 h-3.5" />} onClick={() => handleCall(res.phone)}>Call</Button>}
                                    <Button variant="outline" className="flex-1 text-xs h-8" size="sm" icon={<Navigation className="w-3.5 h-3.5" />} onClick={() => handleNavigate(res.lat, res.lon)}>Map</Button>
                                </div>
                            </motion.div>
                        ))}
                        {resources.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-center gap-2 mt-4 md:hidden">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-xs font-bold">‹</button>
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.ceil(resources.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-6 h-6 flex items-center justify-center rounded text-xs font-black transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{page}</button>
                                    ))}
                                </div>
                                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= Math.ceil(resources.length / ITEMS_PER_PAGE)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-xs font-bold">›</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
export default NearbyEmergencyResources;
