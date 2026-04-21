import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  History, 
  DollarSign, 
  Download, 
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const DonationPage = () => {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState({
    totalDonated: 0,
    campaignsSupported: 0,
    impactScore: 0,
    rank: 'New Supporter'
  });

  const [donationHistory, setDonationHistory] = useState([]);

  useEffect(() => {
    // Fetch real donation data
    const fetchDonations = async () => {
      try {
        setLoading(true);
        // apiService.getMyDonations(profile.accessToken)
        // For now, if no endpoint, we keep it as empty array
      } catch (err) {
        console.error("Donations fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    if (profile.accessToken) fetchDonations();
  }, [profile.accessToken]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
             <Heart className="w-10 h-10 text-rose-500" /> My Donations
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-2">
            Track your contributions and the impact you're making.
          </p>
        </div>
        <Button size="lg" onClick={() => window.location.href='/user/campaigns'}>
          Browse Campaigns <ArrowUpRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Donated', value: `$${stats.totalDonated.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Campaigns Support', value: stats.campaignsSupported, icon: TrendingUp, color: 'text-primary-500', bg: 'bg-primary-50' },
          { label: 'Impact Score', value: stats.impactScore, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Donor Rank', value: stats.rank, icon: Badge, iconComp: <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-none">{stats.rank}</Badge>, isCustom: true }
        ].map((item, i) => (
          <Card key={i} className="border-none ring-1 ring-slate-100 shadow-soft">
            <CardContent className="p-6">
              {item.isCustom ? (
                <div className="flex flex-col h-full justify-between">
                  {item.iconComp}
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <h3 className="text-xl font-display font-black text-slate-900 mt-1">Benefactor Level</h3>
                  </div>
                </div>
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
                  <h3 className="text-2xl font-display font-black text-slate-900 mt-1">{item.value}</h3>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History Table */}
      <Card className="border-none ring-1 ring-slate-100 shadow-premium overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" /> Donation History
            </CardTitle>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500">Download All CSV</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign / Cause</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {donationHistory.map((don) => (
                  <tr key={don.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{don.campaign}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {don.id}</div>
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-slate-500">{don.date}</td>
                    <td className="px-8 py-6 text-sm font-black text-slate-900">${don.amount.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <Badge variant="success" className="bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {don.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <Button variant="ghost" size="sm" className="text-primary-500 font-black text-[10px] uppercase tracking-widest hover:bg-primary-50">
                          <Download className="w-3 h-3 mr-1" /> Download
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {donationHistory.length === 0 && (
            <div className="py-20 text-center">
              <Heart className="w-12 h-12 text-slate-100 mx-auto mb-4" />
              <p className="text-slate-400 font-medium italic">You haven't made any donations yet.</p>
              <Button variant="outline" className="mt-6 border-slate-200" onClick={() => window.location.href='/user/campaigns'}>
                Help a Cause Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impact Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card className="bg-indigo-600 text-white border-none shadow-premium overflow-hidden relative">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mb-16 -mr-16"></div>
            <CardContent className="p-8">
               <h3 className="text-lg font-display font-black uppercase mb-4">Cumulative Impact</h3>
               <p className="text-indigo-100 font-medium mb-6 leading-relaxed">
                 {stats.totalDonated > 0 
                   ? `Your contributions have supported ${stats.campaignsSupported} critical initiatives across the network.`
                   : "You haven't supported any campaigns yet. Start your impact journey by browsing active initiatives."}
               </p>
               <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest shadow-none">
                 View Impact Map <ExternalLink className="w-3 h-3 ml-2" />
               </Button>
            </CardContent>
         </Card>
         
         <Card className="border-none ring-1 ring-slate-100 shadow-soft">
            <CardContent className="p-8">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Transparency Report</h3>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                     <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Verified Utilization: 98.4%</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                     <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">System overhead: 1.6%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic pt-4">
                    EmpathI ensures that 100% of your primary donation reaches the campaign, with system costs covered by corporate partners.
                  </p>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};

export default DonationPage;
