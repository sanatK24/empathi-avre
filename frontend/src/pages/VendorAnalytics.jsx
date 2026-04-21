import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BarChart3, TrendingUp, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const VendorAnalytics = () => {
  const { profile } = useAppContext();
  const [analytics, setAnalytics] = useState({
    total_orders: '0',
    revenue: '₹0',
    avg_lead_time: '0m',
    match_rate: '0%',
    freshness: '0%',
    stock_coverage: '0%',
    match_accuracy: '0%'
  });
  const [loading, setLoading] = useState(true);
  const [chartData] = useState([
    { day: 'Mon', supply: 400, demand: 240 },
    { day: 'Tue', supply: 320, demand: 380 },
    { day: 'Wed', supply: 200, demand: 200 },
    { day: 'Thu', supply: 278, demand: 390 },
    { day: 'Fri', supply: 189, demand: 480 },
    { day: 'Sat', supply: 239, demand: 380 },
    { day: 'Sun', supply: 349, demand: 430 }
  ]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!profile?.accessToken) return;
      try {
        const data = await apiService.getVendorAnalytics?.(profile.accessToken) || {};
        setAnalytics(data);
      } catch (error) {
        console.warn('Failed to load analytics, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [profile?.accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase">Analytics Suite</h1>
        <p className="text-slate-500 font-medium text-lg">Detailed insights into your supply performance and market trends.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Total Orders', value: analytics.total_orders, trend: '+14%', up: true },
           { label: 'Revenue', value: analytics.revenue, trend: '+8%', up: true },
           { label: 'Avg lead Time', value: analytics.avg_lead_time, trend: '-2m', up: true },
           { label: 'Match Rate', value: analytics.match_rate, trend: '-1%', up: false },
         ].map((s, i) => (
           <Card key={i} className="border-none ring-1 ring-slate-100 shadow-soft">
              <CardContent className="p-6">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                 <div className="flex items-end justify-between">
                    <h4 className="text-2xl font-display font-black text-slate-900">{s.value}</h4>
                    <div className={`flex items-center text-xs font-bold ${s.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                       {s.up ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                       {s.trend}
                    </div>
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 border-none ring-1 ring-slate-100 shadow-soft overflow-hidden">
            <CardHeader className="p-8">
               <CardTitle className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Supply vs Demand (Weekly)</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
               <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                     <XAxis dataKey="day" stroke="#94a3b8" />
                     <YAxis stroke="#94a3b8" />
                     <Tooltip
                        contentStyle={{
                           backgroundColor: '#fff',
                           border: '1px solid #e2e8f0',
                           borderRadius: '8px'
                        }}
                     />
                     <Legend />
                     <Bar dataKey="supply" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Supply (Units)" />
                     <Bar dataKey="demand" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Demand (Units)" />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>

         <Card className="border-none ring-1 ring-slate-100 shadow-soft">
            <CardHeader className="p-8">
               <CardTitle className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Resource Health</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
               {[
                 { label: 'Freshness', value: parseFloat(analytics.freshness) || 0 },
                 { label: 'Stock coverage', value: parseFloat(analytics.stock_coverage) || 0 },
                 { label: 'Match Accuracy', value: parseFloat(analytics.match_accuracy) || 0 },
               ].map((item, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                       <span className="text-slate-500 uppercase tracking-wider">{item.label}</span>
                       <span className="text-slate-900">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-primary-500 rounded-full" 
                         style={{ width: `${item.value}%` }}
                       />
                    </div>
                 </div>
               ))}
            </CardContent>
         </Card>
      </div>
    </div>
  );
};

export default VendorAnalytics;
