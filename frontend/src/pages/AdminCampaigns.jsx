import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { cn } from '../utils/cn';

const AdminCampaigns = () => {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, [profile.accessToken]);

  const fetchCampaigns = async () => {
    if (!profile.accessToken) return;
    try {
      setLoading(true);
      // We'll use a generic fetch if apiService doesn't have it, but let's assume it should have it
      // actually apiService.getAdminCampaigns is what we want
      const data = await apiService.getAdminCampaigns(profile.accessToken);
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (campaignId) => {
    try {
      await apiService.verifyCampaign(campaignId, profile.accessToken);
      fetchCampaigns();
    } catch (err) {
      alert('Failed to verify campaign: ' + err.message);
    }
  };
  
  const handleDelete = async (campaignId) => {
    if (!confirm('Are you sure you want to permanently delete this campaign? This action cannot be undone.')) return;
    try {
      await apiService.deleteCampaign(campaignId, profile.accessToken);
      fetchCampaigns();
    } catch (err) {
      alert('Failed to delete campaign: ' + err.message);
    }
  };

  const handleFlag = async (campaignId) => {
    try {
      await apiService.flagCampaign(campaignId, profile.accessToken);
      alert(`Campaign ${campaignId} has been successfully flagged for moderation review.`);
      fetchCampaigns();
    } catch (err) {
      alert('Failed to flag campaign: ' + err.message);
    }
  };

  const getStatusBadge = (campaign) => {
    if (campaign.verified) return <Badge variant="success">Verified</Badge>;
    if (campaign.status === 'pending' || !campaign.verified) return <Badge variant="warning">Pending</Badge>;
    return <Badge variant="default">{campaign.status}</Badge>;
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.creator?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'verified' && c.verified) || 
                          (filterStatus === 'pending' && !c.verified);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-slate-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="font-medium tracking-tight">Loading campaign database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Campaign Moderation</h1>
          <p className="text-slate-500 font-medium tracking-tight">Review and verify fundraising campaigns for transparency.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={fetchCampaigns}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search campaign title or creator..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="verified">Verified Only</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredCampaigns.length > 0 ? (
            <div className={cn(
              "transition-all duration-200",
              menuOpenId ? "overflow-visible" : "overflow-x-auto"
            )}>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Creator</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Goal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCampaigns.map((c) => (
                    <tr 
                      key={c.id} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        menuOpenId === c.id && "bg-slate-50/80 relative z-50"
                      )}
                    >
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 uppercase tracking-tight">{c.title}</span>
                          <span className="text-xs text-slate-500 font-medium mt-1">{c.city} • {c.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                            {c.creator?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{c.creator?.name || 'Unknown User'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-sm font-black text-slate-900 tracking-tight">₹{c.goal_amount?.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-6">
                        {getStatusBadge(c)}
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!c.verified && (
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => handleVerify(c.id)}
                            >
                              Verify
                            </Button>
                          )}
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "h-8 w-8 transition-all duration-200",
                                menuOpenId === c.id ? "bg-slate-100 border-slate-200" : "hover:bg-white border-transparent hover:border-slate-200"
                              )}
                              onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                            >
                              <MoreVertical className={cn("w-4 h-4 transition-colors", menuOpenId === c.id ? "text-slate-900" : "text-slate-400")} />
                            </Button>
                            
                            {menuOpenId === c.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setMenuOpenId(null)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                  <div className="p-1">
                                    <button 
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                      onClick={() => navigate(`/campaigns/${c.id}`)}
                                    >
                                      <Eye className="w-4 h-4 text-slate-400" /> View Details
                                    </button>
                                    <button 
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                      onClick={() => handleFlag(c.id)}
                                    >
                                      <AlertTriangle className="w-4 h-4 text-slate-400" /> Flag Content
                                    </button>
                                    <div className="h-px bg-slate-50 my-1"></div>
                                    <button 
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      onClick={() => {
                                        setMenuOpenId(null);
                                        handleDelete(c.id);
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 text-red-400" /> Delete
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">No campaigns found</h3>
              <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2 tracking-tight">
                Change your filters or wait for users to submit new relief campaigns.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCampaigns;
