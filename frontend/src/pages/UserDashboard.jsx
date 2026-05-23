import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  ArrowRight,
  Filter,
  BarChart3,
  Users,
  TrendingUp,
  Heart,
  Sparkles,
  ShoppingBag,
  Megaphone,
  ReceiptText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Link } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../utils/formatNumber';

const UserDashboard = () => {
  const { profile, statsRefreshTrigger } = useAppContext();
  const [stats, setStats] = useState({
    active_requests: 0,
    matched_vendors: 0,
    active_campaigns: 0,
    donations_made: 0,
    emergency_requests: 0,
    recommendations_available: 0
  });
  const [activities, setActivities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, histData, donationData, recommendationsData] = await Promise.all([
          apiService.getRequesterStats(profile.accessToken).catch(() => ({})),
          apiService.getRequestHistory(profile.accessToken).catch(() => []),
          apiService.getDonationHistory(profile.accessToken).catch(() => []),
          apiService.getPersonalizedCampaigns(profile.accessToken).catch(() => [])
        ]);

        const totalReq = statsData.total_requests || 0;
        const resolvedReq = statsData.resolved_requests || 0;
        const matchedVendors = statsData.matched_vendors || 0;

        setStats({
          active_requests: statsData.active_requests || 0,
          matched_vendors: matchedVendors,
          active_campaigns: statsData.active_campaigns || 0,
          donations_made: (donationData || []).reduce((sum, d) => sum + (d.amount || 0), 0),
          emergency_requests: statsData.emergency_requests || 0,
          recommendations_available: statsData.recommendations_available || (recommendationsData ? recommendationsData.length : 0),
          lives_impacted: resolvedReq,
          goal_progress: totalReq > 0 ? Math.round(((resolvedReq + matchedVendors) / totalReq) * 100) : 0
        });

        setRecommendations(recommendationsData || []);

        // Transform history to activity format
        const requests = (histData || []).map(item => ({
          type: 'request',
          title: item.resource_name || item.name || 'Resource Request',
          status: item.status || 'Pending',
          date: new Date(item.created_at),
          time: new Date(item.created_at).toLocaleDateString(),
          level: (item.urgency_level || 'low').toLowerCase()
        }));

        const donations = (donationData || []).map(item => ({
          type: 'donation',
          title: `Donated to ${item.campaign_title || 'Humanitarian Campaign'}`,
          status: formatCurrency(item.amount),
          date: new Date(item.created_at),
          time: new Date(item.created_at).toLocaleDateString(),
          level: 'medium'
        }));

        const combined = [...requests, ...donations]
          .sort((a, b) => b.date - a.date)
          .slice(0, 5);

        setActivities(combined);

      } catch (err) {
        console.error("Dashboard fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (profile.accessToken) {
      fetchData();
    }
  }, [profile.accessToken, statsRefreshTrigger]);

  const overviewCards = [
    { label: 'Active Campaigns', value: formatNumber(stats.active_campaigns), icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Donations Made', value: formatCurrency(stats.donations_made), icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Recommendations', value: formatNumber(stats.recommendations_available), icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  const quickActions = [
    { label: 'Create Campaign', icon: Megaphone, path: '/user/campaigns/create', color: 'bg-amber-500' },
    { label: 'Transactions', icon: ReceiptText, path: '/user/transactions', color: 'bg-slate-700' },
    { label: 'Community Feed', icon: Sparkles, path: '/user/smart-feed', color: 'bg-indigo-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight uppercase">
            Hello, {profile.fullName || 'User'}
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-lg mt-1">
            Welcome back to EmpathI.
          </p>
        </motion.div>
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full md:w-auto">
          <Badge variant="secondary" className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200">
            Status: Active
          </Badge>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
        {overviewCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="h-full"
          >
            <Card className="group hover:ring-2 hover:ring-primary-500/20 transition-all border-none ring-1 ring-slate-100 shadow-soft overflow-hidden h-full">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform shrink-0`}>
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-display font-black text-slate-900 leading-tight">{stat.value}</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Quick Actions & Main Feed */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Quick Actions */}
          <section>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" /> Quick Actions
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
              {quickActions.map((action, i) => (
                <Link to={action.path} key={i}>
                  <Card className="hover:shadow-premium transition-all border-none ring-1 ring-slate-100 text-center group cursor-pointer h-full bg-slate-50/50 hover:bg-white">
                    <CardContent className="p-2 sm:p-6 flex flex-col items-center justify-center h-full">
                      <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${action.color} text-white flex items-center justify-center mb-1.5 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
                        <action.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[9px] sm:text-xs font-bold text-slate-700 leading-tight truncate w-full px-1">{action.label}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Activity Timeline */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" /> Recent Activity
              </h2>
              <Link to="/user/campaigns">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-primary-500 uppercase tracking-widest">
                  Browse Campaigns
                </Button>
              </Link>
            </div>
            <Card className="border-none ring-1 ring-slate-100 shadow-soft">
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {activities.map((item, i) => (
                    <div key={i} className="p-3 sm:p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-2">
                      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center ${
                          item.type === 'request' ? 'bg-blue-50 text-blue-500' :
                          item.type === 'donation' ? 'bg-emerald-50 text-emerald-500' :
                          item.type === 'match' ? 'bg-amber-50 text-amber-500' :
                          'bg-red-50 text-red-500'
                        }`}>
                          {item.type === 'request' && <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />}
                          {item.type === 'donation' && <Heart className="w-4 h-4 sm:w-5 sm:h-5" />}
                          {item.type === 'match' && <Users className="w-4 h-4 sm:w-5 sm:h-5" />}
                          {item.type === 'emergency' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight truncate">{item.title}</h4>
                          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 truncate">
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full shrink-0"></span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest capitalize truncate">{item.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        <Badge variant={item.level === 'high' ? 'danger' : item.level === 'medium' ? 'warning' : 'secondary'} className="text-[9px] sm:text-[10px] px-2 py-0.5">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <div className="mb-4 flex justify-center">
                        <ShoppingBag className="w-12 h-12 opacity-20" />
                      </div>
                      <p className="font-bold uppercase text-xs tracking-widest">No recent activity</p>
                      <p className="text-[10px] mt-1 font-medium italic">Start by creating your first request.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column: Recommendations & Stats */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          {/* Recommendations Card */}
          <Card className="bg-slate-900 text-white border-none shadow-premium overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-lg font-display font-black uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Recommendations
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Smart AI curated opportunities for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              {recommendations && recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((item, idx) => (
                    <Link to={`/user/campaigns/${item.id}`} key={idx} className="block">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 space-y-2 group/rec">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-black uppercase tracking-tight text-white line-clamp-1 flex-1 group-hover/rec:text-primary-400 transition-colors">
                            {item.title}
                          </h4>
                          {item.score && (
                            <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md shrink-0">
                              {Math.round(item.score)}% Match
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          <span className="bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span>•</span>
                          <span>{item.city}</span>
                        </div>
                        {item.reason && (
                          <p className="text-[9px] text-amber-400/80 font-medium italic">
                            ★ {item.reason}
                          </p>
                        )}
                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Progress</span>
                            <span>{item.progress || 0}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, item.progress || 0)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 sm:p-12 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/10">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-4 opacity-20" />
                  <p className="font-bold uppercase text-[10px] tracking-widest text-white/60">No recommendations yet</p>
                  <p className="text-[10px] mt-2 font-medium italic text-slate-400">Recommendations will appear after your first activity.</p>
                </div>
              )}
              <Button 
                onClick={() => window.location.href='/user/recommendations'}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 shadow-none font-black text-[10px] uppercase tracking-widest py-4 rounded-xl"
              >
                Explore Smart Feed
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats / Impact */}
          <Card className="border-none ring-1 ring-slate-100 shadow-soft">
            <CardHeader>
              <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">Your Impact</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
               <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex-1">
                    <p className="text-2xl font-black text-slate-900">{stats.lives_impacted || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lives Impacted</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100"></div>
                  <div className="flex-1">
                    <p className="text-2xl font-black text-slate-900">{stats.donations_made ? 1 : 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaigns Supported</p>
                  </div>
               </div>
               <div className="mt-6 pt-6 border-t border-slate-50">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    <span>Overall Goal Progress</span>
                    <span>{stats.goal_progress || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-1000" style={{ width: `${stats.goal_progress || 0}%` }}></div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
