import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Heart, MapPin, Search, Filter, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DonationModal from '../components/DonationModal';

function CampaignsFeedPage() {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    urgency: '',
    sort_by: 'created_at'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchCampaigns = async (newFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const campaignsData = await apiService.getCampaigns(profile?.accessToken, newFilters);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [profile?.accessToken]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchCampaigns();
      return;
    }
    try {
      setLoading(true);
      const results = await apiService.searchCampaigns(profile?.accessToken, searchQuery);
      setCampaigns(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    fetchCampaigns(filters);
    setShowFilters(false);
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    const catValue = cat === 'All' ? '' : cat.toLowerCase();
    const newFilters = { ...filters, category: catValue };
    setFilters(newFilters);
    fetchCampaigns(newFilters);
  };

  const getProgressPercentage = (raised, goal) => {
    return goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  };

  const handleDonate = (campaign) => {
    if (!profile?.isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    setSelectedCampaign(campaign);
    setShowDonationModal(true);
  };

  const handleViewDetails = (campaign) => {
    if (!profile?.isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    const currentPath = window.location.pathname;
    if (currentPath.includes('/user/')) {
      navigate(`/user/campaigns/${campaign.id}`);
    } else if (currentPath.includes('/vendor/')) {
      navigate(`/vendor/campaigns/${campaign.id}`);
    } else if (currentPath.includes('/admin/')) {
      navigate(`/admin/campaigns/${campaign.id}`);
    } else {
      navigate(`/campaigns/${campaign.id}`);
    }
  };

  const categories = ['Medical', 'Food', 'Shelter', 'Education', 'Infrastructure', 'Other'];
  const urgencies = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <div className="bg-slate-50 min-h-screen pb-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto bg-slate-50 min-h-screen relative flex flex-col">

        {/* Top Section - Natural Scrolling */}
        <div className="bg-slate-50 pt-4 md:pt-6 pb-3 md:pb-4 px-4 md:px-5 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 md:mb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Discover
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                Help those in need today
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative mb-4 md:mb-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 md:w-5 h-4 md:h-5" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-4 bg-white rounded-full border border-slate-100 text-xs md:text-sm focus:outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 shadow-sm"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="w-10 md:w-12 h-10 md:h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
            >
              <Filter className="w-4 md:w-5 h-4 md:h-5" />
            </button>
          </form>

          {/* Filters Dropdown (Mobile Optimized) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Urgency</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      <button
                        onClick={() => handleFilterChange('urgency', '')}
                        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!filters.urgency ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                      >
                        All
                      </button>
                      {urgencies.map((urg) => (
                        <button
                          key={urg}
                          onClick={() => handleFilterChange('urgency', urg.toLowerCase())}
                          className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filters.urgency === urg.toLowerCase() ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                        >
                          {urg}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={applyFilters}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-200"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Pills */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
            {['All', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Feed */}
        <div className="px-4 md:px-5 pt-1 md:pt-2">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[24px] p-3 shadow-sm border border-slate-50 animate-pulse">
                  <div className="w-full h-48 bg-slate-200 rounded-[20px] mb-4"></div>
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4 ml-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4 ml-2"></div>
                  <div className="h-2 bg-slate-200 rounded-full w-full mb-4"></div>
                  <div className="flex gap-3 px-2 pb-2">
                    <div className="h-12 bg-slate-200 rounded-xl flex-1"></div>
                    <div className="h-12 bg-slate-200 rounded-xl w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-blue-200" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns found</h3>
              <p className="text-sm text-slate-500">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {campaigns.map((campaign) => {
                const progress = getProgressPercentage(campaign.raised_amount, campaign.goal_amount);
                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[20px] md:rounded-[24px] p-2 md:p-3 shadow-[0_8px_30px_rgb(219,234,254,0.4)] border border-slate-50/50"
                  >
                    {/* Card Image */}
                    <div className="relative w-full h-[140px] md:h-[200px] rounded-[16px] md:rounded-[20px] overflow-hidden mb-3 md:mb-5 bg-slate-100">
                      {campaign.cover_image ? (
                        <img
                          src={campaign.cover_image}
                          alt={campaign.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50">
                          <Heart className="w-12 h-12 text-blue-200" />
                        </div>
                      )}

                      {/* Overlay Gradients */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"></div>

                      {/* Category Badge */}
                      <div className="absolute top-4 left-4">
                        <span className="bg-white/95 backdrop-blur-md text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wide">
                          {campaign.category || 'General'}
                        </span>
                      </div>

                      {/* Urgency Badge if High/Critical */}
                      {(campaign.urgency_level === 'high' || campaign.urgency_level === 'critical') && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-red-500/95 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wide flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                            Urgent
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-2 pb-1">
                      <h3 className="text-[19px] font-bold text-slate-900 leading-snug mb-3 line-clamp-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {campaign.title}
                      </h3>

                      <div className="flex justify-between items-center text-[13px] text-slate-500 mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span className="truncate max-w-[120px]">{campaign.city}</span>
                        </div>
                        <div className="flex items-center font-medium bg-slate-50 px-2.5 py-1 rounded-lg text-slate-700">
                          Goal: ₹{campaign.goal_amount?.toLocaleString()}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-6 bg-slate-50 p-4 rounded-[16px] border border-slate-100/50">
                        <div className="flex justify-between text-sm mb-2.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <span className="font-bold text-slate-900">
                            ₹{campaign.raised_amount?.toLocaleString() || 0} <span className="text-slate-500 font-normal">raised</span>
                          </span>
                          <span className="font-semibold text-blue-600">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-blue-100/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full relative"
                            style={{ width: `${progress}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20"></div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleDonate(campaign)}
                          className="flex-1 w-full bg-blue-600 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-[0_4px_14px_rgb(37,99,235,0.3)] text-sm flex items-center justify-center gap-2"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          <Heart className="w-4 h-4 fill-white/20 flex-shrink-0" /> <span className="truncate">Donate Now</span>
                        </button>
                        <button
                          onClick={() => handleViewDetails(campaign)}
                          className="w-full sm:w-auto px-4 sm:px-6 bg-blue-50 active:bg-blue-100 text-blue-600 font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Donation Modal */}
      {showDonationModal && selectedCampaign && (
        <DonationModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowDonationModal(false);
            setSelectedCampaign(null);
          }}
          onDonationSuccess={() => {
            setShowDonationModal(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
}

export default CampaignsFeedPage;

