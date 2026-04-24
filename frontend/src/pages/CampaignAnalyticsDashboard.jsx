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
  ExternalLink
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
                          onClick={() => navigate(`/campaigns/${camp.id}`)}
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
    </div>
  );
};

export default CampaignAnalyticsDashboard;
