import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/contexts/AppContext';
import { Header } from '@/app/components/Header';
import { Sidebar, SidebarItem } from '@/app/components/Sidebar';
import { Input } from '@/app/components/ui/input';
import {
  DollarSign, ShoppingCart, Users, Store, Truck, TrendingUp,
  MessageSquare, FileText, CheckCircle, BarChart2, Search, Download
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

function MetricCard({ label, value, icon: Icon, colorClass, trend }: { label: string; value: string | number; icon: any; colorClass: string; trend?: string }) {
  return (
    <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
        {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <p className="text-xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}

const COLORS = ['#1E3A8A', '#F97316', '#10B981', '#8B5CF6', '#EF4444'];

const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: BarChart2    },
  { id: 'orders',     label: 'Orders',     icon: ShoppingCart },
  { id: 'users',      label: 'Users',      icon: Users        },
  { id: 'vendors',    label: 'Vendors',    icon: Store        },
  { id: 'complaints', label: 'Complaints', icon: MessageSquare},
  { id: 'reports',    label: 'Reports',    icon: FileText     },
];

export function AdminInterface() {
  const navigate = useNavigate();
  const { orders, vendors, users, products, updateVendor, updateUser, updateOrderStatus, currentUser, setCurrentUser, complaints, updateComplaint } = useApp();
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [searchUser, setSearchUser]   = useState('');
  const [searchVendor, setSearchVendor] = useState('');

  React.useEffect(() => { if (!currentUser || currentUser.role !== 'admin') navigate('/auth'); }, [currentUser, navigate]);
  if (!currentUser || currentUser.role !== 'admin') return null;

  const metrics = useMemo(() => {
    const total      = orders.length;
    const today      = orders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).length;
    const gmv        = orders.reduce((s, o) => s + o.total, 0);
    const commission = gmv * 0.15;
    return {
      total, today, gmv, commission,
      activeUsers:   users.filter(u => u.role === 'user').length,
      activeVendors: vendors.filter(v => v.status === 'active').length,
      pendingComplaints: (complaints || []).filter(c => c.status === 'pending').length,
      successRate:   total > 0 ? (orders.filter(o => o.status === 'delivered').length / total * 100).toFixed(1) : 0,
    };
  }, [orders, vendors, users, complaints]);

  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => ({ day, orders: 10 + i * 3 + (i % 2 ? 5 : 0), revenue: 1000 + i * 400 }));
  }, []);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    badge: item.id === 'complaints' && metrics.pendingComplaints > 0 ? metrics.pendingComplaints : undefined,
  }));

  const filteredUsers   = users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()));
  const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(searchVendor.toLowerCase()));

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) { toast.error('No data to export'); return; }
    const keys = Object.keys(data[0]);
    const csv  = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A1628] flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} activeId={activeTab} onSelect={setActiveTab} accentColor="#BE123C"
          header={
            <div>
              <p className="font-bold text-[#0F172A] dark:text-white text-sm">Admin Panel</p>
              <p className="text-xs text-slate-400 mt-0.5">IITKart Platform</p>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-6xl mx-auto">

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
              <div className="col-span-2"><MetricCard label="Total Orders" value={metrics.total} icon={ShoppingCart} colorClass="bg-blue-100 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400" trend={`+${metrics.today} today`} /></div>
              <div className="col-span-2"><MetricCard label="Platform GMV"   value={`₹${metrics.gmv.toFixed(0)}`}        icon={DollarSign}  colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" /></div>
              <MetricCard label="Commission"    value={`₹${metrics.commission.toFixed(0)}`}   icon={TrendingUp}  colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <MetricCard label="Active Users"  value={metrics.activeUsers}                    icon={Users}       colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
              <MetricCard label="Vendors"       value={metrics.activeVendors}                  icon={Store}       colorClass="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" />
              <MetricCard label="Success Rate"  value={`${metrics.successRate}%`}              icon={CheckCircle} colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <MetricCard label="Complaints"    value={metrics.pendingComplaints}              icon={MessageSquare} colorClass="bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400" />
            </div>

            {/* ── DASHBOARD ── */}
            {activeTab === 'dashboard' && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>Weekly Orders</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,138,0.06)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="orders" fill="#1E3A8A" radius={[6,6,0,0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>Order Status Distribution</h3>
                  {statusData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                          {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #EEF2FF', borderRadius: 12, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* ── ORDERS ── */}
            {activeTab === 'orders' && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>All Orders</h1>
                    <p className="text-slate-400 text-sm">{orders.length} total orders</p>
                  </div>
                  <button onClick={() => exportCSV(orders, 'orders.csv')}
                    className="flex items-center gap-2 border border-blue-100 dark:border-blue-900/30 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-50 dark:border-blue-900/20 bg-[#F0F4FF] dark:bg-[#0A1628]">
                          {['Order ID', 'Date', 'Total', 'Status', 'Payment', 'Action'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} className="border-b border-blue-50 dark:border-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{order.id}</td>
                            <td className="px-4 py-3 text-xs text-slate-400">{new Date(order.date).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-blue-300 text-sm">₹{(order.total + 30).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                order.status === 'picked'   ? 'bg-blue-100 text-blue-700' :
                                order.status === 'accepted' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'}`}>{order.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${order.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {order.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 italic">
                              {order.status === 'delivered' ? '✓ Delivered' : 'Awaiting courier'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Users</h1>
                    <p className="text-slate-400 text-sm">{users.length} registered users</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Search users…"
                        className="pl-9 h-9 text-sm bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-xl w-48" />
                    </div>
                    <button onClick={() => exportCSV(users, 'users.csv')}
                      className="flex items-center gap-2 border border-blue-100 dark:border-blue-900/30 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-50 dark:border-blue-900/20 bg-[#F0F4FF] dark:bg-[#0A1628]">
                          {['Name', 'Email', 'Role', 'Kart Coins', 'Status', 'Action'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id} className="border-b border-blue-50 dark:border-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#0F172A] dark:text-white text-sm">{user.name}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{user.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                                user.role === 'admin'   ? 'bg-red-100 text-red-700' :
                                user.role === 'vendor'  ? 'bg-emerald-100 text-emerald-700' :
                                user.role === 'courier' ? 'bg-purple-100 text-purple-700' :
                                'bg-blue-100 text-blue-700'}`}>{user.role}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-amber-600 text-sm">{user.kartCoins || 0}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(user as any).status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {(user as any).status === 'banned' ? 'Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => { updateUser(user.id, { status: (user as any).status === 'banned' ? 'active' : 'banned' } as any); toast.success(`User ${(user as any).status === 'banned' ? 'unbanned' : 'banned'}`); }}
                                className={`text-[10px] font-bold hover:underline ${(user as any).status === 'banned' ? 'text-emerald-600' : 'text-red-500'}`}
                              >
                                {(user as any).status === 'banned' ? 'Unban' : 'Ban'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── VENDORS ── */}
            {activeTab === 'vendors' && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Vendors</h1>
                    <p className="text-slate-400 text-sm">{vendors.length} registered vendors</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input value={searchVendor} onChange={e => setSearchVendor(e.target.value)} placeholder="Search vendors…"
                        className="pl-9 h-9 text-sm bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-xl w-48" />
                    </div>
                    <button onClick={() => exportCSV(vendors, 'vendors.csv')}
                      className="flex items-center gap-2 border border-blue-100 dark:border-blue-900/30 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVendors.map(vendor => (
                    <div key={vendor.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{vendor.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{vendor.location}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${vendor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{vendor.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: 'Rating', value: vendor.rating },
                          { label: 'Orders', value: vendor.totalOrders || 0 },
                          { label: 'Earned', value: `₹${(vendor.totalEarnings || 0).toFixed(0)}` },
                        ].map(s => (
                          <div key={s.label} className="text-center bg-[#F0F4FF] dark:bg-[#0A1628] rounded-xl p-2">
                            <p className="font-bold text-[#1E3A8A] dark:text-blue-300 text-sm">{s.value}</p>
                            <p className="text-[10px] text-slate-400">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => { updateVendor(vendor.id, { status: vendor.status === 'active' ? 'suspended' : 'active' }); toast.success(`Vendor ${vendor.status === 'active' ? 'deactivated' : 'activated'}!`); }}
                        className={`w-full h-9 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                          vendor.status === 'active'
                            ? 'bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 border-red-200 dark:border-red-900/30'
                            : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-900/30'}`}
                      >
                        {vendor.status === 'active' ? 'Deactivate Vendor' : 'Activate Vendor'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COMPLAINTS ── */}
            {activeTab === 'complaints' && (
              <div>
                <div className="mb-4">
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Complaints</h1>
                  <p className="text-slate-400 text-sm">{metrics.pendingComplaints} pending · {(complaints || []).length} total</p>
                </div>
                {(!complaints || complaints.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <MessageSquare className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <p className="text-slate-400 text-sm">No complaints filed yet</p>
                  </div>
                ) : (complaints || []).map(complaint => (
                  <div key={complaint.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-[#0F172A] dark:text-white text-sm">{complaint.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{complaint.userName} · Order #{complaint.orderId} · {new Date(complaint.date).toLocaleDateString('en-IN')}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${complaint.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{complaint.status}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{complaint.description}</p>
                    {complaint.status === 'pending' && (
                      <button onClick={() => { updateComplaint(complaint.id, { status: 'resolved' }); toast.success('Complaint resolved!'); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── REPORTS ── */}
            {activeTab === 'reports' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Generate Reports</h1>
                  <p className="text-slate-400 text-sm">Download platform data as CSV</p>
                </div>
                {[
                  { label: 'Orders Report',   desc: 'All orders with status and payment details', data: orders,   file: 'orders-report.csv'   },
                  { label: 'Users Report',    desc: 'All registered users with roles',            data: users,    file: 'users-report.csv'    },
                  { label: 'Vendors Report',  desc: 'Vendor data including earnings and ratings', data: vendors,  file: 'vendors-report.csv'  },
                  { label: 'Products Report', desc: 'Full product catalog with pricing',           data: products, file: 'products-report.csv' },
                ].map(r => (
                  <div key={r.file} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-[#0F172A] dark:text-white text-sm">{r.label}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                    </div>
                    <button onClick={() => exportCSV(r.data, r.file)}
                      className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                ))}
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm mb-3">Platform Summary</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between"><span>Total GMV</span><span className="font-bold text-[#1E3A8A] dark:text-blue-300">₹{metrics.gmv.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Platform Commission (15%)</span><span className="font-bold text-emerald-600">₹{metrics.commission.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Total Orders</span><span className="font-bold text-[#0F172A] dark:text-white">{metrics.total}</span></div>
                    <div className="flex justify-between"><span>Delivery Success Rate</span><span className="font-bold text-emerald-600">{metrics.successRate}%</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
