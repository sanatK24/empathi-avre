import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
             <Megaphone className="w-10 h-10 text-primary-500" /> My Campaigns
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-2">
            Manage your initiatives and track fundraising performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             size="lg" 
             className="bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
             onClick={() => navigate('/user/campaigns')}
           >
             <ArrowUpRight className="w-4 h-4 mr-2" /> Browse All
           </Button>
           <Button 
             size="lg" 
             className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
             onClick={() => navigate('/user/campaigns/create')}
           >
             <Plus className="w-4 h-4 mr-2" /> Start New Campaign
           </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Funds Raised', value: `$${stats.totalRaised.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Active Goals', value: stats.activeCampaigns, icon: Target, color: 'text-primary-500', bg: 'bg-primary-50' },
          { label: 'Supporter Base', value: stats.totalDonors, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Success Rate', value: stats.successRate, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50' }
        ].map((item, i) => (
          <Card key={i} className="border-none ring-1 ring-slate-100 shadow-soft hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-4`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
              <h3 className="text-2xl font-display font-black text-slate-900 mt-1">{item.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-6">
         <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary-500" /> Active Initiatives
         </h2>
         
         <div className="grid grid-cols-1 gap-6">
            {myCampaigns.map((camp) => {
              const progress = (camp.raised_amount / camp.goal_amount) * 100;
              return (
                <Card key={camp.id} className="border-none ring-1 ring-slate-100 shadow-soft hover:shadow-premium transition-all group overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 h-48 relative overflow-hidden">
                      {camp.cover_image ? (
                        <img src={camp.cover_image} alt={camp.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                          <Megaphone className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <Badge variant={camp.verified ? 'success' : 'secondary'} className="backdrop-blur-md bg-white/90 border-none shadow-sm font-black uppercase text-[10px] tracking-widest">
                          {camp.verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                            {camp.title}
                          </h3>
                          <p className="text-sm font-black text-slate-900">₹{camp.raised_amount.toLocaleString()} <span className="text-slate-400 font-bold">/ ₹{camp.goal_amount.toLocaleString()}</span></p>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium italic">
                          {camp.description}
                        </p>
                        
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className="h-full bg-primary-500 rounded-full shadow-sm"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>{Math.round(progress)}% Goal Reached</span>
                          <span>{camp.city}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-6">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-500/20"
                          onClick={() => setSelectedPublicCampaign(camp)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Public View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 font-black text-[10px] uppercase tracking-widest border-slate-200"
                          onClick={() => navigate(`/user/campaigns/edit/${camp.id}`)}
                        >
                          <Edit3 className="w-4 h-4 mr-2" /> Edit Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {myCampaigns.length === 0 && (
              <div className="py-24 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                 <Megaphone className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                 <h3 className="text-xl font-display font-black text-slate-400 uppercase tracking-tight">No Campaigns Created</h3>
                 <p className="text-slate-400 font-medium mt-2 mb-8">Start your first initiative to help your community.</p>
                 <Button size="lg" onClick={() => window.location.href='/user/campaigns/create'}>
                    <Plus className="w-4 h-4 mr-2" /> Start Now
                 </Button>
              </div>
            )}
         </div>
      </div>

      {/* Public Preview Modal */}
      {selectedPublicCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-premium"
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
