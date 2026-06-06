import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import SaveCampaignButton from '../components/SaveCampaignButton';
import CampaignUpdatesSection from '../components/CampaignUpdatesSection';
import { Heart, MapPin, Calendar, Users, AlertCircle, AlertTriangle, Edit, Trash2, XCircle, CheckCircle, Eye, Clock, FileText } from 'lucide-react';
import Button from '../components/ui/Button'; import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner'; import ProgressBar from '../components/ProgressBar';
import TabBar from '../components/ui/TabBar'; import EmptyState from '../components/ui/EmptyState';
import DonationModal from '../components/DonationModal'; import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/formatNumber'; import { handleImageError } from '../utils/imageUtils';
const URGENCY_COLORS = { low: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' };
const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'updates', label: 'Updates' }, { id: 'donors', label: 'Users' }];
const checkSpecs = [
  { key: 'metadata_score', threshold: 0.5, name: 'EXIF Metadata', desc: 'Metadata modified/stripped.', severity: 'High', fix: 'Upload original photo.' },
  { key: 'ela_score', threshold: 0.7, name: 'Error Level Analysis (ELA)', desc: 'Digital manipulation detected.', severity: 'High', fix: 'Upload unedited scan.' },
  { key: 'ocr_confidence', threshold: 0.4, name: 'OCR Text Quality', desc: 'Text is blurry/illegible.', severity: 'Medium', fix: 'Ensure clear lighting.' },
  { key: 'billing_score', threshold: 0.9, name: 'Billing Sum Validation', desc: 'Cost mismatch detected.', severity: 'High', fix: 'Align goal with invoice total.' },
  { key: 'hospital_score', threshold: 0.8, name: 'Hospital Registry', desc: 'Hospital not verified.', severity: 'High', fix: 'Ensure name matches story.' }
];
const parseStr = {
  name: (d) => {
    if (!d) return "Recipient";
    const startMatch = d.match(/^\s*([A-Z][a-z]+)\s+is\s+(?:a|an|the)/);
    if (startMatch) return startMatch[1];
    const keywordMatch = d.match(/(?:[Pp]atient|[Ss]upport|[Hh]elp|[Ss]ave)\s+([A-Z][a-z]+)/);
    return keywordMatch ? keywordMatch[1] : "Recipient";
  },
  age: (d) => {
    if (!d) return "N/A / N/A";
    const age = d.match(/(\d+)\s*-?\s*(?:year|yr|old)/i)?.[1] || "N/A";
    let gender = d.match(/\b(male|female)\b/i)?.[0];
    if (!gender) {
      if (/\b(?:female|woman|girl|daughter)\b/i.test(d) && !/\b(?:male|man|boy|son)\b/i.test(d)) gender = "Female";
      else if (/\b(?:male|man|boy|son)\b/i.test(d) && !/\b(?:female|woman|girl|daughter)\b/i.test(d)) gender = "Male";
      else {
        const mc = (d.match(/\b(he|him|his)\b/ig) || []).length, fc = (d.match(/\b(she|her|hers)\b/ig) || []).length;
        gender = mc > fc ? "Male" : fc > mc ? "Female" : "N/A";
      }
    } else gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
    return `${age} / ${gender}`;
  },
  hosp: (d, h) => {
    if (h && h !== "Unknown" && h !== "N/A" && h !== "N/A (Non-Medical)") return h;
    const match = d?.match(/([A-Z][A-Za-z0-9\s]+(?:Hospital|Clinic|Medical\s+Center))/);
    return match ? match[1].trim() : "Medical Facility";
  },
  period: (d) => {
    const m = d?.match(/(?:from|between)\s+([A-Za-z]+\s+\d+)\s+(?:to|and)\s+([A-Za-z]+\s+\d+)/i);
    return m ? `${m[1]} - ${m[2]}` : "Not Specified";
  }
};
function CampaignDetailPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const { profile, triggerStatsRefresh } = useAppContext();
  const [campaign, setCampaign] = useState(null); const [donations, setDonations] = useState([]);
  const [updates, setUpdates] = useState([]); const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); const [verifying, setVerifying] = useState(false);
  const [modal, setModal] = useState({ donation: false, report: false, detailReport: false, trustExpl: false, copied: false });
  const [reportText, setReportText] = useState(''); const [reportSuccess, setReportSuccess] = useState(false);
  const fetchCampaignData = async () => {
    try {
      setLoading(true); setError(null);
      const [c, d, u, s] = await Promise.all([apiService.getCampaignDetails(profile?.accessToken, id), apiService.getCampaignDonations(profile?.accessToken, id), apiService.getCampaignUpdates(profile?.accessToken, id).catch(() => []), apiService.getCampaignStats(profile?.accessToken, id).catch(() => null)]);
      setCampaign(c); setDonations(Array.isArray(d) ? d : []); setUpdates(Array.isArray(u) ? u : []); setStats(s);
    } catch (err) { setError(err.message || 'Load failed'); } finally { setLoading(false); }
  };
  const handleVerify = async (file) => {
    try { setVerifying(true); await apiService.verifyCampaignDocument(profile.accessToken, campaign.id, file); await fetchCampaignData(); }
    catch (err) { setError(err?.message || 'Verification failed.'); } finally { setVerifying(false); }
  };
  useEffect(() => {
    if (!profile?.isAuthenticated) navigate('/login', { state: { from: window.location.pathname } });
    else if (id) fetchCampaignData();
  }, [profile?.isAuthenticated, id]);
  const handleClose = () => window.confirm('Close campaign?') && apiService.closeCampaign(profile.accessToken, id).then(fetchCampaignData);
  const handleDelete = (adm) => window.confirm('Delete campaign?') && (adm ? apiService.adminDeleteCampaign(campaign.id, profile.accessToken) : apiService.deleteCampaign(profile.accessToken, id)).then(() => navigate('/user/campaigns'));
  const handleAdminToggle = (f, fn) => fn(campaign.id, profile.accessToken, !campaign[f]).then(() => setCampaign(p => ({ ...p, [f]: !p[f] })));
  const handleSendReport = async () => {
    if (reportText.trim().length < 5) return;
    try { await apiService.reportCampaign(profile.accessToken, id, reportText); setReportSuccess(true); } catch (e) { alert(e.message); }
  };
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href); setModal(m => ({ ...m, copied: true }));
    setTimeout(() => setModal(m => ({ ...m, copied: false })), 2000);
  };
  if (loading) return <LoadingSpinner fullPage />;
  if (!campaign) return <section className="p-6 text-center"><AlertCircle size={48} className="mx-auto text-red-500 mb-4" /><h2 className="text-xl font-bold">Campaign not found</h2></section>;
  const progress = (campaign.raised_amount / campaign.goal_amount) * 100, isCreator = profile?.backendUserId && Number(profile.backendUserId) === Number(campaign.created_by), isAdmin = profile?.userRole === 'admin' || profile?.backendRole === 'ADMIN', isFunded = campaign.raised_amount >= campaign.goal_amount, daysLeft = campaign.deadline ? Math.max(0, Math.ceil((new Date(campaign.deadline) - new Date()) / 80000000)) : '—';
  const checks = [], suggestions = [];
  let hospitalName = "";
  if (campaign.verification_report) {
    const r = campaign.verification_report, d = JSON.parse(r.report_json || '{}'), align = d?.context_alignment?.is_aligned ?? true, dup = d?.anomalies?.some(a => /duplicate|similar/i.test(a));
    hospitalName = d?.hospital?.name || "";
    checkSpecs.forEach(s => {
      const val = r[s.key], pass = val >= s.threshold;
      checks.push({ label: s.name, status: pass ? "PASS" : (s.key === 'ocr_confidence' ? "WARNING" : "FAIL"), desc: pass ? "Clean" : (s.key === 'ocr_confidence' ? `${Math.round(val * 100)}%` : "Anomalous") });
      if (!pass) suggestions.push({ metric: s.name, desc: s.desc, severity: s.severity, reason: "Check validation failed", fix: s.fix });
    });
    checks.push({ label: "Context Alignment", status: align ? "PASS" : "WARNING", desc: align ? "Aligned" : "Mismatch" }, { label: "Duplicate Check", status: dup ? "FAIL" : "PASS", desc: dup ? "Duplicate" : "Unique" });
    if (!align) suggestions.push({ metric: "Context Alignment", desc: "Mismatched Context", severity: "Medium", reason: d?.context_alignment?.reasoning || "Campaign context mismatch", fix: "Upload matching document." });
    if (dup) suggestions.push({ metric: "Duplicate Check", desc: "Similar campaigns.", severity: "High", reason: "Matches another campaign.", fix: "Upload original document." });
    d?.anomalies?.forEach(a => suggestions.push({ metric: "AI Audit Anomaly", desc: a, severity: "Medium", reason: a, fix: "Align info on document." }));
  }
  const passedCount = checks.filter(c => c.status === "PASS").length;
  const warningCount = checks.filter(c => c.status === "WARNING").length;
  const failedCount = checks.filter(c => c.status === "FAIL").length;
  const tObj = campaign.trust_score >= 85 ? { label: "High Trust", color: "text-emerald-600" } : campaign.trust_score >= 60 ? { label: "Moderate Trust", color: "text-indigo-600" } : { label: "Low Trust", color: "text-rose-600" };
  return (
    <section className="bg-slate-50 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-800 text-sm font-medium"><AlertCircle size={20} className="shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-soft flex flex-col md:flex-row gap-6 relative">
            <div className="absolute right-6 top-6 flex items-center gap-1.5 z-20 text-[9px] font-bold uppercase">
              {profile.isAuthenticated && <SaveCampaignButton campaignId={campaign.id} token={profile.accessToken} />}
              {isCreator && <><button onClick={() => navigate(`/user/campaigns/edit/${campaign.id}`)} className="p-2 text-slate-500"><Edit size={16} /></button>{campaign.status !== 'COMPLETED' && <button onClick={handleClose} className="p-2 text-slate-500"><XCircle size={16} /></button>}<button onClick={() => handleDelete(false)} className="p-2 text-slate-500"><Trash2 size={16} /></button></>}
              {isAdmin && <><button onClick={() => handleAdminToggle('verified', apiService.verifyCampaign)} className="p-1 border rounded bg-white">Verify</button><button onClick={() => handleAdminToggle('is_flagged', apiService.flagCampaign)} className="p-1 border rounded bg-white">Flag</button><button onClick={() => handleDelete(true)} className="p-1 border rounded text-rose-500 bg-white">Delete</button></>}
            </div>
            <div className="w-full md:w-2/5 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 shrink-0">
              {campaign.cover_image ? <img src={campaign.cover_image} alt="Cover" className="w-full h-full object-cover" onError={handleImageError(campaign.category)} /> : <div className="w-full h-full bg-primary-gradient flex items-center justify-center"><Heart size={40} className="text-white opacity-50" /></div>}
            </div>
            <div className="flex-1 flex flex-col justify-between min-w-0 pr-6 space-y-3">
              <div>
                <div className="flex flex-wrap gap-1.5 items-center mb-2">
                  <Badge className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", URGENCY_COLORS[campaign.urgency_level] || URGENCY_COLORS.medium)}>{campaign.urgency_level}</Badge>
                  {campaign.verified && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase">✓ Verified</Badge>}
                  {campaign.verification_status === 'FAILED' && <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[9px] font-black uppercase">✗ Failed</Badge>}
                  {campaign.trust_score > 0 && <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase">★ {campaign.trust_score}% Trust</Badge>}
                </div>
                <h1 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight uppercase line-clamp-2">{campaign.title}</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">BY <button onClick={() => navigate(`/user/profiles/${campaign.created_by}`)} className="text-slate-950 font-black hover:text-primary-500 uppercase">{campaign.creator_name || 'Anonymous'}</button> in {campaign.city}</p>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-2">{campaign.description}</p>
              </div>
              <div className="flex gap-2.5">
                <Button onClick={() => setModal(m => ({ ...m, donation: true }))} disabled={isFunded || campaign.status === 'COMPLETED'} className="flex-1 bg-primary-500 text-white font-bold text-xs uppercase py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5"><Heart size={14} className="fill-white" /> {isFunded ? 'Goal Achieved' : 'Donate Now'}</Button>
                <button onClick={handleShare} className="px-4 py-2.5 border rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase">{modal.copied ? 'Copied!' : 'Share'}</button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-soft flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3">Trust Summary</h3>
              <div className="flex items-center gap-4 py-1.5">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="34" className="text-slate-100" strokeWidth="6" fill="transparent" /><circle cx="40" cy="40" r="34" className={cn(tObj.color)} strokeWidth="6" strokeDasharray={213.6} strokeDashoffset={213.6 - (campaign.trust_score / 100) * 213.6} strokeLinecap="round" fill="transparent" /></svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-base font-display font-black text-slate-900">{campaign.trust_score}%</span><span className="text-[8px] text-slate-400 font-bold uppercase">Trust</span></div>
                </div>
                <div><span className={cn("text-xs font-black uppercase block", tObj.color)}>{tObj.label}</span><span className="text-[10px] text-slate-500 font-medium">Computed by EmpathI forensic suite</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] py-3 border-y border-slate-100 font-mono">
              {[{ l: "Passed", v: passedCount, c: "text-emerald-500", i: CheckCircle }, { l: "Warnings", v: warningCount, c: "text-amber-500", i: AlertTriangle }, { l: "Failed", v: failedCount, c: "text-rose-500", i: XCircle }, { l: "Docs", v: campaign.verification_doc_url ? 1 : 0, c: "text-indigo-500", i: FileText }].map((x, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-500 font-semibold"><x.i size={12} className={x.c} /><span>{x.l}:</span><span className="font-bold text-slate-900 ml-auto">{x.v}</span></div>
              ))}
            </div>
            <div className="flex gap-2 text-[10px] font-bold uppercase"><button onClick={() => setModal(m => ({ ...m, detailReport: true }))} disabled={!campaign.verification_report} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl border">Full Report</button><button onClick={() => setModal(m => ({ ...m, trustExpl: true }))} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl border">How It Works</button></div>
          </div>
        </div>
        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="my-6" />
        {activeTab === 'overview' ? (
          <>
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft grid grid-cols-2 sm:grid-cols-5 gap-6 items-center">
              <div><span className="text-[9px] font-black text-slate-400 uppercase block">Raised</span><span className="text-lg font-display font-black text-primary-500">{formatCurrency(campaign.raised_amount || 0)}</span></div>
              <div><span className="text-[9px] font-black text-slate-400 uppercase block">Goal</span><span className="text-lg font-display font-black text-slate-900">{formatCurrency(campaign.goal_amount || 0)}</span></div>
              <div className="col-span-2 sm:col-span-1"><span className="text-[9px] font-black text-slate-400 uppercase block">Progress ({Math.round(progress)}%)</span><ProgressBar value={Math.min(progress, 100)} color="bg-primary-gradient" className="w-full mt-1.5" height="h-2" /></div>
              <div><span className="text-[9px] font-black text-slate-400 uppercase block">Supporters</span><span className="text-lg font-display font-black text-slate-955">{stats?.unique_donors || 0}</span></div>
              <div><span className="text-[9px] font-black text-slate-400 uppercase block">Days Left</span><span className="text-lg font-display font-black text-slate-950">{daysLeft}</span></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[40%_25%_35%] gap-6">
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
                <div className="space-y-3"><h3 className="text-xs font-bold text-slate-500 uppercase">About this campaign</h3><p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{campaign.description}</p></div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mt-4"><h4 className="text-[9px] font-black text-slate-400 uppercase">Funds will be used for:</h4><div className="space-y-1 text-[11px] font-semibold text-slate-600">{['Hospital treatment charges', 'Lab tests and medical procedures', 'Doctor consultation fees', 'Nursing care and pharmacy expenses'].map((item, idx) => (<div key={idx} className="flex items-center gap-2"><CheckCircle size={13} className="text-emerald-500 shrink-0" /><span>{item}</span></div>))}</div></div>
              </div>
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-soft space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Highlights</h3>
                <div className="space-y-3 text-xs">
                  {[{ l: 'Patient Name', v: parseStr.name(campaign.description), i: Users }, { l: 'Age / Gender', v: parseStr.age(campaign.description), i: Calendar }, { l: 'Hospital', v: parseStr.hosp(campaign.description, hospitalName), i: MapPin }, { l: 'Treatment Period', v: parseStr.period(campaign.description), i: Clock }, { l: 'Bill Amount Due', v: formatCurrency(campaign.goal_amount || 0), i: FileText }, { l: 'Campaign Created', v: new Date(campaign.created_at).toLocaleDateString(), i: Calendar }].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-xl border">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><item.i size={15} /></div>
                      <div><span className="text-[8px] text-slate-400 font-bold uppercase block">{item.l}</span><p className="font-bold text-slate-900 truncate leading-tight">{item.v}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-soft">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                  <div className="space-y-3 flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase">Verification Document</h3>
                      {campaign.verification_doc_url ? (
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center space-y-3">
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border flex items-center justify-center relative shadow-inner">{campaign.verification_doc_url.toLowerCase().endsWith('.pdf') ? <div className="text-center"><FileText size={36} className="text-indigo-400 mx-auto" /><span className="text-[10px] font-bold">PDF</span></div> : <img src={campaign.verification_doc_url} alt="Doc" className="w-full h-full object-cover" />}</div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400"><span className="font-mono truncate mr-2">{campaign.verification_doc_url.split('/').pop().substring(37)}</span><span>{new Date(campaign.created_at).toLocaleDateString()}</span></div>
                        </div>
                      ) : <div className="bg-slate-50 border border-dashed rounded-2xl p-6 text-center"><FileText size={28} className="mx-auto text-slate-400" /><p className="text-xs text-slate-500 font-semibold">No document uploaded.</p></div>}
                    </div>
                    {campaign.verification_doc_url && <a href={campaign.verification_doc_url} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border mt-2"><Eye size={13} /> View Document</a>}
                  </div>
                  <div className="space-y-3 border-t border-slate-100 pt-4 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Breakdown</h3>
                    {campaign.verification_report ? (
                      <div className="grid grid-cols-1 gap-2 text-[10px] font-semibold">
                        {checks.map((c, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-xl p-2 border flex items-center justify-between gap-1.5">
                            <div className="min-w-0"><span className="font-bold text-slate-800 block truncate">{c.label}</span><span className="text-slate-400 block truncate text-[8px] mt-0.5">{c.desc}</span></div>
                            <Badge className={cn("text-[8px] font-black uppercase px-1 py-0.5 rounded shrink-0", c.status === "PASS" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : c.status === "WARNING" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100")}>{c.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400 font-medium italic">Pending Verification...</p>}
                  </div>
                </div>
              </div>
            </div>
            {campaign.verification_report && (isCreator || isAdmin) && (
              <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-soft space-y-4">
                <div className="flex items-center justify-between border-b pb-4"><div className="flex items-center gap-2.5"><AlertCircle className="w-5 h-5 text-indigo-500" /><h3 className="text-lg font-bold">AI Diagnostic Center</h3></div>{isCreator && <div className="flex items-center gap-3"><button onClick={() => handleVerify(null)} disabled={verifying} className="bg-indigo-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs disabled:opacity-50">{verifying ? 'Verifying...' : 'Re-verify'}</button>{!verifying && <label className="bg-white text-indigo-600 border border-indigo-200 font-bold px-3.5 py-1.5 rounded-xl cursor-pointer text-xs select-none">Upload New<input type="file" onChange={(e) => handleVerify(e.target.files[0])} disabled={verifying} className="hidden" accept=".jpg,.jpeg,.png,.pdf" /></label>}</div>}</div>
                {suggestions.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border bg-white/95 text-slate-700 text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b"><th className="py-3 px-4">Issue</th><th className="py-3 px-4">Severity</th><th className="py-3 px-4">Cause</th><th className="py-3 px-4">Recommended Fix</th><th className="py-3 px-4">Re-Verify</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {suggestions.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="py-4 px-4 font-bold text-slate-900 text-[9px] align-top">{s.metric} - {s.desc}</td>
                            <td className="py-4 px-4 align-top"><Badge className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded", s.severity === "High" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600")}>{s.severity}</Badge></td>
                            <td className="py-4 px-4 font-semibold leading-relaxed align-top">{s.reason || "—"}</td>
                            <td className="py-4 px-4 font-medium leading-relaxed align-top">{s.fix}</td>
                            <td className="py-4 px-4 align-top">{isCreator && <button onClick={() => handleVerify(null)} disabled={verifying} className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded text-[9px] uppercase border">Re-Verify</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800 font-bold text-xs flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><span>All checks passed! Document is verified.</span></div>}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border shadow-soft space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Timeline</h3>
                <div className="flex items-center justify-between relative py-2 pr-2">
                  <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
                  {[{ l: 'Created', d: new Date(campaign.created_at).toLocaleDateString(), ok: true }, { l: 'Uploaded', d: campaign.verification_doc_url ? new Date(campaign.created_at).toLocaleDateString() : 'Pending', ok: !!campaign.verification_doc_url }, { l: 'AI Pipeline', d: campaign.verification_report ? 'Completed' : 'Pending', ok: !!campaign.verification_report }, { l: 'Live', d: campaign.status === 'ACTIVE' ? 'Active' : 'N/A', ok: campaign.status === 'ACTIVE' }].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center space-y-1 z-10 text-[9px]">
                      <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold", step.ok ? "bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm" : "bg-white border-slate-200 text-slate-400")}>{idx + 1}</div>
                      <span className="font-black text-slate-900 uppercase">{step.l}</span><span className="text-slate-400">{step.d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border shadow-soft space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Registry Details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  {[{ l: "Category", v: campaign.category || 'General' }, { l: "Subcategory", v: "Hospital Bills" }, { l: "Location", v: campaign.city || 'Mumbai' }, { l: "Creator", v: campaign.creator_name || 'Riyesh Kapoor' }, { l: "Registry ID", v: `EMP-2026-0606-${campaign.id}`, col: true }].map((x, i) => (
                    <div key={i} className={x.col ? "col-span-2 border-t pt-2" : ""}><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{x.l}</span><span className={cn("font-semibold text-slate-900", x.col && "font-mono text-indigo-600")}>{x.v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'updates' ? (
          <div className="bg-white rounded-3xl p-6 border shadow-soft"><CampaignUpdatesSection campaignId={campaign.id} isCreator={isCreator} onUpdateCreated={fetchCampaignData} /></div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border shadow-soft">
            {donations.length === 0 ? <EmptyState icon={Heart} title="No donations" description="No donations yet" variant="dashed" className="py-12" /> : (
              <div className="space-y-3">{donations.map((d) => (
                <div key={d.id} className="bg-white rounded-xl p-4 border flex items-center justify-between text-xs"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">{d.donor_name?.charAt(0).toUpperCase() || '?'}</div><div><p className="font-medium text-slate-900">{d.donor_name}</p>{d.donor_city && <p className="text-xs text-slate-600">{d.donor_city}</p>}</div></div><div className="text-right"><p className="font-bold text-slate-900">₹{d.amount?.toFixed(0)}</p>{d.message && <p className="text-xs text-slate-500 italic">"{d.message}"</p>}</div></div>
              ))}</div>
            )}
          </div>
        )}
      </div>
      {modal.detailReport && campaign.verification_report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white rounded-[2rem] p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4"><div className="flex items-center justify-between border-b pb-3"><h3 className="text-sm font-bold">Verification Report</h3><button onClick={() => setModal(m => ({ ...m, detailReport: false }))} className="text-slate-400 text-xs font-black uppercase">Close</button></div><pre className="text-xs font-mono text-indigo-900 bg-slate-50 p-4 rounded-2xl border overflow-x-auto">{JSON.stringify(JSON.parse(campaign.verification_report.report_json || '{}'), null, 2)}</pre></div></div>
      )}
      {modal.trustExpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white rounded-[2rem] p-6 max-w-md w-full space-y-4 text-center"><h3 className="text-base font-bold uppercase">How Trust Score is Calculated</h3><p className="text-xs text-slate-600 text-left">EXIF (15%), ELA (20%), OCR (20%), Billing (25%), Hospital (20%).</p><button onClick={() => setModal(m => ({ ...m, trustExpl: false }))} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Close</button></div></div>
      )}
      {modal.donation && <DonationModal campaign={campaign} onClose={() => setModal(m => ({ ...m, donation: false }))} onDonationSuccess={() => { setModal(m => ({ ...m, donation: false })); fetchCampaignData(); triggerStatsRefresh(); }} />}
      {modal.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white rounded-3xl p-8 max-w-md w-full"><h3 className="text-xl font-black uppercase mb-4">Report Campaign</h3>{reportSuccess ? (<div className="text-center py-6 space-y-3"><div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6" /></div><p className="text-sm font-medium">Thank you. Under review.</p><Button variant="secondary" onClick={() => { setModal(m => ({ ...m, report: false })); setReportSuccess(false); setReportText(''); }} className="w-full mt-4">Close</Button></div>) : (<div className="space-y-4"><textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Explain..." className="w-full h-32 p-4 bg-slate-50 border rounded-2xl outline-none text-sm resize-none" /><div className="flex gap-3 mt-6"><Button variant="secondary" onClick={() => { setModal(m => ({ ...m, report: false })); setReportText(''); }} className="flex-1">Cancel</Button><Button onClick={handleSendReport} disabled={reportText.trim().length < 5} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">Submit</Button></div></div>)}</div></div>
      )}
    </section>
  );
}
export default CampaignDetailPage;
