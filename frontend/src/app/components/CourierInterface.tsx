import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/contexts/AppContext';
import { Header } from '@/app/components/Header';
import { Sidebar, SidebarItem } from '@/app/components/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  Bike, Bell, DollarSign, TrendingUp, CheckCircle, XCircle, Clock,
  Star, MessageSquare, Settings, User, Mail, Phone, MapPin, Package,
  Truck, AlertCircle, Store, X
} from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryNotification {
  id: string; orderId: string; from: string; to: string;
  distance: string; earnings: number; items: number;
  status: 'pending' | 'accepted' | 'completed'; time: string;
}

function MetricCard({ label, value, icon: Icon, colorClass }: { label: string; value: string | number; icon: any; colorClass: string }) {
  return (
    <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
      <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

const NAV_ITEMS: SidebarItem[] = [
  { id: 'deliveries', label: 'Requests',   icon: Bell      },
  { id: 'active',     label: 'Active',     icon: Truck     },
  { id: 'history',    label: 'History',    icon: TrendingUp},
  { id: 'feedback',   label: 'Feedback',   icon: Star      },
  { id: 'settings',   label: 'Settings',   icon: Settings  },
];

export function CourierInterface() {
  const navigate = useNavigate();
  const { orders, currentUser, setCurrentUser, updateOrderStatus, updateUser } = useApp();

  useEffect(() => { if (!currentUser || currentUser.role !== 'courier') navigate('/auth'); }, [currentUser, navigate]);
  if (!currentUser || currentUser.role !== 'courier') return null;

  const [activeTab, setActiveTab] = useState('deliveries');
  const ignoredOrders = currentUser?.ignoredOrders || [];
  const [notifications, setNotifications] = useState<DeliveryNotification[]>(
    orders.filter(o => o.status === 'pending' && !ignoredOrders.includes(o.id)).slice(0, 3).map((order, idx) => ({
      id: `notif-${order.id}`, orderId: order.id,
      from: ['Campus Cafe', 'PrintHub', 'QuickWash'][idx % 3],
      to: ['Hall 2, Room 201', 'Hall 5, Room 102', 'Hall 3, Room 305'][idx % 3],
      distance: `${(0.5 + idx * 0.4 + 0.5).toFixed(1)} km`,
      earnings: Math.floor(order.total * 0.15) + 20,
      items: order.products.length, status: 'pending', time: 'Just now'
    }))
  );
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliveryNotification[]>([
    { id: 'comp-1', orderId: 'ORD001', from: 'Campus Cafe',     to: 'Hall 2, Room 201', distance: '1.2 km', earnings: 45, items: 3, status: 'completed', time: '2 hours ago' },
    { id: 'comp-2', orderId: 'ORD002', from: 'Stationery Store',to: 'Hall 4, Room 105', distance: '0.8 km', earnings: 35, items: 2, status: 'completed', time: '5 hours ago' },
  ]);

  // Active deliveries this courier has accepted (from real orders)
  const activeDeliveries = useMemo(() =>
    notifications.filter(n => n.status === 'accepted'),
    [notifications]
  );

  const totalEarnings = useMemo(() => completedDeliveries.reduce((s, d) => s + d.earnings, 0), [completedDeliveries]);
  const todayEarnings = useMemo(() => completedDeliveries.slice(0, 1).reduce((s, d) => s + d.earnings, 0), [completedDeliveries]);
  const pendingCount  = notifications.filter(n => n.status === 'pending').length;

  const courierFeedback = orders.filter(o => o.courierRating);
  const avgRating = courierFeedback.length
    ? (courierFeedback.reduce((s, o) => s + (o.courierRating || 0), 0) / courierFeedback.length).toFixed(1)
    : '0.0';

  const [issueDialog, setIssueDialog]       = useState({ open: false, orderId: '' });
  const [issueType, setIssueType]           = useState('');
  const [issuePriority, setIssuePriority]   = useState('medium');
  const [issueDescription, setIssueDescription] = useState('');

  const handleAccept = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'accepted' } : n));
    toast.success('Order accepted! Head to pickup location 🛵');
  };

  const handleReject = (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && currentUser) {
      updateUser(currentUser.id, { ignoredOrders: [...(currentUser.ignoredOrders || []), notif.orderId] });
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.info('Order declined');
  };

  // ✅ Courier marks delivery as delivered
  const handleMarkDelivered = (notif: DeliveryNotification) => {
    // Update real order status if possible
    const realOrder = orders.find(o => o.id === notif.orderId);
    if (realOrder) updateOrderStatus(notif.orderId, 'delivered');

    setNotifications(prev => {
      setCompletedDeliveries(c => [{ ...notif, status: 'completed', time: 'Just now' }, ...c]);
      return prev.filter(n => n.id !== notif.id);
    });
    toast.success(`Delivery marked as completed! ₹${notif.earnings} added to your earnings 💰`);
    setActiveTab('history');
  };

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    badge: item.id === 'deliveries' && pendingCount > 0 ? pendingCount :
           item.id === 'active' && activeDeliveries.length > 0 ? activeDeliveries.length : undefined,
  }));

  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A1628] flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} activeId={activeTab} onSelect={setActiveTab} accentColor="#7C3AED"
          header={
            <div>
              <p className="font-bold text-[#0F172A] dark:text-white text-sm truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Delivery Partner</p>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-3xl mx-auto">

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Total Earnings"   value={`₹${totalEarnings}`}          icon={DollarSign}  colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <MetricCard label="Today's Earnings" value={`₹${todayEarnings}`}          icon={TrendingUp}  colorClass="bg-blue-100 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400" />
              <MetricCard label="Deliveries Done"  value={completedDeliveries.length}   icon={CheckCircle} colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
              <MetricCard label="Avg Rating"       value={`${avgRating} ★`}            icon={Star}        colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
            </div>

            {/* ── DELIVERY REQUESTS ── */}
            {activeTab === 'deliveries' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Delivery Requests</h1>
                  <p className="text-slate-400 text-sm">{pendingCount} new request{pendingCount !== 1 ? 's' : ''} waiting</p>
                </div>
                {notifications.filter(n => n.status === 'pending').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Bell className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No pending requests</h3>
                    <p className="text-slate-400 text-sm">New orders will appear here automatically</p>
                  </div>
                ) : notifications.filter(n => n.status === 'pending').map(notif => (
                  <div key={notif.id} className="relative bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
                    <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-start justify-between mb-4 pr-6">
                      <div>
                        <p className="font-mono font-bold text-slate-400 text-xs mb-1">#{notif.orderId}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold"><Store className="w-4 h-4 text-[#1E3A8A]" />{notif.from}</span>
                          <span className="text-slate-300">→</span>
                          <span className="flex items-center gap-1.5 text-slate-500"><MapPin className="w-4 h-4 text-[#F97316]" />{notif.to}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{notif.earnings}</p>
                        <p className="text-xs text-slate-400">{notif.distance} · {notif.items} item{notif.items > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-4"><Clock className="w-3 h-3" />{notif.time}</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleReject(notif.id)}
                        className="flex-1 h-10 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                      <button onClick={() => handleAccept(notif.id)}
                        className="flex-1 h-10 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ACTIVE DELIVERIES ── */}
            {activeTab === 'active' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Active Deliveries</h1>
                  <p className="text-slate-400 text-sm">{activeDeliveries.length} delivery{activeDeliveries.length !== 1 ? 's' : ''} in progress</p>
                </div>
                {activeDeliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Truck className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No active deliveries</h3>
                    <p className="text-slate-400 text-sm">Accept a request from the Delivery Requests tab</p>
                  </div>
                ) : activeDeliveries.map(notif => (
                  <div key={notif.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 shadow-md shadow-purple-100 dark:shadow-purple-900/20 overflow-hidden">
                    {/* Live banner */}
                    <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] px-4 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                      <span className="text-white text-xs font-bold">In Progress — Out for delivery</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-slate-400 text-xs mb-1">#{notif.orderId}</p>
                          <div className="space-y-1 text-sm">
                            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold"><Store className="w-4 h-4 text-[#1E3A8A]" /> Pickup: {notif.from}</p>
                            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><MapPin className="w-4 h-4 text-[#F97316]" /> Drop: {notif.to}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{notif.earnings}</p>
                          <p className="text-xs text-slate-400">{notif.distance}</p>
                        </div>
                      </div>

                      {/* ✅ COURIER marks as delivered */}
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Once you've handed over the package:</p>
                        <p className="text-xs text-purple-500 dark:text-purple-400 mb-3">Tap below to confirm delivery and receive your earnings.</p>
                        <button
                          onClick={() => handleMarkDelivered(notif)}
                          className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Mark as Delivered
                        </button>
                      </div>

                      <button onClick={() => setIssueDialog({ open: true, orderId: notif.orderId })}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-900/30 text-amber-600 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                        <AlertCircle className="w-3.5 h-3.5" /> Report an Issue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── HISTORY ── */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Delivery History</h1>
                  <p className="text-slate-400 text-sm">{completedDeliveries.length} completed deliveries</p>
                </div>
                {completedDeliveries.map(d => (
                  <div key={d.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-[#0F172A] dark:text-white text-sm truncate">{d.from}</p>
                        <span className="text-slate-300 text-xs">→</span>
                        <p className="text-slate-500 text-xs truncate">{d.to}</p>
                      </div>
                      <p className="text-xs text-slate-400">{d.distance} · {d.items} items · {d.time}</p>
                    </div>
                    <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex-shrink-0">+₹{d.earnings}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── FEEDBACK ── */}
            {activeTab === 'feedback' && (
              <div className="space-y-4">
                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Customer Feedback</h1>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm flex items-center gap-5">
                  <div className="text-5xl font-extrabold text-[#1E3A8A] dark:text-blue-300" style={{ fontFamily: 'Syne, sans-serif' }}>{avgRating}</div>
                  <div>
                    <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map(i => <Star key={i} className={`w-5 h-5 ${i <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />)}</div>
                    <p className="text-xs text-slate-400">{courierFeedback.length} ratings from customers</p>
                  </div>
                </div>
                {courierFeedback.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <MessageSquare className="w-10 h-10 text-blue-200 dark:text-blue-800 mb-3" />
                    <p className="text-slate-400 text-sm">No feedback received yet</p>
                  </div>
                ) : courierFeedback.map(o => (
                  <div key={o.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-slate-400 text-xs">#{o.id}</p>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= (o.courierRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />)}</div>
                    </div>
                    {o.courierFeedback && <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{o.courierFeedback}"</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="max-w-lg space-y-5">
                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Account Settings</h1>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm space-y-4">
                  {[
                    { label: 'Full Name', icon: User,  field: 'name',  type: 'text'  },
                    { label: 'Email',     icon: Mail,  field: 'email', type: 'email' },
                    { label: 'Phone',     icon: Phone, field: 'phone', type: 'tel'   },
                  ].map(f => {
                    const Icon = f.icon;
                    return (
                      <div key={f.field} className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{f.label}</Label>
                        <input type={f.type} defaultValue={(currentUser as any)[f.field]}
                          className="w-full h-11 bg-[#F0F4FF] dark:bg-[#0A1628] border border-blue-100 dark:border-blue-900/30 rounded-xl px-3.5 text-sm focus:outline-none focus:border-[#1E3A8A]" />
                      </div>
                    );
                  })}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => toast.success('Settings saved!')} className="flex-1 h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl text-sm transition-all active:scale-95">Save</button>
                    <button onClick={() => { setCurrentUser(null); navigate('/auth'); }} className="flex-1 h-11 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors">Logout</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Issue dialog */}
      <Dialog open={issueDialog.open} onOpenChange={open => setIssueDialog({ ...issueDialog, open })}>
        <DialogContent className="bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Report an Issue</DialogTitle>
            <DialogDescription className="text-slate-500">For order #{issueDialog.orderId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {['Customer not available', 'Wrong address', 'Item damaged', 'Safety concern', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
              <Select value={issuePriority} onValueChange={setIssuePriority}>
                <SelectTrigger className="h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high'].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</Label>
              <Textarea value={issueDescription} onChange={e => setIssueDescription(e.target.value)} placeholder="Describe the issue…"
                className="bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" rows={3} />
            </div>
            <button
              onClick={() => {
                if (!issueType || !issueDescription) { toast.error('Please fill in all fields'); return; }
                toast.success('Issue reported successfully!');
                setIssueDialog({ open: false, orderId: '' }); setIssueType(''); setIssuePriority('medium'); setIssueDescription('');
              }}
              className="w-full h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl transition-all active:scale-95"
            >Submit Report</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
