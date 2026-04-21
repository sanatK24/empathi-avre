import React, { useState, useEffect } from 'react';
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
        // apiService.getMyCreatedCampaigns(profile.accessToken)
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
           <Button variant="secondary" size="lg" className="bg-white border-slate-200">
             View Public Profile
           </Button>
           <Button size="lg" onClick={() => window.location.href='/user/campaigns/create'}>
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
            {myCampaigns.map((camp) => (
              <Card key={camp.id} className="border-none ring-1 ring-slate-100 shadow-soft hover:shadow-premium transition-all group overflow-hidden">
                {/* ... existing card content ... */}
              </Card>
            ))}
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
