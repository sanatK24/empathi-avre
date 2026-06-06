import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Megaphone, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
const AdminStats = () => {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const fetchStats = async () => {
    if (!profile?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getAdminStats(profile.accessToken);
      setStats(data || {});
    } catch (e) {
      setError(e?.message || 'Failed to load stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchStats();
  }, [profile?.accessToken]);
  if (loading) return <LoadingSpinner fullPage text="Loading system stats..." />;
  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-display font-black text-slate-900 tracking-tight">System Statistics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchStats} variant="secondary">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!stats) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No stats available"
        description="The admin stats endpoint returned no data."
        variant="dashed"
        className="py-16"
      />
    );
  }
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">System Statistics</h1>
          <p className="text-slate-500 font-medium tracking-tight">Snapshot of system health and admin metrics.</p>
        </div>
        <Button variant="secondary" size="md" onClick={fetchStats} icon={<RefreshCw className="w-5 h-5" />}>
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Users" value={stats.total_users || 0} icon={Users} />
        <StatCard label="Total Campaigns" value={stats.total_campaigns || 0} icon={Megaphone} />
        <StatCard label="System Alerts" value={stats.system_alerts || 0} icon={AlertCircle} />
        <StatCard label="Active Creators" value={stats.active_creators || 0} icon={ShieldCheck} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Detailed Overview
          </CardTitle>
          <CardDescription>Additional fields provided by the backend (if available).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { k: 'verified_campaigns', label: 'Verified Campaigns' },
            { k: 'pending_campaigns', label: 'Pending Campaigns' },
            { k: 'flagged_campaigns', label: 'Flagged Campaigns' },
            { k: 'fraud_risk', label: 'Fraud Risk' },
            { k: 'server_uptime_hours', label: 'Uptime (hrs)' },
          ].map((item) => (
            <div key={item.k} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.label}</div>
                <Badge variant="secondary" className="text-[10px]">
                  {typeof stats[item.k] === 'number' ? stats[item.k] : (stats[item.k] ?? '—')}
                </Badge>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900">
                {typeof stats[item.k] === 'number' ? stats[item.k] : (stats[item.k] ?? '—')}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
export default AdminStats;
