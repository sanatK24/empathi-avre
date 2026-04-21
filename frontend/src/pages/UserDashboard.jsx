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
  Siren,
  Sparkles,
  ShoppingBag,
  Megaphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Link } from 'react-router-dom';

const UserDashboard = () => {
  const { profile } = useAppContext();
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
        const [statsData, histData] = await Promise.all([
          apiService.getRequesterStats(profile.accessToken).catch(() => ({})),
          apiService.getRequestHistory(profile.accessToken).catch(() => [])
        ]);

        setStats({
          active_requests: statsData.active_requests || 0,
          matched_vendors: statsData.matched_vendors || 0,
          active_campaigns: statsData.active_campaigns || 0,
          donations_made: statsData.donations_made || 0,
          emergency_requests: statsData.emergency_requests || 0,
          recommendations_available: statsData.recommendations_available || 0
        });

        // Transform history to activity format
        const recent = (histData || []).slice(0, 5).map(item => ({
          type: item.type || 'request',
          title: item.resource_name || item.name || 'Resource Request',
          status: item.status || 'Pending',
          time: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent',
          level: (item.urgency_level || 'low').toLowerCase()
        }));
        setActivities(recent);

      } catch (err) {
        console.error("Dashboard fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (profile.accessToken) {
      fetchData();
    }
  }, [profile.accessToken]);

  const overviewCards = [
    { label: 'Active Requests', value: stats.active_requests, icon: Zap, color: 'text-primary-500', bg: 'bg-primary-50' },
    { label: 'Matched Vendors', value: stats.matched_vendors, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Active Campaigns', value: stats.active_campaigns, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Donations Made', value: `$${stats.donations_made}`, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Emergencies', value: stats.emergency_requests, icon: Siren, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Recommendations', value: stats.recommendations_available, icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  const quickActions = [
    { label: 'Request Item', icon: ShoppingBag, path: '/user/create', color: 'bg-primary-500' },
    { label: 'Create Campaign', icon: Megaphone, path: '/user/campaigns/create', color: 'bg-amber-500' },
    { label: 'Emergency Help', icon: Siren, path: '/user/emergency', color: 'bg-red-600' },
    { label: 'Browse Campaigns', icon: TrendingUp, path: '/user/campaigns', color: 'bg-indigo-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase">
            Hello, {profile.fullName || 'User'}
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-1">
            Welcome to your unified EmpathI control center.
          </p>
        </motion.div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white border border-slate-200">
            Current Status: Active
          </Badge>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {overviewCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="group hover:ring-2 hover:ring-primary-500/20 transition-all border-none ring-1 ring-slate-100 shadow-soft overflow-hidden">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-2xl font-display font-black text-slate-900">{stat.value}</h3>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Actions & Main Feed */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Actions */}
          <section>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {quickActions.map((action, i) => (
                <Link to={action.path} key={i}>
                  <Card className="hover:shadow-premium transition-all border-none ring-1 ring-slate-100 text-center group cursor-pointer h-full">
                    <CardContent className="p-6 flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-2xl ${action.color} text-white flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 leading-tight">{action.label}</span>
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
              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary-500 uppercase tracking-widest">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <Card className="border-none ring-1 ring-slate-100 shadow-soft">
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {activities.map((item, i) => (
                    <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          item.type === 'request' ? 'bg-blue-50 text-blue-500' :
                          item.type === 'donation' ? 'bg-emerald-50 text-emerald-500' :
                          item.type === 'match' ? 'bg-amber-50 text-amber-500' :
                          'bg-red-50 text-red-500'
                        }`}>
                          {item.type === 'request' && <ShoppingBag className="w-5 h-5" />}
                          {item.type === 'donation' && <Heart className="w-5 h-5" />}
                          {item.type === 'match' && <Users className="w-5 h-5" />}
                          {item.type === 'emergency' && <Siren className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest capitalize">{item.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={item.level === 'high' ? 'danger' : item.level === 'medium' ? 'warning' : 'secondary'}>
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
        <div className="lg:col-span-4 space-y-8">
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
              <div className="p-12 text-center text-slate-500 bg-white/5 rounded-2x border border-white/10">
                <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="font-bold uppercase text-[10px] tracking-widest text-white/60">No recommendations yet</p>
                <p className="text-[10px] mt-2 font-medium italic text-slate-400">Recommendations will appear after your first activity.</p>
              </div>
              <Button 
                onClick={() => window.location.href='/user/recommendations'}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 shadow-none font-black text-xs uppercase tracking-widest"
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
               <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <p className="text-2xl font-black text-slate-900">{stats.lives_impacted || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lives Impacted</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100"></div>
                  <div className="flex-1">
                    <p className="text-2xl font-black text-slate-900">{stats.matched_vendors}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Successful Matches</p>
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
