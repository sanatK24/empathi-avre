import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, CheckCircle, XCircle, MoreVertical, Eye, Phone } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { apiService } from '../services/apiService';
import { useAppContext } from '../context/AppContext';

const AdminVendorManagement = () => {
    const { profile } = useAppContext();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpenId, setMenuOpenId] = useState(null);

    const loadVendors = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAdminVendors(profile.accessToken);
            setVendors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load vendors:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile.accessToken) loadVendors();
    }, [profile.accessToken]);

    const handleStatusUpdate = async (vendorId, status) => {
        try {
            setLoading(true);
            await apiService.verifyVendor(profile.accessToken, vendorId, status);
            await loadVendors();
        } catch (error) {
            console.error("Failed to update vendor status:", error);
            alert("Verification update failed. Please try again.");
            setLoading(false);
        }
    };

    const filteredVendors = vendors.filter(v => 
        (v.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.city || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center text-slate-500">Loading compliance data...</div>;

    return (
        <div className="space-y-8 p-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Vendor Compliance</h1>
                    <p className="text-slate-500 font-medium italic">Validate and moderate service providers.</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search vendors..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={cn(
                "grid grid-cols-1 gap-4 transition-all duration-200",
                menuOpenId ? "overflow-visible" : "overflow-hidden"
            )}>
                {filteredVendors.map((vendor) => (
                    <Card key={vendor.id} className="hover:border-indigo-200 transition-colors">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                    <ShieldCheck className={vendor.verification_status === 'VERIFIED' ? "text-green-500" : "text-slate-400"} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{vendor.shop_name}</h3>
                                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{vendor.category} • {vendor.city}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-12">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <Badge variant={vendor.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
                                        {vendor.verification_status}
                                    </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {vendor.verification_status !== 'VERIFIED' ? (
                                        <Button size="sm" onClick={() => handleStatusUpdate(vendor.id, 'VERIFIED')}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                        </Button>
                                    ) : (
                                        <Button variant="secondary" size="sm" onClick={() => handleStatusUpdate(vendor.id, 'UNVERIFIED')}>
                                            <XCircle className="w-4 h-4 mr-2" /> Suspend
                                        </Button>
                                    )}
                                    <div className="relative ml-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn(
                                                "h-8 w-8 transition-all duration-200",
                                                menuOpenId === vendor.id ? "bg-slate-100 border-slate-200" : "hover:bg-white border-transparent hover:border-slate-200"
                                            )}
                                            onClick={() => setMenuOpenId(menuOpenId === vendor.id ? null : vendor.id)}
                                        >
                                            <MoreVertical className={cn("w-4 h-4 transition-colors", menuOpenId === vendor.id ? "text-slate-900" : "text-slate-400")} />
                                        </Button>
                                        
                                        {menuOpenId === vendor.id && (
                                            <>
                                                <div 
                                                    className="fixed inset-0 z-10" 
                                                    onClick={() => setMenuOpenId(null)}
                                                />
                                                <div className="absolute right-4 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                    <div className="p-1">
                                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                                                            <Eye className="w-4 h-4 text-slate-400" /> View Profile
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                                                            <Phone className="w-4 h-4 text-slate-400" /> Contact Info
                                                        </button>
                                                        <div className="h-px bg-slate-50 my-1"></div>
                                                        <button 
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to flag this vendor?')) {
                                                                    setMenuOpenId(null);
                                                                }
                                                            }}
                                                        >
                                                            <XCircle className="w-4 h-4 text-red-400" /> Flag Vendor
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredVendors.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium italic">No vendors matching your search criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminVendorManagement;
