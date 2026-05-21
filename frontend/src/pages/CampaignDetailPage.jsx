import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import SaveCampaignButton from '../components/SaveCampaignButton';
import CampaignUpdatesSection from '../components/CampaignUpdatesSection';
import { motion } from 'framer-motion';
import {
  Heart,
  MapPin,
  Calendar,
  Users,
  Share2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  MessageSquare,
  Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DonationModal from '../components/DonationModal';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/formatNumber';
import { handleImageError, getFallbackImage } from '../utils/imageUtils';

function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, triggerStatsRefresh } = useAppContext();

  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [relatedCampaigns, setRelatedCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState({ title: '', content: '' });
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, updates, donors

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignData, donationsData, updatesData, relatedData, statsData] = await Promise.all([
        apiService.getCampaignDetails(profile?.accessToken, id),
        apiService.getCampaignDonations(profile?.accessToken, id),
        apiService.getCampaignUpdates(profile?.accessToken, id).catch(() => []),
        apiService.getRelatedCampaigns(profile?.accessToken, id).catch(() => []),
        apiService.getCampaignStats(profile?.accessToken, id).catch(() => null)
      ]);

      setCampaign(campaignData);
      setDonations(Array.isArray(donationsData) ? donationsData : []);
      setUpdates(Array.isArray(updatesData) ? updatesData : []);
      setRelatedCampaigns(Array.isArray(relatedData) ? relatedData : []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load campaign:', err);
      setError(err.message || 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    if (id) {
      fetchCampaignData();
    }
  }, [profile?.isAuthenticated, id]);

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.title.trim() || !newUpdate.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setPostingUpdate(true);
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/campaigns/${id}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile?.accessToken}`
        },
        body: JSON.stringify(newUpdate)
      });

      setNewUpdate({ title: '', content: '' });
      fetchCampaignData(); // Refresh
    } catch (err) {
      console.error('Failed to post update:', err);
      setError('Failed to post update');
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!window.confirm('Delete this update?')) return;

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/campaigns/${id}/updates/${updateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${profile?.accessToken}` }
      });
      fetchCampaignData();
    } catch (err) {
      console.error('Failed to delete update:', err);
    }
  };

  const getBackPath = () => {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/user/')) return '/user/campaigns';
    if (currentPath.includes('/vendor/')) return '/vendor/dashboard';
    if (currentPath.includes('/admin/')) return '/admin/campaigns';
    return '/campaigns';
  };

  const handleRelatedClick = (relatedId) => {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/user/')) navigate(`/user/campaigns/${relatedId}`);
    else if (currentPath.includes('/vendor/')) navigate(`/vendor/campaigns/${relatedId}`);
    else if (currentPath.includes('/admin/')) navigate(`/admin/campaigns/${relatedId}`);
    else navigate(`/campaigns/${relatedId}`);
  };

  if (loading) {
    return (
      <section className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-slate-200 rounded-lg"></div>
          <div className="h-32 bg-slate-200 rounded-lg"></div>
        </div>
      </section>
    );
  }

  if (!campaign) {
    return (
      <section className="p-6 max-w-6xl mx-auto">
        <button
          onClick={() => navigate(getBackPath())}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Campaigns
        </button>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Campaign not found</h2>
        </div>
      </section>
    );
  }

  const progress = (campaign.raised_amount / campaign.goal_amount) * 100;
  const isCreator = profile?.id === campaign.created_by;
  const isFunded = campaign.raised_amount >= campaign.goal_amount;

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[urgency] || colors.medium;
  };

  const isInDashboard = window.location.pathname.includes('/user/') || 
                       window.location.pathname.includes('/vendor/') || 
                       window.location.pathname.includes('/admin/');

  return (
    <section className={cn("bg-slate-50 min-h-screen", isInDashboard && "bg-transparent min-h-0")}>
      {/* Header Navigation - Hide if in dashboard */}
      {!isInDashboard && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <button
              onClick={() => navigate(getBackPath())}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <ArrowLeft size={20} />
              Back to Campaigns
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3"
          >
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <div className="text-red-800">{error}</div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Image & Title */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {campaign.cover_image ? (
                <div className="relative aspect-[16/9] md:aspect-auto md:h-96 overflow-hidden rounded-3xl shadow-xl">
                  <img
                    src={campaign.cover_image}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError(campaign.category)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                </div>
              ) : (
                <div className="w-full aspect-[16/9] md:aspect-auto md:h-96 bg-primary-gradient rounded-3xl flex items-center justify-center shadow-xl">
                  <Heart size={64} className="text-white opacity-50" />
                </div>
              )}
            </motion.div>

            {/* Title & Meta */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-1 space-y-4">
                  <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight leading-tight uppercase break-words">{campaign.title}</h1>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", getUrgencyColor(campaign.urgency_level))}>
                      {campaign.urgency_level}
                    </Badge>
                    {campaign.verified && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase tracking-widest flex-shrink-0">✓ Verified</Badge>
                    )}
                    <span className="text-sm font-bold text-slate-400 break-words w-full sm:w-auto">
                      BY <button
                        onClick={() => navigate(`/user/profiles/${campaign.created_by}`)}
                        className="text-slate-900 font-black hover:text-primary-500 transition-colors uppercase"
                      >
                        {campaign.creator_name || 'Anonymous'}
                      </button>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.isAuthenticated && (
                    <SaveCampaignButton campaignId={campaign.id} token={profile.accessToken} />
                  )}
                  {isCreator && (
                    <>
                      <button className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0">
                        <Edit size={20} className="text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0">
                        <Share2 size={20} className="text-slate-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Progress Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[2rem] p-8 border-none ring-1 ring-slate-100 shadow-soft">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raised</p>
                  <p className="text-3xl font-display font-black text-primary-500 tracking-tight">{formatCurrency(campaign.raised_amount || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Goal</p>
                  <p className="text-3xl font-display font-black text-slate-900 tracking-tight">{formatCurrency(campaign.goal_amount || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                  <p className="text-3xl font-display font-black text-slate-900 tracking-tight">{Math.round(progress)}%</p>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-6">
                <motion.div
                  className="bg-primary-gradient h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>

              {stats && (
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {stats.unique_donors || 0} Supporters</span>
                  <span className="flex items-center gap-1.5"><Heart className="w-3 h-3" /> {stats.total_donations || 0} Donations</span>
                </div>
              )}
            </motion.div>

            {/* Tabs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex gap-2 sm:gap-4 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
                {['overview', 'updates', 'donors'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 sm:px-4 py-3 font-medium transition-colors text-sm sm:text-base ${
                      activeTab === tab
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-6 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">About this campaign</h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
                  </div>

                  <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">Campaign Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Category</p>
                        <p className="font-medium text-slate-900">{campaign.category}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Location</p>
                        <p className="font-medium text-slate-900 flex items-center gap-2">
                          <MapPin size={16} />
                          {campaign.city}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Created</p>
                        <p className="font-medium text-slate-900">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {campaign.deadline && (
                        <div>
                          <p className="text-slate-600">Deadline</p>
                          <p className="font-medium text-slate-900 flex items-center gap-2">
                            <Calendar size={16} />
                            {new Date(campaign.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Updates Tab */}
              {activeTab === 'updates' && (
                <CampaignUpdatesSection 
                  campaignId={campaign.id} 
                  isCreator={isCreator}
                  onUpdateCreated={fetchCampaignData}
                />
              )}

              {/* Donors Tab */}
              {activeTab === 'donors' && (
                <div>
                  {donations.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                      <Heart size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-600">No public donations yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {donations.map((donation) => (
                        <motion.div
                          key={donation.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white rounded-lg p-4 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                              {donation.donor_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{donation.donor_name}</p>
                              {donation.donor_city && (
                                <p className="text-xs text-slate-600">{donation.donor_city}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">₹{donation.amount?.toFixed(0)}</p>
                            {donation.message && (
                              <p className="text-xs text-slate-500 italic">"{donation.message}"</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Donation Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
              className="sticky bottom-6 md:static z-50"
            >
              <Button
                onClick={() => setShowDonationModal(true)}
                disabled={isFunded}
                className="w-full h-16 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary-500/40 flex items-center justify-center gap-3 border-4 border-white md:border-none"
              >
                <Heart size={20} className="fill-white" />
                {isFunded ? 'Goal Achieved' : 'Support This Cause'}
              </Button>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-lg p-6 border border-slate-200 space-y-4"
            >
              <h3 className="font-semibold text-slate-900">Campaign Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Donations</span>
                  <span className="font-semibold">{stats?.total_donations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Avg Donation</span>
                  <span className="font-semibold">₹{stats?.average_donation?.toFixed(0) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Unique Donors</span>
                  <span className="font-semibold">{stats?.unique_donors || 0}</span>
                </div>
              </div>
            </motion.div>

            {/* Related Campaigns */}
            {relatedCampaigns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-lg p-6 border border-slate-200"
              >
                <h3 className="font-semibold text-slate-900 mb-4">Related Campaigns</h3>
                <div className="space-y-3">
                  {relatedCampaigns.map((related) => (
                    <motion.button
                      key={related.id}
                      onClick={() => handleRelatedClick(related.id)}
                      whileHover={{ scale: 1.02 }}
                      className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <p className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">
                        {related.title}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin size={12} />
                        {related.city}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Donation Modal */}
      {showDonationModal && (
        <DonationModal
          campaign={campaign}
          onClose={() => setShowDonationModal(false)}
          onDonationSuccess={() => {
            setShowDonationModal(false);
            fetchCampaignData();
            triggerStatsRefresh();
          }}
        />
      )}
    </section>
  );
}

export default CampaignDetailPage;
