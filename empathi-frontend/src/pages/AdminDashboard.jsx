import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Settings,
  ArrowUpRight,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const COLORS = ['#0ea5e9', '#ec4899', '#f59e0b', '#10b981'];

const AdminDashboard = () => {
  const { profile } = useAppContext();
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [matchData, setMatchData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile.accessToken) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch admin stats
        const statsData = await apiService.getAdminStats(profile.accessToken);
        setStats(statsData);

        // Fetch vendors list
        const vendorsData = await apiService.getVendors(profile.accessToken);
        setVendors(Array.isArray(vendorsData) ? vendorsData.slice(0, 4) : []);

        // Generate match activity data from stats if available
        if (statsData?.match_activity) {
          setMatchData(statsData.match_activity);
        } else {
          // Fallback to dummy data structure if not available from API
          setMatchData([
            { name: 'Jan', matches: 0 },
            { name: 'Feb', matches: 0 },
            { name: 'Mar', matches: 0 },
            { name: 'Apr', matches: 0 },
            { name: 'May', matches: 0 },
            { name: 'Jun', matches: 0 },
          ]);
        }

        // Generate category distribution from stats if available
        if (statsData?.category_distribution) {
          setCategoryData(statsData.category_distribution);
        } else {
          // Fallback to dummy data structure
          setCategoryData([
            { name: 'Medical', value: 0 },
            { name: 'Pharma', value: 0 },
            { name: 'Lab', value: 0 },
            { name: 'Safety', value: 0 },
          ]);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [profile.accessToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="text-slate-500 font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Requesters',
      value: stats?.total_requesters?.toString() || '0',
      icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Active Vendors',
      value: stats?.active_vendors?.toString() || '0',
      icon: Store,
      color: 'text-primary-500',
      bg: 'bg-primary-50',
    },
    {
      label: 'Avg Match Score',
      value: stats?.avg_match_score ? `${stats.avg_match_score}%` : '0%',
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'System Alerts',
      value: stats?.system_alerts?.toString() || '0',
      icon: AlertCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
  ];

  const getStatusBadgeVariant = (status) => {
    if (!status) return 'default';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'active') return 'success';
    if (lowerStatus === 'pending') return 'warning';
    if (lowerStatus === 'inactive') return 'error';
    return 'default';
  };

  const getReliabilityPercentage = (reliability) => {
    if (!reliability) return 0;
    if (typeof reliability === 'number') return reliability;
    if (typeof reliability === 'string') {
      const match = reliability.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-slate-500 font-medium">Global platform health and entity management.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md">
            System Config
          </Button>
          <Button size="md">
            Verify Vendors
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-800 tracking-tight">{s.value}</h3>
              <div className="flex items-center text-[10px] font-bold text-emerald-500 mt-2">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +12% from last month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Match Activity</CardTitle>
              <CardDescription>Successful vendor matches over time.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary">Match Rate: {stats?.match_rate || '0'}%</Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            {matchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={matchData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="matches" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p className="font-medium">No match activity data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Request types across sectors.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center justify-center relative">
            {categoryData.length > 0 && categoryData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 font-medium">No category data available</p>
            )}
            {categoryData.length > 0 && (
              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    ></div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Verified Vendors</CardTitle>
          <CardDescription>New additions to the AVRE network.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {vendors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Vendor
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Specialization
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Reliability
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Operation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map((vendor, i) => (
                    <tr key={vendor.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-6 font-bold text-slate-900 group mr-1 uppercase tracking-tight">
                        {vendor.name || vendor.vendor_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-6 text-sm text-slate-500 font-medium">
                        {vendor.specialization || vendor.category || 'General'}
                      </td>
                      <td className="px-6 py-6 font-medium">
                        <Badge variant={getStatusBadgeVariant(vendor.status)}>
                          {vendor.status || 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500"
                              style={{
                                width: `${getReliabilityPercentage(vendor.reliability_score) || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600">
                            {vendor.reliability_score || vendor.reliability || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-500 font-medium">No vendors available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
