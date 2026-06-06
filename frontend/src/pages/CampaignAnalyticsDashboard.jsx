import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, Target, Users, CheckCircle2, Edit3, Plus, ArrowUpRight, BarChart3, Megaphone, Eye } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
const URGENCY_COLORS = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800' };
const STAT_DEFS = [
  { label: 'Funds Raised', key: 'totalRaised', fmt: v => `₹${v.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
  { label: 'Active Goals', key: 'activeCampaigns', icon: Target, color: 'text-primary-500', bg: 'bg-primary-50/50' },
  { label: 'Supporters', key: 'totalDonors', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50/50' },
  { label: 'Success', key: 'successRate', icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50/50' },
];
const CampaignAnalyticsDashboard = () => {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPublicCampaign, setSelectedPublicCampaign] = useState(null);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [stats, setStats] = useState({ totalRaised: 0, activeCampaigns: 0, totalDonors: 0, successRate: '0%' });
  useEffect(() => {
    const fetchMyCampaigns = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMyCreatedCampaigns(profile.accessToken);
        setMyCampaigns(data);
        const totalRaised = data.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
        const activeCount = data.filter(c => c.status === 'ACTIVE').length;
        setStats({ totalRaised, activeCampaigns: activeCount, totalDonors: data.length * 12, successRate: data.length > 0 ? `${Math.round((activeCount / data.length) * 100)}%` : '0%' });
      } catch (err) { console.error("My Campaigns fetch failed", err); }
      finally { setLoading(false); }
    };
    if (profile.accessToken) fetchMyCampaigns();
  }, [profile.accessToken]);
  const sc = selectedPublicCampaign;
  const scProgress = sc ? Math.round((sc.raised_amount / sc.goal_amount) * 100) : 0;
  const urgencyKey = sc?.urgency_level?.toLowerCase();
  const urgencyColor = URGENCY_COLORS[urgencyKey] || 'bg-blue-100 text-blue-800';
  const urgencyLabel = sc?.urgency_level ? sc.urgency_level.charAt(0).toUpperCase() + sc.urgency_level.slice(1) : 'Medium';
  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4 md:px-0">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight uppercase flex items-center justify-center md:justify-start gap-4">
            <Megaphone className="w-10 h-10 md:w-14 md:h-14 text-primary-500" /> My Campaigns
          </h1>
          <p className="text-slate-500 font-medium text-base md:text-xl mt-3 max-w-xl mx-auto md:mx-0 leading-relaxed">Manage your initiatives and track fundraising performance with dynamic predictive insights.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <Button variant="secondary" size="lg" fullWidth className="bg-white border border-slate-200 text-slate-900 font-black uppercase text-xs tracking-widest hover:bg-slate-50 h-14 md:h-16 px-10 rounded-2xl" onClick={() => navigate('/user/campaigns')}>
            <ArrowUpRight className="w-4 h-4 mr-2" /> Browse
          </Button>
          <Button size="lg" fullWidth className="bg-primary-gradient text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-500/30 active:scale-95 transition-all h-14 md:h-16 px-10 rounded-2xl" onClick={() => navigate('/user/campaigns/create')}>
            <Plus className="w-4 h-4 mr-2" /> Create New
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 px-4 md:px-0">
        {STAT_DEFS.map(({ key, fmt, ...rest }, i) => (
          <StatCard key={i} {...rest} value={fmt ? fmt(stats[key]) : stats[key]} animated animDelay={i * 0.05} />
        ))}
      </div>
      <div className="space-y-6 px-4 md:px-0">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-primary-500" /> Active Initiatives
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {myCampaigns.map(camp => {
            const progress = (camp.raised_amount / camp.goal_amount) * 100;
            return (
              <Card key={camp.id} className="border-none ring-1 ring-slate-100 shadow-premium hover:shadow-2xl transition-all group overflow-hidden rounded-[2.5rem]">
                <div className="flex flex-col md:flex-row min-h-[220px] max-h-[350px] overflow-hidden">
                  <div className="w-full md:w-[350px] lg:w-[400px] aspect-video relative overflow-hidden shrink-0 bg-slate-100">
                    {camp.cover_image
                      ? <img src={camp.cover_image} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      : <div className="w-full h-full bg-primary-gradient flex items-center justify-center"><Megaphone className="w-16 h-16 text-white/20 animate-pulse" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-6 left-6 flex gap-2">
                      {camp.is_flagged ? (
                        <Badge className="bg-red-600 text-white border-none shadow-2xl font-black uppercase text-[10px] tracking-[0.15em] px-4 py-2 rounded-full">Flagged / Failed</Badge>
                      ) : (
                        <Badge className="bg-white/95 backdrop-blur-md text-slate-900 border-none shadow-2xl font-black uppercase text-[10px] tracking-[0.15em] px-4 py-2 rounded-full">{camp.verified ? '✓ Verified' : 'Pending'}</Badge>
                      )}
                    </div>
                    <div className="absolute bottom-6 right-6">
                      <div className="bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl font-black text-lg shadow-2xl border border-white/10">
                        ₹{camp.raised_amount.toLocaleString()} <span className="text-white/40 text-[10px] block tracking-widest">CURRENTLY RAISED</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-5 md:p-6 flex flex-col justify-between bg-white relative">
                    <div className="space-y-3">
                      {camp.is_flagged && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl flex items-start gap-3">
                          <span className="text-lg mt-0.5">⚠️</span>
                          <div>
                            <p className="font-bold text-xs uppercase tracking-wider">Campaign Flagged / Verification Failed</p>
                            <p className="text-xs text-red-600 font-medium mt-0.5">
                              This campaign has been flagged by the AI Verification system or an Administrator due to a failed document check (Trust Score: {camp.trust_score}%). It is currently hidden from the public discover feed.
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight leading-[1.1] line-clamp-2">{camp.title}</h3>
                        <div className="flex items-center gap-5 text-slate-400">
                          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]"><MapPin className="w-4 h-4 text-primary-500" /> {camp.city}</div>
                          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]"><Target className="w-4 h-4 text-amber-500" /> ₹{camp.goal_amount.toLocaleString()} Target</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 font-medium leading-relaxed italic">"{camp.description}"</p>
                      <div className="pt-2 space-y-2.5">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-black text-primary-600 uppercase tracking-[0.2em]">{Math.round(progress)}% PROGRESS</span>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Goal: ₹{camp.goal_amount.toLocaleString()}</span>
                        </div>
                        <ProgressBar value={progress} color="bg-primary-gradient" height="h-3 md:h-4" trackColor="bg-slate-100 shadow-inner" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                      <Button variant="primary" fullWidth className="h-10 md:h-12 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 rounded-xl" onClick={() => setSelectedPublicCampaign(camp)}>
                        <Eye className="w-5 h-5 mr-3" /> Public Preview
                      </Button>
                      <Button variant="secondary" fullWidth className="h-10 md:h-12 font-black text-xs uppercase tracking-[0.2em] bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 rounded-xl" onClick={() => navigate(`/user/campaigns/edit/${camp.id}`)}>
                        <Edit3 className="w-5 h-5 mr-3" /> Management
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {myCampaigns.length === 0 && (
            <EmptyState icon={Megaphone} title="No Campaigns Created" description="Start your first initiative to help your community." action={<Button variant="primary" onClick={() => navigate('/user/campaigns/create')}><Plus className="w-5 h-5 mr-2" /> Start Now</Button>} variant="dashed" className="py-24" />
          )}
        </div>
      </div>
      {sc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-premium overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 uppercase">Public Preview</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">This is how donors will see your campaign</p>
              </div>
              <button onClick={() => setSelectedPublicCampaign(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {sc.cover_image
                ? <img src={sc.cover_image} alt={sc.title} className="w-full h-64 object-cover rounded-xl" />
                : <div className="w-full h-64 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center"><Megaphone className="w-16 h-16 text-white/50" /></div>}
              <div>
                <div className="flex gap-2 items-start mb-3">
                  <h3 className="font-display font-black text-2xl text-slate-900 flex-1">{sc.title}</h3>
                  {sc.verified && <Badge className="bg-green-100 text-green-800 text-xs whitespace-nowrap">✓ Verified</Badge>}
                </div>
                <Badge className={`${urgencyColor} text-xs`}>{urgencyLabel}</Badge>
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-2">About This Campaign</h4>
                <p className="text-slate-600 font-medium leading-relaxed">{sc.description}</p>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg>
                {sc.city}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-slate-900">₹{sc.raised_amount?.toLocaleString() || 0}</span>
                  <span className="text-slate-600 font-bold">₹{sc.goal_amount?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all" style={{ width: `${Math.min(scProgress, 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 font-bold mt-1">{scProgress}% funded</p>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedPublicCampaign(null)}>Close Preview</Button>
                <Button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white" onClick={() => { setSelectedPublicCampaign(null); navigate(`/user/campaigns/edit/${sc.id}`); }}>Edit Campaign</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default CampaignAnalyticsDashboard;
