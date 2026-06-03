import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, XCircle, Search, AlertTriangle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const AdminCampaigns = () => {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedCreatorIds, setExpandedCreatorIds] = useState(new Set());

  const toggleCreator = (id) => setExpandedCreatorIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const fetchCampaigns = async () => {
    if (!profile?.accessToken) return;
    setLoading(true); setError(null);
    try { const d = await apiService.getAdminCampaigns(profile.accessToken); setCampaigns(Array.isArray(d) ? d : []); }
    catch (err) { setError(err?.message || 'Failed to fetch campaigns'); setCampaigns([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, [profile?.accessToken]);

  const handleVerify = async (id) => {
    try { await apiService.verifyCampaign(id, profile.accessToken, true); await fetchCampaigns(); }
    catch (err) { alert('Failed to verify campaign: ' + (err?.message || err)); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this campaign? This action cannot be undone.')) return;
    try { await apiService.adminDeleteCampaign(id, profile.accessToken); setCampaigns(prev => prev.filter(c => c.id !== id)); }
    catch (err) { alert('Failed to delete campaign: ' + (err?.message || err)); }
  };

  const handleFlag = async (id) => {
    try { await apiService.flagCampaign(id, profile.accessToken, true); alert(`Campaign ${id} has been successfully flagged for moderation review.`); await fetchCampaigns(); }
    catch (err) { alert('Failed to flag campaign: ' + (err?.message || err)); }
  };

  const getStatusBadge = (c) => c?.verified ? <Badge variant="success">Verified</Badge>
    : (c?.status === 'pending' || !c?.verified) ? <Badge variant="warning">Pending</Badge>
    : <Badge variant="default">{c?.status || 'Unknown'}</Badge>;

  const filteredCampaigns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return campaigns.filter(c => (!q || String(c?.title || '').toLowerCase().includes(q) || String(c?.creator?.name || '').toLowerCase().includes(q)) && (filterStatus === 'all' || (filterStatus === 'verified' && c?.verified) || (filterStatus === 'pending' && !c?.verified)));
  }, [campaigns, searchTerm, filterStatus]);

  const groupedCreators = useMemo(() => {
    const g = {};
    filteredCampaigns.forEach(c => {
      const cid = c.creator?.id || 'unknown';
      (g[cid] = g[cid] || { id: cid, name: c.creator?.name || 'Unknown User', email: c.creator?.email || 'No Email', avatarUrl: c.creator?.avatar_url || '', campaigns: [] }).campaigns.push(c);
    });
    return Object.values(g).sort((a, b) => a.id === 'unknown' ? 1 : b.id === 'unknown' ? -1 : a.name.localeCompare(b.name));
  }, [filteredCampaigns]);

  if (loading) return <LoadingSpinner fullPage text="Loading campaign database..." />;

  if (error) return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card>
        <CardHeader><CardTitle className="text-3xl font-display font-black text-slate-900 tracking-tight">Campaign Moderation</CardTitle><CardDescription>{error}</CardDescription></CardHeader>
        <CardContent><Button variant="secondary" size="md" onClick={fetchCampaigns}>Retry</Button></CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Campaign Moderation</h1>
          <p className="text-slate-500 font-medium tracking-tight">Review and verify fundraising campaigns for transparency.</p>
        </div>
        <Button variant="secondary" size="md" onClick={fetchCampaigns}>Refresh</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search campaign title or creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="verified">Verified Only</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {groupedCreators.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="w-12 px-6 py-4"></th>
                    {['Creator', 'Campaigns Count', 'Status Summary', 'Actions'].map((h, i) => <th key={h} className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedCreators.map((creator) => {
                    const isExpanded = expandedCreatorIds.has(creator.id);
                    const pendingCount = creator.campaigns.filter(c => !c.verified).length;
                    const verifiedCount = creator.campaigns.filter(c => c.verified).length;
                    return (
                      <React.Fragment key={creator.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleCreator(creator.id)}>
                          <td className="px-6 py-6 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5 transition-transform" /> : <ChevronDown className="w-5 h-5 transition-transform" />}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold overflow-hidden flex-shrink-0">
                                {creator.avatarUrl ? <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" /> : (creator.name || 'U')?.[0]?.toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">{creator.name}</span>
                                <span className="text-xs text-slate-500 font-medium">{creator.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-sm font-bold text-slate-900">{creator.campaigns.length} {creator.campaigns.length === 1 ? 'campaign' : 'campaigns'}</span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex gap-2">
                              {verifiedCount > 0 && <Badge variant="success">{verifiedCount} Verified</Badge>}
                              {pendingCount > 0 && <Badge variant="warning">{pendingCount} Pending</Badge>}
                              {verifiedCount === 0 && pendingCount === 0 && <span className="text-xs text-slate-400">No campaigns</span>}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="font-bold text-xs text-indigo-600 hover:text-indigo-700" onClick={() => toggleCreator(creator.id)}>
                              {isExpanded ? 'Hide Campaigns' : 'Show Campaigns'}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="px-8 py-4">
                              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                      {['Campaign Details', 'Goal', 'Raised', 'Status', 'Actions'].map((h, i) => <th key={h} className={`px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`}>{h}</th>)}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {creator.campaigns.map((c) => (
                                      <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 tracking-tight text-sm uppercase">{c.title || 'Untitled Campaign'}</span>
                                            <span className="text-[11px] text-slate-500 font-medium mt-0.5">{c.city || 'Global'} • {c.category || 'General'}</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="text-sm font-semibold text-slate-900">₹{Number(c.goal_amount || 0).toLocaleString()}</span></td>
                                        <td className="px-6 py-4"><span className="text-sm font-semibold text-slate-900">₹{Number(c.raised_amount || 0).toLocaleString()}</span></td>
                                        <td className="px-6 py-4">{getStatusBadge(c)}</td>
                                        <td className="px-6 py-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            {!c.verified && <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 text-xs rounded-lg" onClick={() => handleVerify(c.id)}>Verify</Button>}
                                            <Button variant="secondary" size="sm" className="flex items-center gap-1 font-semibold text-xs border border-slate-200" onClick={() => navigate(`/campaigns/${c.id}`, { state: { fromAdmin: true } })}><Eye className="w-3.5 h-3.5" /> Details</Button>
                                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-lg" title="Flag Content" onClick={() => handleFlag(c.id)}><AlertTriangle className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg" title="Delete Campaign" onClick={() => handleDelete(c.id)}><XCircle className="w-4 h-4" /></Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="No campaigns found" description="Change your filters or wait for users to submit new relief campaigns." variant="dashed" className="py-16" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCampaigns;
