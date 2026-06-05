import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import SaveCampaignButton from '../components/SaveCampaignButton';
import CampaignUpdatesSection from '../components/CampaignUpdatesSection';
import { motion } from 'framer-motion';
import { Heart, MapPin, Calendar, Users, ArrowLeft, AlertCircle, AlertTriangle, Edit, Trash2, XCircle, Brain, MoreVertical, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ProgressBar';
import TabBar from '../components/ui/TabBar';
import EmptyState from '../components/ui/EmptyState';
import DonationModal from '../components/DonationModal';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/formatNumber';
import { handleImageError } from '../utils/imageUtils';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const URGENCY_COLORS = { low: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' };
const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'updates', label: 'Updates' }, { id: 'donors', label: 'Users' }];

function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, triggerStatsRefresh } = useAppContext();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [relatedCampaigns, setRelatedCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState({ title: '', content: '' });
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [campaignData, donationsData, updatesData, relatedData, statsData] = await Promise.all([
        apiService.getCampaignDetails(profile?.accessToken, id),
        apiService.getCampaignDonations(profile?.accessToken, id),
        apiService.getCampaignUpdates(profile?.accessToken, id).catch(() => []),
        apiService.getRelatedCampaigns(profile?.accessToken, id).catch(() => []),
        apiService.getCampaignStats(profile?.accessToken, id).catch(() => null)
      ]);
      setCampaign(campaignData);
      setDonations(Array.isArray(donationsData) ? donationsData : []);
      setUpdates(Array.isArray(updatesData) ? updatesData : []);
      setRelatedCampaigns(Array.isArray(relatedData) ? relatedData : []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load campaign:', err);
      setError(err.message || 'Failed to load campaign details');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!profile?.isAuthenticated) { navigate('/login', { state: { from: window.location.pathname } }); return; }
    if (id) fetchCampaignData();
  }, [profile?.isAuthenticated, id]);

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.title.trim() || !newUpdate.content.trim()) { setError('Title and content are required'); return; }
    try {
      setPostingUpdate(true);
      await fetch(`${API}/campaigns/${id}/updates`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${profile?.accessToken}` }, body: JSON.stringify(newUpdate) });
      setNewUpdate({ title: '', content: '' });
      fetchCampaignData();
    } catch (err) { console.error('Failed to post update:', err); setError('Failed to post update'); }
    finally { setPostingUpdate(false); }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!window.confirm('Delete this update?')) return;
    try { await fetch(`${API}/campaigns/${id}/updates/${updateId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${profile?.accessToken}` } }); fetchCampaignData(); }
    catch (err) { console.error('Failed to delete update:', err); }
  };

  const handleCloseCampaign = async () => {
    if (!window.confirm('Are you sure you want to close this campaign? No further donations can be made.')) return;
    try { await fetch(`${API}/api/v1/campaigns/${id}/close`, { method: 'PUT', headers: { 'Authorization': `Bearer ${profile?.accessToken}` } }); fetchCampaignData(); }
    catch (err) { console.error('Failed to close campaign:', err); }
  };

  const handleDeleteCampaign = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign permanently?')) return;
    try { await apiService.deleteCampaign(profile.accessToken, id); navigate(getBackPath()); }
    catch (err) { console.error('Failed to delete campaign:', err); alert('Failed to delete campaign. It might have saved relationships or donations preventing deletion. ' + err.message); }
  };

  const handleAdminToggle = async (field, apiFn, label) => {
    try {
      const next = !campaign[field];
      await apiFn(campaign.id, profile.accessToken, next);
      setCampaign(prev => ({ ...prev, [field]: next }));
      setShowAdminMenu(false);
      alert(`Campaign ${label} status set to ${next ? label : `Un${label.toLowerCase()}`}`);
    } catch (err) { console.error(`Failed to change ${label} status:`, err); alert(`Failed to change ${label} status: ` + (err.message || err)); }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this campaign as an Admin? This action cannot be undone.')) return;
    try { await apiService.adminDeleteCampaign(campaign.id, profile.accessToken); alert('Campaign deleted successfully.'); navigate(getBackPath()); }
    catch (err) { console.error('Failed to delete campaign:', err); alert('Failed to delete campaign: ' + (err.message || err)); }
  };

  const handleSendReport = async () => {
    if (reportReason.trim().length < 5) return;
    try {
      setSubmittingReport(true);
      await apiService.reportCampaign(profile.accessToken, id, reportReason);
      setReportSuccess(true);
    } catch (err) {
      console.error('Failed to submit report:', err);
      alert('Failed to submit report: ' + (err.message || err));
    } finally {
      setSubmittingReport(false);
    }
  };

  const getPathPrefix = () => {
    const p = window.location.pathname;
    return p.includes('/user/') ? '/user' : p.includes('/admin/') ? '/admin' : '';
  };
  const getBackPath = () => location.state?.fromAdmin ? '/admin/campaigns' : `${getPathPrefix()}/campaigns`;
  const handleRelatedClick = (relatedId) => navigate(`${getPathPrefix()}/campaigns/${relatedId}`);

  if (loading) return <LoadingSpinner fullPage />;
  if (!campaign) return (
    <section className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate(getBackPath())} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"><ArrowLeft size={20} />Back to Campaigns</button>
      <div className="text-center py-12"><AlertCircle size={48} className="mx-auto text-red-500 mb-4" /><h2 className="text-2xl font-bold text-slate-900">Campaign not found</h2></div>
    </section>
  );

  const progress = (campaign.raised_amount / campaign.goal_amount) * 100;
  const isCreator = profile?.backendUserId ? Number(profile.backendUserId) === Number(campaign.created_by) : false;
  const isAdmin = profile?.userRole === 'admin' || profile?.backendRole === 'ADMIN';
  const isFunded = campaign.raised_amount >= campaign.goal_amount;
  const isInDashboard = window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/');

  const progressStats = [
    { label: 'Raised', value: formatCurrency(campaign.raised_amount || 0), cls: 'text-primary-500' },
    { label: 'Goal', value: formatCurrency(campaign.goal_amount || 0), cls: 'text-slate-900' },
    { label: 'Progress', value: `${Math.round(progress)}%`, cls: 'text-slate-900' },
  ];
  const sidebarStats = [
    { label: 'Total Donations', value: stats?.total_donations || 0 },
    { label: 'Avg Donation', value: `₹${stats?.average_donation?.toFixed(0) || 0}` },
    { label: 'Unique Users', value: stats?.unique_donors || 0 },
  ];
  const detailItems = [
    { label: 'Category', value: campaign.category },
    { label: 'Location', value: campaign.city, icon: MapPin },
    { label: 'Created', value: new Date(campaign.created_at).toLocaleDateString() },
    ...(campaign.deadline ? [{ label: 'Deadline', value: new Date(campaign.deadline).toLocaleDateString(), icon: Calendar }] : []),
  ];
  const adminMenuItems = [
    { label: campaign.verified ? 'Unverify Campaign' : 'Verify Campaign', icon: CheckCircle, iconCls: campaign.verified ? 'text-amber-500' : 'text-emerald-500', onClick: () => handleAdminToggle('verified', apiService.verifyCampaign, 'Verified'), cls: 'text-slate-700 hover:bg-slate-50' },
    { label: campaign.is_flagged ? 'Unflag Campaign' : 'Flag Campaign', icon: AlertCircle, iconCls: campaign.is_flagged ? 'text-slate-500' : 'text-rose-500', onClick: () => handleAdminToggle('is_flagged', apiService.flagCampaign, 'Flagged'), cls: 'text-slate-700 hover:bg-slate-50' },
    { divider: true },
    { label: 'Delete Campaign', icon: Trash2, iconCls: 'text-red-500', onClick: handleAdminDelete, cls: 'text-red-600 hover:bg-red-50' },
  ];

  return (
    <section className={cn("bg-slate-50 min-h-screen", isInDashboard && "bg-transparent min-h-0")}>
      <div className={cn("border-b", isInDashboard ? "bg-transparent border-transparent" : "bg-white border-slate-200")}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button onClick={() => navigate(getBackPath())} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"><ArrowLeft size={20} />Back to Campaigns</button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" /><div className="text-red-800">{error}</div>
          </motion.div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {campaign.cover_image ? (
                <div className="relative aspect-[16/9] md:aspect-auto md:h-96 overflow-hidden rounded-3xl shadow-xl">
                  <img src={campaign.cover_image} alt={campaign.title} className="w-full h-full object-cover" onError={handleImageError(campaign.category)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                </div>
              ) : (
                <div className="w-full aspect-[16/9] md:aspect-auto md:h-96 bg-primary-gradient rounded-3xl flex items-center justify-center shadow-xl"><Heart size={64} className="text-white opacity-50" /></div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-1 space-y-4">
                  <h1 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight leading-tight uppercase break-words">{campaign.title}</h1>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", URGENCY_COLORS[campaign.urgency_level] || URGENCY_COLORS.medium)}>{campaign.urgency_level}</Badge>
                    {campaign.verified && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase tracking-widest flex-shrink-0">✓ Verified</Badge>}
                    {campaign.verification_status === 'FAILED' && <Badge className="bg-red-50 text-red-600 border-red-100 text-[10px] font-black uppercase tracking-widest flex-shrink-0 animate-pulse">✗ Failed</Badge>}
                    {campaign.trust_score > 0 && <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase tracking-widest flex-shrink-0">★ {campaign.trust_score}% Trust</Badge>}
                    <span className="text-sm font-bold text-slate-400 break-words w-full sm:w-auto">
                      BY <button onClick={() => navigate(`/user/profiles/${campaign.created_by}`)} className="text-slate-900 font-black hover:text-primary-500 transition-colors uppercase">{campaign.creator_name || 'Anonymous'}</button>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 relative">
                  {profile.isAuthenticated && <SaveCampaignButton campaignId={campaign.id} token={profile.accessToken} />}
                  {profile.isAuthenticated && !isCreator && (
                    <button onClick={() => setShowReportModal(true)} className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg flex-shrink-0 text-slate-600 hover:text-amber-600 transition-colors" title="Report Campaign">
                      <AlertTriangle size={20} />
                    </button>
                  )}
                  {isAdmin && (
                    <div className="relative">
                      <button onClick={() => setShowAdminMenu(!showAdminMenu)} className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg flex-shrink-0" title="Admin Controls"><MoreVertical size={20} className="text-slate-600" /></button>
                      {showAdminMenu && (<>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAdminMenu(false)} />
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                          <div className="p-1.5 space-y-0.5 text-left">
                            {adminMenuItems.map((item, i) => item.divider ? <div key={i} className="h-px bg-slate-100 my-1" /> : (
                              <button key={i} className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold ${item.cls} rounded-lg transition-colors uppercase tracking-wider`} onClick={item.onClick}>
                                <item.icon size={16} className={item.iconCls} />{item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>)}
                    </div>
                  )}
                  {isCreator && (<>
                    <button onClick={() => navigate(`/user/campaigns/edit/${campaign.id}`)} className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0" title="Edit Campaign"><Edit size={20} className="text-slate-600" /></button>
                    {campaign.status !== 'COMPLETED' && <button onClick={handleCloseCampaign} className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0" title="Close Campaign"><XCircle size={20} className="text-amber-500" /></button>}
                    <button onClick={handleDeleteCampaign} className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0" title="Delete Campaign"><Trash2 size={20} className="text-rose-500" /></button>
                  </>)}
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[2rem] p-8 border-none ring-1 ring-slate-100 shadow-soft">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                {progressStats.map(s => (
                  <div key={s.label} className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className={`text-3xl font-display font-black ${s.cls} tracking-tight`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <ProgressBar value={Math.min(progress, 100)} color="bg-primary-gradient" trackColor="bg-slate-100" className="mb-6" height="h-3" />
              {stats && (
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {stats.unique_donors || 0} Supporters</span>
                  <span className="flex items-center gap-1.5"><Heart className="w-3 h-3" /> {stats.total_donations || 0} Donations</span>
                </div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* AI Verification Report Widget */}
                  {campaign.verification_report && (
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-soft space-y-4">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-2.5">
                          <Brain className="w-6 h-6 text-indigo-500" />
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">AI Trust & Verification Report</h3>
                            <p className="text-xs text-slate-500 font-medium">Fusing Image Forensics, OCR, YOLO, LayoutLM & XGBoost</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trust Score</span>
                          <span className="text-3xl font-display font-black text-indigo-600">{campaign.trust_score}%</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {[
                          { label: "EXIF Metadata", val: campaign.verification_report.metadata_score, desc: campaign.verification_report.metadata_score > 0.5 ? "Clean" : "Tampered" },
                          { label: "Error Level (ELA)", val: campaign.verification_report.ela_score, desc: campaign.verification_report.ela_score > 0.7 ? "Clean" : "Anomalous" },
                          { label: "OCR Confidence", val: campaign.verification_report.ocr_confidence, desc: `${Math.round(campaign.verification_report.ocr_confidence * 100)}%` },
                          { label: "Billing Check", val: campaign.verification_report.billing_score, desc: campaign.verification_report.billing_score > 0.9 ? "Valid Sum" : "Sum Mismatch" },
                          { label: "Hospital Registry", val: campaign.verification_report.hospital_score, desc: campaign.verification_report.hospital_score > 0.8 ? "Verified" : "Unknown" }
                        ].map((m, idx) => {
                          const isPassed = m.val > 0.5;
                          return (
                            <div key={idx} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center space-y-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate" title={m.label}>{m.label}</p>
                              <p className={cn("text-xs font-black uppercase tracking-wider", isPassed ? "text-emerald-600" : "text-rose-600")}>
                                {isPassed ? "PASS" : "FAIL"}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate" title={m.desc}>{m.desc}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-indigo-300 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={cn("w-5 h-5", campaign.verification_status === "VERIFIED" ? "text-emerald-400" : "text-rose-400")} />
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block">Verification Status</span>
                            <span className="text-white font-bold text-sm tracking-wide">{campaign.verification_status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block">Fraud Probability</span>
                          <span className="text-white font-bold text-sm tracking-wide">{Math.round(campaign.verification_report.fraud_probability * 100)}%</span>
                        </div>
                      </div>

                      {/* Expandable Detailed Analysis */}
                      {campaign.verification_report.report_json && (() => {
                        try {
                          const detail = JSON.parse(campaign.verification_report.report_json);
                          return (
                            <details className="group">
                              <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 py-2 transition-colors select-none">
                                <span className="transition-transform group-open:rotate-90">▶</span> Detailed Pipeline Output
                              </summary>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                {detail.exif && (
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="font-black text-slate-600 uppercase tracking-wider text-[10px] mb-1">EXIF Metadata</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Software: {detail.exif.software || 'N/A'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Modified: {detail.exif.is_modified ? 'Yes' : 'No'}</p>
                                  </div>
                                )}
                                {detail.ela && (
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="font-black text-slate-600 uppercase tracking-wider text-[10px] mb-1">Error Level Analysis</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Mean: {detail.ela.mean?.toFixed(2) || 'N/A'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Variance: {detail.ela.variance?.toFixed(2) || 'N/A'}</p>
                                  </div>
                                )}
                                {detail.ocr && (
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="font-black text-slate-600 uppercase tracking-wider text-[10px] mb-1">OCR Output</p>
                                    <p className="text-slate-500 font-mono text-[11px] line-clamp-3">{detail.ocr.text?.substring(0, 150) || 'N/A'}...</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Confidence: {(detail.ocr.confidence * 100)?.toFixed(0)}%</p>
                                  </div>
                                )}
                                {detail.yolo && (
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="font-black text-slate-600 uppercase tracking-wider text-[10px] mb-1">YOLO Layout Detection</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Logo: {detail.yolo.logo_confidence?.toFixed(2) || '0.00'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Signature: {detail.yolo.signature_confidence?.toFixed(2) || '0.00'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Stamp: {detail.yolo.stamp_confidence?.toFixed(2) || '0.00'}</p>
                                  </div>
                                )}
                                {detail.billing && (
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="font-black text-slate-600 uppercase tracking-wider text-[10px] mb-1">Billing Validation</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Computed Total: ₹{detail.billing.computed_total?.toLocaleString() || 'N/A'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Stated Total: ₹{detail.billing.stated_total?.toLocaleString() || 'N/A'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Delta: {detail.billing.delta?.toFixed(2) || '0.00'}</p>
                                  </div>
                                )}
                                {detail.hospital && (
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="font-black text-slate-600 uppercase tracking-wider text-[10px] mb-1">Hospital Registry</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Name: {detail.hospital.name || 'N/A'}</p>
                                    <p className="text-slate-500 font-mono text-[11px]">Match: {detail.hospital.match_score?.toFixed(2) || '0.00'}</p>
                                  </div>
                                )}
                              </div>
                            </details>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-6 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">About this campaign</h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">Campaign Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {detailItems.map(d => (
                        <div key={d.label}>
                          <p className="text-slate-600">{d.label}</p>
                          <p className="font-medium text-slate-900 flex items-center gap-2">{d.icon && <d.icon size={16} />}{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {isCreator && campaign.ai_analysis_data && (
                    <div className="bg-white rounded-lg p-6 border border-slate-200 mt-4 border-l-4 border-l-green-500">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-green-500" />AI Analysis Data (Creator Only)</h3>
                      {(() => { try {
                        const data = JSON.parse(campaign.ai_analysis_data);
                        return data.aiData ? (
                          <div className="space-y-4 text-sm">
                            <div className="bg-slate-50 p-4 rounded-lg">
                              <p className="font-bold text-slate-800 mb-2">Text Analysis</p>
                              <p className="text-slate-700 whitespace-pre-wrap">{data.aiData.suggestions}</p>
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                {[{ label: 'Extracted Goal', value: `₹${data.aiData.extracted_goal || 'N/A'}` }, { label: 'Predicted Category', value: data.aiData.predicted_category || 'N/A' }].map(a => (
                                  <div key={a.label}><span className="text-slate-500 text-xs">{a.label}</span><p className="font-medium">{a.value}</p></div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null;
                      } catch { return <p className="text-red-500">Failed to parse AI data.</p>; } })()}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'updates' && <CampaignUpdatesSection campaignId={campaign.id} isCreator={isCreator} onUpdateCreated={fetchCampaignData} />}
              {activeTab === 'donors' && (
                <div>
                  {donations.length === 0 ? (
                    <EmptyState icon={Heart} title="No donations" description="No public donations yet" variant="dashed" className="py-12" />
                  ) : (
                    <div className="space-y-3">
                      {donations.map((donation) => (
                        <motion.div key={donation.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-lg p-4 border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">{donation.donor_name?.charAt(0).toUpperCase() || '?'}</div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{donation.donor_name}</p>
                              {donation.donor_city && <p className="text-xs text-slate-600">{donation.donor_city}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">₹{donation.amount?.toFixed(0)}</p>
                            {donation.message && <p className="text-xs text-slate-500 italic">"{donation.message}"</p>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="sticky bottom-6 md:static z-50">
              <Button onClick={() => setShowDonationModal(true)} disabled={isFunded} className="w-full h-16 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary-500/40 flex items-center justify-center gap-3 border-4 border-white md:border-none">
                <Heart size={20} className="fill-white" />{isFunded ? 'Goal Achieved' : 'Support This Cause'}
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-lg p-6 border border-slate-200 space-y-4">
              <h3 className="font-semibold text-slate-900">Campaign Stats</h3>
              <div className="space-y-3 text-sm">
                {sidebarStats.map(s => (
                  <div key={s.label} className="flex justify-between"><span className="text-slate-600">{s.label}</span><span className="font-semibold">{s.value}</span></div>
                ))}
              </div>
            </motion.div>
            {relatedCampaigns.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-lg p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Related Campaigns</h3>
                <div className="space-y-3">
                  {relatedCampaigns.map((related) => (
                    <motion.button key={related.id} onClick={() => handleRelatedClick(related.id)} whileHover={{ scale: 1.02 }} className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <p className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">{related.title}</p>
                      <p className="text-xs text-slate-600 flex items-center gap-1"><MapPin size={12} />{related.city}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      {showDonationModal && (
        <DonationModal campaign={campaign} onClose={() => setShowDonationModal(false)} onDonationSuccess={() => { setShowDonationModal(false); fetchCampaignData(); triggerStatsRefresh(); }} />
      )}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-display font-black tracking-tight uppercase">Report Campaign</h3>
            </div>
            {reportSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Thank you for your report</h4>
                <p className="text-sm text-slate-500 font-medium">Our moderation team and AI models are reviewing this campaign to ensure safety and integrity.</p>
                <Button variant="secondary" onClick={() => { setShowReportModal(false); setReportSuccess(false); setReportReason(''); }} className="w-full mt-4">Close</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 font-medium">Please explain why you are reporting this campaign. Our system will run an AI analysis on your report reason to assist administrators.</p>
                <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Explain the issue (minimum 5 characters)..." className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-sm resize-none font-medium text-slate-900" />
                <div className="flex gap-3 mt-6">
                  <Button variant="secondary" onClick={() => { setShowReportModal(false); setReportReason(''); }} className="flex-1 font-bold">Cancel</Button>
                  <Button onClick={handleSendReport} disabled={submittingReport || reportReason.trim().length < 5} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl disabled:opacity-50">
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
export default CampaignDetailPage;
