import React, { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ChevronDown,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const InventoryManagement = () => {
  const { profile } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total_value: '$0',
    low_stock_alerts: '0 Items',
    active_requests: '0'
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    resource_name: '',
    category: 'Medical',
    quantity: '',
    price: '',
    reorder_level: ''
  });

  useEffect(() => {
    const loadData = async () => {
      if (!profile.accessToken) return;
      try {
        const [invData, statsData] = await Promise.all([
          apiService.getInventory(profile.accessToken),
          apiService.getVendorStats(profile.accessToken)
        ]);
        setItems(invData.map(item => ({
            id: `INV-${item.id.toString().padStart(3, '0')}`,
            dbId: item.id,
            name: item.resource_name,
            category: item.category,
            quantity: item.quantity,
            price: item.price || 0,
            reorder_level: item.reorder_level || 0,
            unit: 'units',
            status: item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock',
            health: 'Fresh'
        })));
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load inventory:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile.accessToken]);

  const exportToCSV = () => {
    const filteredItems = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (categoryFilter === 'All Categories' || item.category === categoryFilter)
    );

    if (filteredItems.length === 0) {
      alert('No items to export');
      return;
    }

    const headers = ['Resource ID', 'Resource Name', 'Category', 'Quantity', 'Price (₹)', 'Reorder Level', 'Status'];
    const rows = filteredItems.map(item => [
      item.id,
      item.name,
      item.category,
      item.quantity,
      item.price,
      item.reorder_level,
      item.status
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleAddItem = async () => {
    if (!formData.resource_name || !formData.quantity || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await apiService.addInventory(profile.accessToken, {
        resource_name: formData.resource_name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        reorder_level: parseInt(formData.reorder_level) || 100
      });

      setFormData({
        resource_name: '',
        category: 'Medical',
        quantity: '',
        price: '',
        reorder_level: ''
      });
      setShowAddForm(false);

      // Reload inventory
      const invData = await apiService.getInventory(profile.accessToken);
      setItems(invData.map(item => ({
        id: `INV-${item.id.toString().padStart(3, '0')}`,
        dbId: item.id,
        name: item.resource_name,
        category: item.category,
        quantity: item.quantity,
        price: item.price || 0,
        reorder_level: item.reorder_level || 0,
        unit: 'units',
        status: item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock',
        health: 'Fresh'
      })));
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    }
  };

  const getCategories = () => {
    const cats = new Set(items.map(item => item.category));
    return ['All Categories', ...Array.from(cats).sort()];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-slate-500 font-medium">Manage your stock levels and resource freshness metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="shadow-none border-slate-200" onClick={exportToCSV}>
             Export Data
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
             <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Total Value', value: stats.total_value, icon: Package, color: 'text-primary-500', bg: 'bg-primary-50' },
           { label: 'Low Stock Alerts', value: stats.low_stock_alerts, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' },
           { label: 'Active Requests', value: stats.active_requests, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50' },
         ].map((s, i) => (
           <Card key={i}>
              <CardContent className="p-6 flex items-center space-x-4">
                 <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                    <h4 className="text-2xl font-display font-black text-slate-900">{s.value}</h4>
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      <Card className="overflow-hidden border-none ring-1 ring-slate-100">
        <CardHeader className="bg-white border-b border-slate-50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="ghost" size="sm" className="font-bold text-slate-600">
                   <Filter className="w-4 h-4 mr-2" /> {categoryFilter} <ChevronDown className="w-3 h-3 ml-2" />
                </Button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 hidden group-hover:block">
                  {getCategories().map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors ${
                        categoryFilter === cat ? 'bg-primary-50 text-primary-600' : 'text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-100 mx-2"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Showing {items.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (categoryFilter === 'All Categories' || item.category === categoryFilter)
              ).length} total items</p>
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Level</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Health</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.filter(item =>
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    (categoryFilter === 'All Categories' || item.category === categoryFilter)
                  ).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-6 text-sm font-bold text-slate-400">{item.id}</td>
                      <td className="px-6 py-6">
                         <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                               <Package className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</span>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                         <Badge variant="secondary" className="capitalize">{item.category}</Badge>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex flex-col gap-1">
                            <span className={cn(
                                "text-sm font-bold",
                                item.status === 'Low Stock' ? 'text-rose-500' : 'text-slate-900'
                            )}>
                                {item.quantity} {item.unit}
                            </span>
                            <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                               <div className={cn(
                                   "h-full rounded-full",
                                   item.quantity > 1000 ? 'bg-emerald-500' : item.quantity > 500 ? 'bg-primary-500' : 'bg-rose-500'
                               )} style={{ width: `${Math.min(item.quantity / 5000 * 100, 100)}%` }}></div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                         <Badge variant={item.health === 'Fresh' ? 'success' : item.health === 'Expiring Soon' ? 'warning' : 'secondary'}>
                            {item.health}
                         </Badge>
                      </td>
                      <td className="px-6 py-6 text-right">
                         <div className="flex items-center justify-end space-x-2">
                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary-500">
                                <Edit3 className="w-4 h-4" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-500">
                                <Trash2 className="w-4 h-4" />
                             </Button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
           {items.length === 0 && (
             <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                   <Package className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No items found</h3>
                <p className="text-slate-500 max-w-xs mx-auto">Start adding items to your inventory to receive matching requests.</p>
             </div>
           )}
        </CardContent>
      </Card>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-black text-slate-900">Add Inventory Item</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 ml-1 block mb-2">Resource Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Oxygen Cylinder"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                  value={formData.resource_name}
                  onChange={e => setFormData({...formData, resource_name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 ml-1 block mb-2">Category</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option>Medical</option>
                  <option>Emergency</option>
                  <option>Relief</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 ml-1 block mb-2">Quantity *</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 ml-1 block mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 ml-1 block mb-2">Reorder Level</label>
                <input
                  type="number"
                  placeholder="100"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                  value={formData.reorder_level}
                  onChange={e => setFormData({...formData, reorder_level: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  className="flex-1 shadow-none border-slate-200"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddItem}
                >
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


export default InventoryManagement;
