import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Clock, CheckCircle2, AlertCircle, Plus,
  ArrowRight, Heart, Sparkles, Megaphone,
  ShieldCheck, Users, TrendingUp, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../utils/formatNumber';

const Dashboard = () => {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const role = profile?.userRole?.toLowerCase() || 'donor';
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentData, setRecentData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.accessToken) return;
      try {
        setLoading(true);
        if (role === 'admin') {
          const adminStats = await apiService.getAdminStats(profile.accessToken).catch(() => ({}));
          setStats(adminStats || {});
        } else if (role === 'creator') {
          // fetch creator stats
          const creatorData = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/campaigns/my`, {
            headers: { 'Authorization': `Bearer ${profile.accessToken}` }
          }).then(res => res.ok ? res.json() : []);
          setRecentData(Array.isArray(creatorData) ? creatorData : []);
          setStats({ active_campaigns: Array.isArray(creatorData) ? creatorData.length : 0 });
        } else {
          // fetch donor stats
          const donationsData = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/campaigns`, {
            headers: { 'Authorization': `Bearer ${profile.accessToken}` }
          }).then(res => res.ok ? res.json() : []);
          setRecentData(Array.isArray(donationsData) ? donationsData.slice(0, 5) : []);
          setStats({ campaigns_viewed: Array.isArray(donationsData) ? donationsData.length : 0 });
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [profile, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text={`Loading ${role} dashboard...`} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">
            Welcome back, {profile.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-slate-500 font-medium">Here's what's happening with your account today.</p>
        </div>
        {role === 'creator' && (
          <Button onClick={() => navigate('/user/campaigns/create')} icon={<Plus className="w-5 h-5" />}>
            Create Campaign
          </Button>
        )}
      </div>

      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.total_users || 0} icon={Users} trend="+12%" />
          <StatCard title="Total Campaigns" value={stats.total_campaigns || 0} icon={Megaphone} trend="+8%" />
          <StatCard title="System Alerts" value={stats.system_alerts || 0} icon={AlertCircle} alert />
          <StatCard title="Active Creators" value={stats.active_creators || 0} icon={ShieldCheck} />
        </div>
      )}

      {role === 'creator' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Active Campaigns" value={stats.active_campaigns || 0} icon={Megaphone} />
          <StatCard title="Total Raised" value={formatCurrency(0)} icon={TrendingUp} />
          <StatCard title="Total Supporters" value="0" icon={Users} />
        </div>
      )}

      {role === 'donor' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Donations Made" value={formatCurrency(0)} icon={Heart} />
          <StatCard title="Campaigns Supported" value="0" icon={CheckCircle2} />
          <StatCard title="Impact Score" value="0" icon={Sparkles} />
        </div>
      )}

      {/* Shared Section: Recent Activity / Discover */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            {role === 'creator' ? 'Your Campaigns' : 'Recommended Campaigns'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentData.length === 0 ? (
            <EmptyState 
              icon={role === 'creator' ? Megaphone : Sparkles}
              title={role === 'creator' ? "No campaigns yet" : "No recommendations right now"}
              description={role === 'creator' ? "Create your first campaign to start raising funds." : "Check back later for personalized recommendations."}
            />
          ) : (
            <div className="space-y-4">
              {recentData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 transition-colors">
                  <div>
                    <h4 className="font-bold text-slate-900">{item.title || "Campaign"}</h4>
                    <p className="text-sm text-slate-500">{item.creator_name || "Unknown"} • {item.city || "Global"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/user/campaigns/${item.id}`)}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
