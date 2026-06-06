import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Heart, MapPin, Search, Filter, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DonationModal from '../components/DonationModal';
import { handleImageError } from '../utils/imageUtils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ProgressBar from '../components/ProgressBar';
const URGENCY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };
const URGENCIES = ['Low', 'Medium', 'High', 'Critical'];
const FONT_POPPINS = { fontFamily: 'Poppins, sans-serif' };
const FONT_INTER = { fontFamily: 'Inter, sans-serif' };
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function extractCategories(fetched) {
  return Array.from(new Set(fetched.map(c => c.category).filter(Boolean)));
}
function CampaignsFeedPage() {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ category: '', city: '', urgency: '', sort_by: 'created_at' });
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const filteredCampaigns = React.useMemo(() => {
    const result = campaigns.filter(c => {
      if (!profile?.lat || !profile?.lng || !c.lat || !c.lng) return true;
      const d = calculateDistance(profile.lat, profile.lng, c.lat, c.lng);
      return profile?.proximityThreshold ? d <= profile.proximityThreshold : true;
    });
    result.sort((a, b) => (URGENCY_WEIGHT[b.urgency_level?.toLowerCase()] || 0) - (URGENCY_WEIGHT[a.urgency_level?.toLowerCase()] || 0));
    return result;
  }, [campaigns, profile?.lat, profile?.lng, profile?.proximityThreshold]);
  const fetchCampaigns = async (newFilters = filters) => {
    try {
      setLoading(true); setError(null);
      const data = await apiService.getCampaigns(profile?.accessToken, newFilters);
      const fetched = Array.isArray(data) ? data : [];
      setCampaigns(fetched);
      if (!newFilters.category) setDynamicCategories(extractCategories(fetched));
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally { setLoading(false); }
  };
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(urlSearch); setLoading(true); setError(null);
      apiService.searchCampaigns(profile?.accessToken, urlSearch)
        .then(r => { const f = Array.isArray(r) ? r : []; setCampaigns(f); setDynamicCategories(extractCategories(f)); })
        .catch(err => setError(err.message || 'Search failed'))
        .finally(() => setLoading(false));
    } else { fetchCampaigns(); }
  }, [profile?.accessToken, searchParams]);
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) { fetchCampaigns(); return; }
    try {
      setLoading(true);
      const r = await apiService.searchCampaigns(profile?.accessToken, searchQuery);
      const fetched = Array.isArray(r) ? r : [];
      setCampaigns(fetched);
      setDynamicCategories(extractCategories(fetched));
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally { setLoading(false); }
  };
  const handleFilterChange = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const applyFilters = () => { fetchCampaigns(filters); setShowFilters(false); };
  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    const newFilters = { ...filters, category: cat === 'All' ? '' : cat.toLowerCase() };
    setFilters(newFilters);
    fetchCampaigns(newFilters);
  };
  const requireAuth = (cb) => {
    if (!profile?.isAuthenticated) { navigate('/login', { state: { from: window.location.pathname } }); return; }
    cb();
  };
  const handleDonate = (campaign) => requireAuth(() => { setSelectedCampaign(campaign); setShowDonationModal(true); });
  const handleViewDetails = (campaign) => requireAuth(() => {
    const p = window.location.pathname;
    navigate(p.includes('/user/') ? `/user/campaigns/${campaign.id}` : p.includes('/admin/') ? `/admin/campaigns/${campaign.id}` : `/campaigns/${campaign.id}`);
  });
  const pillClass = (active) => `whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'}`;
  const urgPillClass = (active) => `px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`;
  return (
    <div className="bg-slate-50 min-h-screen pb-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto bg-slate-50 min-h-screen relative flex flex-col">
        <div className="bg-slate-50 pt-4 md:pt-6 pb-3 md:pb-4 px-4 md:px-5 relative z-10">
          <div className="flex justify-between items-center mb-4 md:mb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900" style={FONT_POPPINS}>Discover</h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5" style={FONT_INTER}>Help those in need today</p>
            </div>
            <button onClick={() => navigate('/user/campaigns/create')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors text-sm flex items-center gap-2" style={FONT_INTER}>
              <Plus className="w-4 h-4" />Create Campaign
            </button>
          </div>
          <form onSubmit={handleSearch} className="relative mb-4 md:mb-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 md:w-5 h-4 md:h-5" />
              <input type="text" placeholder="Search campaigns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-4 bg-white rounded-full border border-slate-100 text-xs md:text-sm focus:outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 shadow-sm" style={FONT_INTER} />
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="w-10 md:w-12 h-10 md:h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all">
              <Filter className="w-4 md:w-5 h-4 md:h-5" />
            </button>
          </form>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider" style={FONT_INTER}>Urgency</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      <button onClick={() => handleFilterChange('urgency', '')} className={urgPillClass(!filters.urgency)}>All</button>
                      {URGENCIES.map(u => <button key={u} onClick={() => handleFilterChange('urgency', u.toLowerCase())} className={urgPillClass(filters.urgency === u.toLowerCase())}>{u}</button>)}
                    </div>
                  </div>
                  <button onClick={applyFilters} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-200">Apply Filters</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
            {['All', ...dynamicCategories].map(cat => (
              <button key={cat} onClick={() => handleCategoryClick(cat)} className={pillClass(activeCategory === cat)} style={FONT_INTER}>{cat}</button>
            ))}
          </div>
        </div>
        <div className="px-4 md:px-5 pt-1 md:pt-2">
          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2"><span>{error}</span></div>}
          {loading ? (
            <div className="py-20"><LoadingSpinner text="Discovering campaigns..." /></div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="py-16">
              <EmptyState icon={Heart} title="No campaigns found" message={profile?.proximityThreshold ? `No campaigns found within your ${profile.proximityThreshold} km alert radius settings. You can adjust your proximity settings in Settings.` : "Try adjusting your filters or search terms."} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {filteredCampaigns.map(campaign => {
                const progress = campaign.goal_amount > 0 ? Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100) : 0;
                const distance = calculateDistance(profile?.lat, profile?.lng, campaign.lat, campaign.lng);
                return (
                  <motion.div key={campaign.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[20px] md:rounded-[24px] p-2 md:p-3 shadow-[0_8px_30px_rgb(219,234,254,0.4)] border border-slate-50/50">
                    <div className="relative w-full h-[140px] md:h-[200px] rounded-[16px] md:rounded-[20px] overflow-hidden mb-3 md:mb-5 bg-slate-100">
                      {campaign.cover_image
                        ? <img src={campaign.cover_image} alt={campaign.title} className="w-full h-full object-cover" onError={handleImageError(campaign.category)} />
                        : <div className="w-full h-full flex items-center justify-center bg-blue-50"><Heart className="w-12 h-12 text-blue-200" /></div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"></div>
                      <div className="absolute top-4 left-4">
                        <span className="bg-white/95 backdrop-blur-md text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wide">{campaign.category || 'General'}</span>
                      </div>
                      {(campaign.urgency_level === 'high' || campaign.urgency_level === 'critical') && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-red-500/95 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wide flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>Urgent
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-2 pb-1">
                      <h3 className="text-[19px] font-bold text-slate-900 leading-snug mb-3 line-clamp-2" style={FONT_POPPINS}>{campaign.title}</h3>
                      <div className="flex justify-between items-center text-[13px] text-slate-500 mb-5" style={FONT_INTER}>
                        <div className="flex items-center gap-1.5 font-medium text-slate-500 max-w-[60%] truncate">
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate" title={`${campaign.city}${distance !== null ? ` - ${distance.toFixed(1)} km away` : ''}`}>
                            {campaign.city}
                            {distance !== null && <span className="text-[11px] text-emerald-600 font-bold ml-1">({distance.toFixed(1)} km)</span>}
                          </span>
                        </div>
                        <div className="flex items-center font-medium bg-slate-50 px-2.5 py-1 rounded-lg text-slate-700">Goal: ₹{campaign.goal_amount?.toLocaleString()}</div>
                      </div>
                      <div className="mb-6 bg-slate-50 p-4 rounded-[16px] border border-slate-100/50">
                        <div className="flex justify-between text-sm mb-2.5" style={FONT_INTER}>
                          <span className="font-bold text-slate-900">₹{campaign.raised_amount?.toLocaleString() || 0} <span className="text-slate-500 font-normal">raised</span></span>
                          <span className="font-semibold text-blue-600">{Math.round(progress)}%</span>
                        </div>
                        <ProgressBar value={progress} color="bg-blue-600" />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => handleDonate(campaign)} className="flex-1 w-full bg-blue-600 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-[0_4px_14px_rgb(37,99,235,0.3)] text-sm flex items-center justify-center gap-2" style={FONT_INTER}>
                          <Heart className="w-4 h-4 fill-white/20 flex-shrink-0" /> <span className="truncate">Donate Now</span>
                        </button>
                        <button onClick={() => handleViewDetails(campaign)} className="w-full sm:w-auto px-4 sm:px-6 bg-blue-50 active:bg-blue-100 text-blue-600 font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center" style={FONT_INTER}>View</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showDonationModal && selectedCampaign && (
        <DonationModal campaign={selectedCampaign} onClose={() => { setShowDonationModal(false); setSelectedCampaign(null); }} onDonationSuccess={() => { setShowDonationModal(false); fetchCampaigns(); }} />
      )}
    </div>
  );
}
export default CampaignsFeedPage;
