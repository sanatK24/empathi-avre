import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  TrendingUp,
  Target,
  Users,
  CheckCircle2,
  Edit3,
  Plus,
  ArrowUpRight,
  BarChart3,
  Megaphone,
  Clock,
  ExternalLink,
  Eye
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/ui/EmptyState';

const CampaignAnalyticsDashboard = () => {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPublicCampaign, setSelectedPublicCampaign] = useState(null);

  const [myCampaigns, setMyCampaigns] = useState([]);
  const [stats, setStats] = useState({
    totalRaised: 0,
    activeCampaigns: 0,
    totalDonors: 0,
    successRate: '0%'
  });

  useEffect(() => {
    const fetchMyCampaigns = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMyCreatedCampaigns(profile.accessToken);
        setMyCampaigns(data);
        
        // Calculate aggregate stats
        const totalRaised = data.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
        const activeCount = data.filter(c => c.status === 'ACTIVE').length;
        
        setStats({
          totalRaised,
          activeCampaigns: activeCount,
          totalDonors: data.length * 12, // Simulated multiplier for demo
          successRate: data.length > 0 ? `${Math.round((activeCount / data.length) * 100)}%` : '0%'
        });
      } catch (err) {
        console.error("My Campaigns fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    if (profile.accessToken) fetchMyCampaigns();
  }, [profile.accessToken]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4 md:px-0">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight uppercase flex items-center justify-center md:justify-start gap-4">
             <Megaphone className="w-10 h-10 md:w-14 md:h-14 text-primary-500" /> My Campaigns
          </h1>
          <p className="text-slate-500 font-medium text-base md:text-xl mt-3 max-w-xl mx-auto md:mx-0 leading-relaxed">
            Manage your initiatives and track fundraising performance with dynamic predictive insights.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
           <Button 
             variant="secondary" 
             size="lg" 
             fullWidth
             className="bg-white border border-slate-200 text-slate-900 font-black uppercase text-xs tracking-widest hover:bg-slate-50 h-14 md:h-16 px-10 rounded-2xl"
             onClick={() => navigate('/user/campaigns')}
           >
             <ArrowUpRight className="w-4 h-4 mr-2" /> Browse
           </Button>
           <Button 
             size="lg" 
             fullWidth
             className="bg-primary-gradient text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-500/30 active:scale-95 transition-all h-14 md:h-16 px-10 rounded-2xl"
             onClick={() => navigate('/user/campaigns/create')}
           >
             <Plus className="w-4 h-4 mr-2" /> Create New
           </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 px-4 md:px-0">
        {[
          { label: 'Funds Raised', value: `₹${stats.totalRaised.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
          { label: 'Active Goals', value: stats.activeCampaigns, icon: Target, color: 'text-primary-500', bg: 'bg-primary-50/50' },
          { label: 'Supporters', value: stats.totalDonors, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50/50' },
          { label: 'Success', value: stats.successRate, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50/50' }
        ].map((item, i) => (
          <StatCard
            key={i}
            label={item.label}
            value={item.value}
            icon={item.icon}
            color={item.color}
            bg={item.bg}
            animated={true}
            animDelay={i * 0.05}
          />
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-6 px-4 md:px-0">
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-primary-500" /> Active Initiatives
         </h2>
         
         <div className="grid grid-cols-1 gap-6">
            {myCampaigns.map((camp) => {
              const progress = (camp.raised_amount / camp.goal_amount) * 100;
              return (
                <Card key={camp.id} className="border-none ring-1 ring-slate-100 shadow-premium hover:shadow-2xl transition-all group overflow-hidden rounded-[2.5rem]">
                  <div className="flex flex-col md:flex-row min-h-[220px] max-h-[350px] overflow-hidden">
                    {/* Card Image - Proportional Aspect Ratio */}
                    <div className="w-full md:w-[350px] lg:w-[400px] aspect-video relative overflow-hidden shrink-0 bg-slate-100">
                      {camp.cover_image ? (
                        <img src={camp.cover_image} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full bg-primary-gradient flex items-center justify-center">
                          <Megaphone className="w-16 h-16 text-white/20 animate-pulse" />
                        </div>
                      )}
                      
                      {/* Overlay Layer */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-60"></div>
                      
                      <div className="absolute top-6 left-6 flex gap-2">
                        <Badge className="bg-white/95 backdrop-blur-md text-slate-900 border-none shadow-2xl font-black uppercase text-[10px] tracking-[0.15em] px-4 py-2 rounded-full">
                          {camp.verified ? '✓ Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="absolute bottom-6 right-6">
                        <div className="bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl font-black text-lg shadow-2xl border border-white/10">
                          ₹{camp.raised_amount.toLocaleString()} <span className="text-white/40 text-[10px] block tracking-widest">CURRENTLY RAISED</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Content - Precise Padding */}
                    <div className="flex-1 p-5 md:p-6 flex flex-col justify-between bg-white relative">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight leading-[1.1] line-clamp-2">
                            {camp.title}
                          </h3>
                          <div className="flex items-center gap-5 text-slate-400">
                             <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]">
                               <MapPin className="w-4 h-4 text-primary-500" /> {camp.city}
                             </div>
                             <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]">
                               <Target className="w-4 h-4 text-amber-500" /> ₹{camp.goal_amount.toLocaleString()} Target
                             </div>
                          </div>
                        </div>

                        <p className="text-sm text-slate-500 line-clamp-2 font-medium leading-relaxed italic">
                          "{camp.description}"
                        </p>
                        
                        <div className="pt-2 space-y-2.5">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-black text-primary-600 uppercase tracking-[0.2em]">{Math.round(progress)}% PROGRESS</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Goal: ₹{camp.goal_amount.toLocaleString()}</span>
                          </div>
                          <ProgressBar 
                            value={progress}
                            color="bg-primary-gradient"
                            height="h-3 md:h-4"
                            trackColor="bg-slate-100 shadow-inner"
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                        <Button
                          variant="primary"
                          fullWidth
                          className="h-10 md:h-12 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 rounded-xl"
                          onClick={() => setSelectedPublicCampaign(camp)}
                        >
                          <Eye className="w-5 h-5 mr-3" /> Public Preview
                        </Button>
                        <Button
                          variant="secondary"
                          fullWidth
                          className="h-10 md:h-12 font-black text-xs uppercase tracking-[0.2em] bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 rounded-xl"
                          onClick={() => navigate(`/user/campaigns/edit/${camp.id}`)}
                        >
                          <Edit3 className="w-5 h-5 mr-3" /> Management
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {myCampaigns.length === 0 && (
              <EmptyState
                icon={Megaphone}
                title="No Campaigns Created"
                description="Start your first initiative to help your community."
                action={
                  <Button variant="primary" onClick={() => navigate('/user/campaigns/create')}>
                    <Plus className="w-5 h-5 mr-2" /> Start Now
                  </Button>
                }
                variant="dashed"
                className="py-24"
              />
            )}
         </div>
      </div>

      {/* Public Preview Modal */}
      {selectedPublicCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-premium overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 uppercase">Public Preview</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">This is how donors will see your campaign</p>
              </div>
              <button
                onClick={() => setSelectedPublicCampaign(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Campaign Preview */}
            <div className="p-6 space-y-6">
              {/* Cover Image */}
              {selectedPublicCampaign.cover_image ? (
                <img
                  src={selectedPublicCampaign.cover_image}
                  alt={selectedPublicCampaign.title}
                  className="w-full h-64 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                  <Megaphone className="w-16 h-16 text-white/50" />
                </div>
              )}

              {/* Title & Badges */}
              <div>
                <div className="flex gap-2 items-start mb-3">
                  <h3 className="font-display font-black text-2xl text-slate-900 flex-1">
                    {selectedPublicCampaign.title}
                  </h3>
                  {selectedPublicCampaign.verified && (
                    <Badge className="bg-green-100 text-green-800 text-xs whitespace-nowrap">
                      ✓ Verified
                    </Badge>
                  )}
                </div>
                <Badge className={`${
                  selectedPublicCampaign.urgency_level?.toLowerCase() === 'critical' ? 'bg-red-100 text-red-800' :
                  selectedPublicCampaign.urgency_level?.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-800' :
                  selectedPublicCampaign.urgency_level?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                } text-xs`}>
                  {selectedPublicCampaign.urgency_level?.charAt(0).toUpperCase() + selectedPublicCampaign.urgency_level?.slice(1) || 'Medium'}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-2">About This Campaign</h4>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {selectedPublicCampaign.description}
                </p>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
                {selectedPublicCampaign.city}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-slate-900">₹{selectedPublicCampaign.raised_amount?.toLocaleString() || 0}</span>
                  <span className="text-slate-600 font-bold">₹{selectedPublicCampaign.goal_amount?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                    style={{ width: `${Math.min((selectedPublicCampaign.raised_amount / selectedPublicCampaign.goal_amount) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  {Math.round((selectedPublicCampaign.raised_amount / selectedPublicCampaign.goal_amount) * 100)}% funded
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedPublicCampaign(null)}
                >
                  Close Preview
                </Button>
                <Button
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                  onClick={() => {
                    setSelectedPublicCampaign(null);
                    navigate(`/user/campaigns/edit/${selectedPublicCampaign.id}`);
                  }}
                >
                  Edit Campaign
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CampaignAnalyticsDashboard;
