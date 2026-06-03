import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const AdminUsers = () => {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [openDropdownUserId, setOpenDropdownUserId] = useState(null);

  useEffect(() => {
    const handle = e => !e.target.closest('.activity-dropdown-container') && setOpenDropdownUserId(null);
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const fetchUsers = async () => {
    if (!profile?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getAdminUsers(profile.accessToken, 0, 1000);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to fetch users');
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [profile?.accessToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u =>
      (!q || [u.full_name, u.fullName, u.name, u.email, u.id].some(v => String(v || '').toLowerCase().includes(q))) &&
      (roleFilter === 'all' || (u.role || u.userRole || '').toLowerCase() === roleFilter)
    );
  }, [users, query, roleFilter]);

  const getRoleBadge = u => {
    const r = (u.role || u.userRole || '').toLowerCase();
    return <Badge variant={r === 'admin' ? 'success' : ['creator', 'user'].includes(r) ? 'warning' : 'default'}>{r === 'admin' ? 'Admin' : r || 'Unknown'}</Badge>;
  };

  if (loading) return <LoadingSpinner fullPage text="Loading users..." />;

  if (error) return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-display font-black text-slate-900 tracking-tight">User Management</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent><Button onClick={fetchUsers}>Retry</Button></CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium tracking-tight">Review users registered on the platform.</p>
        </div>
        <Button variant="secondary" size="md" onClick={fetchUsers} icon={null}>Refresh</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            {['all', 'admin', 'creator', 'user'].map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Users ({filtered.length})
          </CardTitle>
          <CardDescription>Showing up to 200 users. Use search to narrow results.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="Adjust filters or search for a different user." variant="dashed" className="py-16" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    {['User', 'Role', 'Status', 'Activities', 'ID'].map((h, i) => <th key={h} className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => {
                    const fullName = u.full_name || u.fullName || u.name || '—';
                    const active = u.is_active !== false;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center border border-primary-100">
                              <span className="font-black text-primary-600 text-sm">{fullName?.[0]?.toUpperCase() || 'U'}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{fullName}</div>
                              <div className="text-sm text-slate-500 truncate">{u.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">{getRoleBadge(u)}</td>
                        <td className="px-6 py-5">
                          <Badge variant={active ? 'success' : 'danger'}>
                            {active ? <ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> : <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                            {active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <div className="activity-dropdown-container relative inline-block">
                            <button
                              onClick={() => setOpenDropdownUserId(openDropdownUserId === u.id ? null : u.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{u.audit_logs?.length || 0} Activities</span>
                              <span className="text-[8px] transition-transform duration-200" style={{ transform: openDropdownUserId === u.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </button>
                            {openDropdownUserId === u.id && (
                              <div className="absolute left-0 lg:right-0 lg:left-auto mt-2 w-72 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                {u.audit_logs?.length ? u.audit_logs.map((log) => (
                                  <div key={log.id} className="text-left p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-black text-primary-600 uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</span>
                                      <span className="text-[9px] text-slate-400 font-semibold">{log.timestamp ? new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-tight">{log.details || `Resource: ${log.resource_type}`}</p>
                                  </div>
                                )) : (
                                  <div className="text-[11px] text-slate-400 font-medium py-4 text-center">No activity recorded</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right text-slate-500 font-semibold">{u.id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
