import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Heart, MapPin, AlertCircle, Search, Filter, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
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

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[urgency] || colors.medium;
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
    // Navigate relatively if in a dashboard context, or globally if public
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

  if (loading && campaigns.length === 0) {
    return (
      <section className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="section-head mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
            <p className="text-slate-600 mt-2">Support communities and causes that need help</p>
          </div>
          {profile?.isAuthenticated && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/user/campaigns/my')}
                className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-5"
              >
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
                My Campaigns
              </Button>
              <Button
                onClick={() => navigate('/user/campaigns/create')}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Campaign
              </Button>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns by title or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Urgency</label>
                <select
                  value={filters.urgency}
                  onChange={(e) => handleFilterChange('urgency', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">All Urgencies</option>
                  {urgencies.map((urg) => (
                    <option key={urg} value={urg.toLowerCase()}>
                      {urg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="created_at">Latest</option>
                  <option value="raised_amount">Most Funded</option>
                  <option value="urgency_level">Urgent First</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={applyFilters}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <Heart size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No campaigns found</h3>
          <p className="text-slate-600">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const progress = getProgressPercentage(campaign.raised_amount, campaign.goal_amount);
            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200 overflow-hidden flex flex-col"
              >
                {/* Cover Image Placeholder */}
                {campaign.cover_image ? (
                  <img
                    src={campaign.cover_image}
                    alt={campaign.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <Heart size={32} className="text-white opacity-50" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Title & Badges */}
                  <div className="mb-3">
                    <div className="flex gap-2 items-start mb-2">
                      <h3 className="font-bold text-slate-900 text-lg flex-1 line-clamp-2">
                        {campaign.title}
                      </h3>
                      {campaign.verified && (
                        <Badge className="bg-green-100 text-green-800 text-xs whitespace-nowrap">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <Badge className={`${getUrgencyColor(campaign.urgency_level)} text-xs w-fit`}>
                      {campaign.urgency_level.charAt(0).toUpperCase() + campaign.urgency_level.slice(1)}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {campaign.description}
                  </p>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    <MapPin size={16} />
                    {campaign.city}
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-900">₹{campaign.raised_amount?.toFixed(0) || 0}</span>
                      <span className="text-slate-600">₹{campaign.goal_amount?.toFixed(0) || 0}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{Math.round(progress)}% funded</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => handleDonate(campaign)}
                      variant="outline"
                      className="flex-1"
                    >
                      Donate
                    </Button>
                    <Button
                      onClick={() => handleViewDetails(campaign)}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
            // Refresh campaigns to show updated raised amount
            fetchCampaigns();
          }}
        />
      )}
    </section>
  );
}

export default CampaignsFeedPage;
