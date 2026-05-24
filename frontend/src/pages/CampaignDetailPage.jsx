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
  Target,
  Image as ImageIcon,
  Edit,
  Trash2,
  XCircle,
  Activity,
  MessageSquare,
  Clock,
  Brain
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ProgressBar';
import TabBar from '../components/ui/TabBar';
import EmptyState from '../components/ui/EmptyState';
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

  const handleCloseCampaign = async () => {
    if (!window.confirm('Are you sure you want to close this campaign? No further donations can be made.')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/campaigns/${id}/close`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${profile?.accessToken}` }
      });
      fetchCampaignData();
    } catch (err) {
      console.error('Failed to close campaign:', err);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign permanently?')) return;
    try {
      await apiService.deleteCampaign(profile.accessToken, id);
      navigate(getBackPath());
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      alert('Failed to delete campaign. It might have saved relationships or donations preventing deletion. ' + err.message);
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
    return <LoadingSpinner fullPage />;
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
  const isCreator = profile?.backendUserId ? Number(profile.backendUserId) === Number(campaign.created_by) : false;
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
      {/* Header Navigation - Always show back button */}
      <div className={cn("border-b", isInDashboard ? "bg-transparent border-transparent" : "bg-white border-slate-200")}>
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
                      <button 
                        onClick={() => navigate(`/user/campaigns/edit/${campaign.id}`)}
                        className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
                        title="Edit Campaign"
                      >
                        <Edit size={20} className="text-slate-600" />
                      </button>
                      {campaign.status !== 'COMPLETED' && (
                        <button 
                          onClick={handleCloseCampaign}
                          className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
                          title="Close Campaign"
                        >
                          <XCircle size={20} className="text-amber-500" />
                        </button>
                      )}
                      <button 
                        onClick={handleDeleteCampaign}
                        className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
                        title="Delete Campaign"
                      >
                        <Trash2 size={20} className="text-rose-500" />
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

              <ProgressBar 
                value={Math.min(progress, 100)} 
                color="bg-primary-gradient" 
                trackColor="bg-slate-100" 
                className="mb-6" 
                height="h-3"
              />

              {stats && (
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {stats.unique_donors || 0} Supporters</span>
                  <span className="flex items-center gap-1.5"><Heart className="w-3 h-3" /> {stats.total_donations || 0} Donations</span>
                </div>
              )}
            </motion.div>

            {/* Tabs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <TabBar
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'updates', label: 'Updates' },
                  { id: 'donors', label: 'Users' }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="mb-6"
              />

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
                  
                  {isCreator && campaign.ai_analysis_data && (
                    <div className="bg-white rounded-lg p-6 border border-slate-200 mt-4 border-l-4 border-l-green-500">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-green-500" />
                        AI Analysis Data (Creator Only)
                      </h3>
                      {(() => {
                        try {
                          const data = JSON.parse(campaign.ai_analysis_data);
                          return (
                            <div className="space-y-4 text-sm">
                              {data.docInsights && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                  <p className="font-bold text-slate-800 mb-2">Document Insights</p>
                                  <p className="text-slate-700 italic mb-3">{data.docInsights.insights}</p>
                                  {data.docInsights.ocr_text && (
                                    <div 
                                      className="bg-white p-3 rounded border border-slate-200 max-h-60 overflow-y-auto text-xs font-sans prose prose-sm prose-green max-w-none"
                                      dangerouslySetInnerHTML={{ __html: data.docInsights.ocr_text }}
                                    />
                                  )}
                                </div>
                              )}
                              {data.aiData && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                  <p className="font-bold text-slate-800 mb-2">Text Analysis</p>
                                  <p className="text-slate-700 whitespace-pre-wrap">{data.aiData.suggestions}</p>
                                  <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                      <span className="text-slate-500 text-xs">Extracted Goal</span>
                                      <p className="font-medium">₹{data.aiData.extracted_goal || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 text-xs">Predicted Category</span>
                                      <p className="font-medium">{data.aiData.predicted_category || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-red-500">Failed to parse AI data.</p>;
                        }
                      })()}
                    </div>
                  )}
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

              {/* Users Tab */}
              {activeTab === 'donors' && (
                <div>
                  {donations.length === 0 ? (
                    <EmptyState
                      icon={Heart}
                      title="No donations"
                      description="No public donations yet"
                      variant="dashed"
                      className="py-12"
                    />
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
                  <span className="text-slate-600">Unique Users</span>
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
