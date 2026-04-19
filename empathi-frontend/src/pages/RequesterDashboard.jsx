import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Plus,
  ArrowRight,
  Filter,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const RequesterDashboard = () => {
  const { profile } = useAppContext();
  const [stats, setStats] = useState({
    active_requests: 0,
    resolved_requests: 0,
    avg_match_time: '0m',
    pending_response: 0
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    urgency: 'all'
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile.accessToken) return;
      try {
        const [statsData, historyData] = await Promise.all([
          apiService.getRequesterStats(profile.accessToken),
          apiService.getRequestHistory(profile.accessToken)
        ]);
        setStats(statsData);
        setHistory(historyData.slice(0, 5)); // Only show latest 5
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [profile.accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Requests', value: stats.active_requests, icon: Zap, color: 'text-primary-500', bg: 'bg-primary-50', trend: '+2' },
    { label: 'Resolved', value: stats.resolved_requests, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: 'Closed' },
    { label: 'Avg. Match Time', value: stats.avg_match_time, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', trend: 'Target' },
    { label: 'Pending Response', value: stats.pending_response, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50', trend: 'Wait' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">Welcome back, {profile.fullName || 'Requester'}</h1>
          <p className="text-slate-500 font-medium font-display tracking-tight">You have {stats.active_requests} active requests in the pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" className="shadow-none border-slate-200" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
          <Button size="md" onClick={() => window.location.href='/requester/create'}>
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="border-none ring-1 ring-slate-100 shadow-soft">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Status</label>
                <select
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/30 outline-none"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="matched">Matched</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Urgency</label>
                <select
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/30 outline-none"
                  value={filters.urgency}
                  onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                >
                  <option value="all">All Urgencies</option>
                  <option value="low">Routine</option>
                  <option value="medium">Urgent</option>
                  <option value="high">Critical</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setFilters({status: 'all', urgency: 'all'}); setShowFilters(false); }} className="flex-1">
                  Reset
                </Button>
                <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="group hover:ring-2 hover:ring-primary-500/20 transition-all border-none ring-1 ring-slate-100 shadow-soft">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">{stat.trend}</Badge>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-display font-black text-slate-900 mt-1">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none ring-1 ring-slate-100 shadow-soft">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-display font-black uppercase">Request Activity</CardTitle>
                <CardDescription>Visualizing your resource demand over time.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="font-bold text-primary-500">Weekly View</Button>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-0">
             {/* Dynamic chart implementation would go here with real time-series data */}
             <div className="h-full w-full bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center">
                <div className="text-center">
                   <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analytics populating...</p>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-100 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-display font-black uppercase">Recent Activity</CardTitle>
            <CardDescription>Latest resource updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">{item.resource_name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       {new Date(item.created_at).toLocaleDateString()} • {item.quantity} units
                    </p>
                  </div>
                </div>
                <Badge variant={item.urgency_level === 'high' ? 'danger' : 'warning'}>
                   {item.urgency_level}
                </Badge>
              </div>
            ))}
            
            {history.length === 0 && (
              <div className="py-12 text-center">
                 <p className="text-slate-400 text-sm font-medium">No recent requests.</p>
              </div>
            )}

            <Button variant="outline" className="w-full mt-4 border-slate-200 shadow-none text-slate-600 font-bold" onClick={() => window.location.href='/requester/history'}>
              View All History <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequesterDashboard;
