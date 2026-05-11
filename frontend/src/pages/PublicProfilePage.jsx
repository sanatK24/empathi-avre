import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Users,
  UserPlus,
  Heart,
  Share2,
  Loader2,
  AlertCircle,
  MessageSquare,
  Zap,
  TrendingUp
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/Toast';
import UnfollowConfirmationDialog from '../components/UnfollowConfirmationDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

function PublicProfilePage() {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAppContext();

  const [userProfile, setUserProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, campaignsData] = await Promise.all([
          apiService.getPublicProfile(profile?.accessToken, user_id),
          apiService.getUserCampaigns(profile?.accessToken, user_id)
        ]);

        setUserProfile(profileData);
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
        setIsFollowing(profileData.is_following);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.accessToken && user_id) {
      fetchData();
    }
  }, [profile?.accessToken, user_id]);

  const handleFollow = async () => {
    if (isFollowing) {
      setShowUnfollowDialog(true);
    } else {
      try {
        await apiService.followUser(profile.accessToken, user_id);
        setIsFollowing(true);
        setUserProfile(prev => ({
          ...prev,
          follower_count: (prev.follower_count || 0) + 1
        }));
        setToast({
          message: `You are now following ${userProfile?.name}!`,
          type: 'success'
        });
      } catch (err) {
        console.error('Failed to follow:', err);
        setToast({
          message: 'Failed to follow user',
          type: 'error'
        });
      }
    }
  };

  const handleConfirmUnfollow = async () => {
    try {
      setUnfollowLoading(true);
      await apiService.unfollowUser(profile.accessToken, user_id);
      setIsFollowing(false);
      setUserProfile(prev => ({
        ...prev,
        follower_count: (prev.follower_count || 1) - 1
      }));
      setShowUnfollowDialog(false);
    } catch (err) {
      console.error('Failed to unfollow:', err);
    } finally {
      setUnfollowLoading(false);
    }
  };

  const handleLoadDonations = async () => {
    try {
      // Fetch campaigns by this user, then get donors for each
      const userCampaigns = await apiService.getUserCampaigns(profile.accessToken, user_id);
      const allDonations = [];

      for (const campaign of userCampaigns) {
        const campaignDonations = await apiService.getCampaignDonations(profile.accessToken, campaign.id);
        for (const donation of campaignDonations) {
          allDonations.push({
            ...donation,
            campaign_title: campaign.title,
            campaign_id: campaign.id
          });
        }
      }

      setDonations(allDonations);
      setActiveTab('donations');
    } catch (err) {
      console.error('Failed to load donations:', err);
    }
  };

  const handleLoadFollowers = async () => {
    try {
      const data = await apiService.getUserFollowers(profile.accessToken, user_id);
      setFollowers(Array.isArray(data) ? data : []);
      setShowFollowers(true);
    } catch (err) {
      console.error('Failed to load followers:', err);
    }
  };

  const handleLoadFollowing = async () => {
    try {
      const data = await apiService.getUserFollowing(profile.accessToken, user_id);
      setFollowing(Array.isArray(data) ? data : []);
      setShowFollowing(true);
    } catch (err) {
      console.error('Failed to load following:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <section className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Profile not found</h2>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Header Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Campaign
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            {/* Left: Avatar & Basic Info */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-lg">
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt={userProfile.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-4xl font-black">{userProfile.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-display font-black text-slate-900 uppercase">
                  {userProfile.name}
                </h1>
                {userProfile.organization_name && (
                  <p className="text-slate-600 font-medium mt-1">{userProfile.organization_name}</p>
                )}
                {userProfile.bio && (
                  <p className="text-slate-600 mt-2 max-w-md">{userProfile.bio}</p>
                )}
                {userProfile.city && (
                  <div className="flex items-center gap-2 text-slate-600 mt-2">
                    <MapPin className="w-4 h-4" />
                    {userProfile.city}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Stats & Actions */}
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <button
                    onClick={handleLoadFollowers}
                    className="text-2xl font-black text-slate-900 hover:text-primary-500 transition-colors"
                  >
                    {userProfile.follower_count || 0}
                  </button>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Followers</p>
                </div>
                <div className="text-center">
                  <button
                    onClick={handleLoadFollowing}
                    className="text-2xl font-black text-slate-900 hover:text-primary-500 transition-colors"
                  >
                    {userProfile.following_count || 0}
                  </button>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">{userProfile.campaigns_created_count || 0}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Campaigns</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleFollow}
                  className={`flex-1 flex items-center justify-center gap-2 ${
                    isFollowing
                      ? 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-2 border-b-2 font-bold text-sm uppercase tracking-widest transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {userProfile.campaigns_created_count || 0} Campaigns
            </button>
            <button
              onClick={() => {
                setActiveTab('followers');
                handleLoadFollowers();
              }}
              className={`py-4 px-2 border-b-2 font-bold text-sm uppercase tracking-widest transition-colors ${
                activeTab === 'followers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {userProfile.follower_count || 0} Followers
            </button>
            <button
              onClick={() => {
                setActiveTab('following');
                handleLoadFollowing();
              }}
              className={`py-4 px-2 border-b-2 font-bold text-sm uppercase tracking-widest transition-colors ${
                activeTab === 'following'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {userProfile.following_count || 0} Following
            </button>
            <button
              onClick={handleLoadDonations}
              className={`py-4 px-2 border-b-2 font-bold text-sm uppercase tracking-widest transition-colors ${
                activeTab === 'donations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Donations Received
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div>
            {campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campaigns.map((campaign) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      onClick={() => navigate(`/user/campaigns/${campaign.id}`)}
                      className="cursor-pointer hover:shadow-lg transition-all border-none ring-1 ring-slate-100 overflow-hidden group"
                    >
                      <div className="h-40 bg-slate-200 overflow-hidden">
                        {campaign.cover_image ? (
                          <img
                            src={campaign.cover_image}
                            alt={campaign.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                            <Heart className="w-8 h-8 text-white/50" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex gap-2 mb-2">
                          {campaign.verified && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✓ Verified
                            </Badge>
                          )}
                          <Badge className={`text-xs ${
                            campaign.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                            campaign.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {campaign.urgency_level?.charAt(0).toUpperCase() + campaign.urgency_level?.slice(1)}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
                          {campaign.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                          {campaign.description}
                        </p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Progress</p>
                            <p className="text-sm font-bold text-slate-900">
                              {Math.round((campaign.raised_amount / campaign.goal_amount) * 100)}%
                            </p>
                          </div>
                          <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white text-xs">
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No campaigns yet</p>
              </div>
            )}
          </div>
        )}

        {/* Followers Tab */}
        {activeTab === 'followers' && (
          <div>
            {followers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {followers.map((follower) => (
                  <motion.div
                    key={follower.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="border-none ring-1 ring-slate-100 hover:shadow-md transition-all">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="font-black text-primary-600">
                              {follower.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{follower.name}</p>
                            {follower.city && (
                              <p className="text-xs text-slate-500">{follower.city}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/user/profiles/${follower.id}`)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-bold"
                        >
                          View
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No followers yet</p>
              </div>
            )}
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div>
            {following.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {following.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="border-none ring-1 ring-slate-100 hover:shadow-md transition-all">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="font-black text-primary-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name}</p>
                            {user.city && (
                              <p className="text-xs text-slate-500">{user.city}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/user/profiles/${user.id}`)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-bold"
                        >
                          View
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Not following anyone yet</p>
              </div>
            )}
          </div>
        )}

        {/* Donations Tab */}
        {activeTab === 'donations' && (
          <div>
            {donations.length > 0 ? (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="border-none ring-1 ring-slate-100 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              ₹{donation.amount?.toLocaleString() || 0}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">{donation.campaign_title}</p>
                          </div>
                          {!donation.anonymous && (
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Donor</p>
                              <p className="text-sm font-bold text-slate-900">{donation.donor_name}</p>
                            </div>
                          )}
                          {donation.anonymous && (
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anonymous</p>
                              <p className="text-sm font-bold text-slate-500">Private</p>
                            </div>
                          )}
                        </div>
                        {donation.message && (
                          <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2 mt-2">
                            "{donation.message}"
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No donations received yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unfollow Confirmation Dialog */}
      {showUnfollowDialog && (
        <UnfollowConfirmationDialog
          userName={userProfile?.name}
          onConfirm={handleConfirmUnfollow}
          onCancel={() => setShowUnfollowDialog(false)}
          isLoading={unfollowLoading}
        />
      )}

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PublicProfilePage;
