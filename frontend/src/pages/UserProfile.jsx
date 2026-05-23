import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, MapPin, Heart, Share2, Loader2, AlertCircle, TrendingUp, Settings
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { handleImageError } from '../utils/imageUtils';

// Unified UserProfile: handles both public viewing and private settings

const UserProfile = () => {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAppContext();
  
  // Determine if viewing own profile
  const isOwnProfile = !user_id || user_id === profile?.id?.toString();

  const [userProfile, setUserProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        if (isOwnProfile) {
          setUserProfile(profile);
          const userCampaigns = await apiService.getUserCampaigns(profile.accessToken, profile.id).catch(() => []);
          setCampaigns(Array.isArray(userCampaigns) ? userCampaigns : []);
        } else {
          const [profileData, campaignsData] = await Promise.all([
            apiService.getPublicProfile(profile?.accessToken, user_id).catch(() => null),
            apiService.getUserCampaigns(profile?.accessToken, user_id).catch(() => [])
          ]);
          setUserProfile(profileData);
          setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [profile, user_id, isOwnProfile]);

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
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Profile not found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary-gradient flex items-center justify-center text-white shadow-lg shrink-0 mx-auto md:mx-0">
                <span className="text-3xl md:text-4xl font-black">{userProfile.name?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 uppercase">
                  {userProfile.name || 'User'}
                </h1>
                {userProfile.city && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest">
                    <MapPin className="w-3 h-3" />
                    {userProfile.city}
                  </div>
                )}
                <Badge className="mt-2 text-xs">
                  {userProfile.role || userProfile.userRole || 'User'}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-3">
              {isOwnProfile ? (
                <Button icon={<Settings className="w-4 h-4" />} variant="secondary">
                  Edit Settings
                </Button>
              ) : (
                <Button icon={<Share2 className="w-4 h-4" />}>
                  Share Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold mb-6">Campaigns ({campaigns.length})</h2>
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} onClick={() => navigate(`/user/campaigns/${campaign.id}`)} className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group border-none ring-1 ring-slate-100">
                <div className="h-40 bg-slate-200">
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white/50" />
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{campaign.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{campaign.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No campaigns yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
