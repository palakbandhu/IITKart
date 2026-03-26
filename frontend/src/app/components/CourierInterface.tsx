import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/contexts/AppContext';
import api from '@/api/axios';
import { Header } from '@/app/components/Header';
import { Sidebar, SidebarItem } from '@/app/components/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  Bike, Bell, DollarSign, TrendingUp, CheckCircle, XCircle, Clock,
  Star, MessageSquare, Settings, User, Mail, Phone, MapPin, Package,
  Truck, AlertCircle, Store, Zap, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

function MetricCard({ label, value, icon: Icon, colorClass }: { label: string; value: string | number; icon: any; colorClass: string }) {
  return (
    <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
      <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

export function CourierInterface() {
  const navigate = useNavigate();
  const { currentUser, authLoading, logout } = useApp();

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || (currentUser.role !== 'RIDER' && currentUser.role !== 'courier')) navigate('/auth');
  }, [currentUser, authLoading, navigate]);
  if (authLoading) return null;
  if (!currentUser || (currentUser.role !== 'RIDER' && currentUser.role !== 'courier')) return null;

  const [activeTab, setActiveTab] = useState('deliveries');
  
  // Real data states
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any>({});
  const [feedbackData, setFeedbackData] = useState<{ feedbacks: any[], avgRating: string }>({ feedbacks: [], avgRating: "5.0" });
  
  const [incomingPopup, setIncomingPopup] = useState<{ open: boolean, order: any }>({ open: false, order: null });

  // Initial Data Fetch
  const fetchAllData = async () => {
    try {
      const cacheBust = `?t=${Date.now()}`;
      const [pendRes, actRes, histRes, earnRes, feedRes] = await Promise.all([
        api.get('/riders/deliveries/pending' + cacheBust).catch(e => ({ data: { data: [] }})),
        api.get('/riders/deliveries/active' + cacheBust).catch(e => ({ data: { data: [] }})),
        api.get('/riders/deliveries/history' + cacheBust).catch(e => ({ data: { data: [] }})),
        api.get('/riders/earnings' + cacheBust).catch(e => ({ data: { data: null }})),
        api.get('/riders/feedbacks' + cacheBust).catch(e => ({ data: { data: { feedbacks: [], avgRating: "5.0" } } }))
      ]);
      setPendingOrders(pendRes?.data?.data || []);
      setActiveDeliveries(actRes?.data?.data || []);
      setHistoryOrders(histRes?.data?.data || []);
      setEarningsData(earnRes?.data?.data || null);
      setFeedbackData(feedRes?.data?.data || { feedbacks: [], avgRating: "5.0" });
    } catch(err) { console.error('Failed to sync rider data:', err); }
  };

  useEffect(() => {
    if (currentUser?.role === 'RIDER' || currentUser?.role === 'courier') fetchAllData();
  }, [currentUser]);

  // Real-time Polling for new broadcast deliveries
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/riders/deliveries/pending');
        const latestPending = res.data.data as any[];
        
        // Check for new orders that we haven't seen in our current state array
        // Also don't show popup if they already have one open
        setPendingOrders(prev => {
          if (!incomingPopup.open && latestPending.length > 0) {
            const newOrders = latestPending.filter(lo => !prev.find(p => p.id === lo.id));
            if (newOrders.length > 0) {
              // Found a brand new order broadcast!
              const newest = newOrders[0];
              setIncomingPopup({ open: true, order: newest });
              // Play a sound or vibrate if available in real browsers natively here
            }
          }
          return latestPending;
        });
      } catch (err) {}
    }, 5000); // 5 second polling

    return () => clearInterval(interval);
  }, [incomingPopup.open]);

  const pendingCount = pendingOrders.length;
  const avgRating = feedbackData.avgRating || "5.0";
  const courierFeedback: any[] = feedbackData.feedbacks || [];

  const [issueDialog, setIssueDialog]       = useState({ open: false, orderId: '' });
  const [issueType, setIssueType]           = useState('');
  const [issuePriority, setIssuePriority]   = useState('medium');
  const [issueDescription, setIssueDescription] = useState('');

  const handleAccept = async (orderId: string) => {
    setIncomingPopup({ open: false, order: null });
    try {
      await api.post(`/riders/deliveries/${orderId}/accept`);
      toast.success('Order accepted! Head to pickup location 🛵');
      fetchAllData();
      setActiveTab('active');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Someone else might have claimed this delivery first.');
      fetchAllData();
    }
  };

  const handleReject = (orderId: string) => {
    setIncomingPopup({ open: false, order: null });
    // Optimistically hide it from current view until next poll ensures it's fresh
    setPendingOrders(prev => prev.filter(p => p.id !== orderId));
    toast.info('Order declined / dismissed.');
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await api.patch(`/riders/deliveries/${orderId}/delivered`);
      toast.success('Delivery marked as completed! Earnings added to wallet 💰');
      fetchAllData();
      setActiveTab('history');
    } catch (e: any) {
      toast.error('Failed to mark delivered');
    }
  };

  const navItems = [
    { id: 'deliveries', label: 'Requests',   icon: Bell      },
    { id: 'active',     label: 'Active',     icon: Truck     },
    { id: 'history',    label: 'History',    icon: TrendingUp},
    { id: 'feedback',   label: 'Feedback',   icon: Star      },
    { id: 'settings',   label: 'Settings',   icon: Settings  },
  ].map(item => ({
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
              <MetricCard label="Total Earnings"   value={`₹${earningsData?.totalEarnings || 0}`}          icon={DollarSign}  colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <MetricCard label="Today's Earnings" value={`₹${earningsData?.todayEarnings || 0}`}          icon={TrendingUp}  colorClass="bg-blue-100 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400" />
              <MetricCard label="Deliveries Done"  value={earningsData?.totalDeliveries || 0}   icon={CheckCircle} colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
              <MetricCard label="Avg Rating"       value={`${avgRating} ★`}            icon={Star}        colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
            </div>

            {/* ── DELIVERY REQUESTS ── */}
            {activeTab === 'deliveries' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Delivery Requests
                    <button onClick={fetchAllData} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#7C3AED] transition-colors" title="Refresh Requests"><RefreshCw className="w-4 h-4" /></button>
                  </h1>
                  <p className="text-slate-400 text-sm">{pendingCount} new request{pendingCount !== 1 ? 's' : ''} waiting</p>
                </div>
                {pendingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Bell className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No pending requests</h3>
                    <p className="text-slate-400 text-sm">New orders will broadcast here automatically</p>
                  </div>
                ) : pendingOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/0 rounded-bl-[100px]" />
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div>
                        <p className="font-mono font-bold text-slate-400 text-xs mb-1">#{order.id}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold"><Store className="w-4 h-4 text-[#1E3A8A]" />{order.vendor?.name}</span>
                          <span className="text-slate-300">→</span>
                          <span className="flex items-center gap-1.5 text-slate-500"><MapPin className="w-4 h-4 text-[#F97316]" />{order.deliveryAddress}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{order.estimatedEarnings}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-4"><Clock className="w-3 h-3" />{new Date(order.createdAt).toLocaleTimeString('en-IN')}</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleReject(order.id)}
                        className="flex-1 h-10 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> Ignore
                      </button>
                      <button onClick={() => handleAccept(order.id)}
                        className="flex-1 h-10 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Accept Delivery
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
                  <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Active Deliveries
                    <button onClick={fetchAllData} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#7C3AED] transition-colors" title="Refresh Active"><RefreshCw className="w-4 h-4" /></button>
                  </h1>
                </div>
                  <p className="text-slate-400 text-sm">{activeDeliveries.length} delivery{activeDeliveries.length !== 1 ? 's' : ''} in progress</p>
                </div>
                {activeDeliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Truck className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No active deliveries</h3>
                    <p className="text-slate-400 text-sm">Accept a request from the Delivery Requests tab</p>
                  </div>
                ) : activeDeliveries.map(order => (
                  <div key={order.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 shadow-md shadow-purple-100 dark:shadow-purple-900/20 overflow-hidden">
                    {/* Live banner */}
                    <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] px-4 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                      <span className="text-white text-xs font-bold">In Progress — Out for delivery</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-slate-400 text-xs mb-1">#{order.id}</p>
                          <div className="space-y-1 text-sm">
                            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold"><Store className="w-4 h-4 text-[#1E3A8A]" /> Pickup: {order.vendor?.name}</p>
                            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><MapPin className="w-4 h-4 text-[#F97316]" /> Drop: {order.deliveryAddress}</p>
                          </div>

                          <div className="mt-4 bg-white dark:bg-[#0F1E3A] p-3 rounded-xl border border-purple-100 dark:border-purple-800/30">
                            <p className="font-bold text-[#1E3A8A] dark:text-blue-400 text-xs mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Customer Details</p>
                            <p className="text-slate-700 dark:text-slate-200 text-sm font-bold">{order.user?.name || 'Customer'}</p>
                            {order.user?.phone && <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-1 font-medium"><Phone className="w-3.5 h-3.5" /> {order.user.phone}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{order.estimatedEarnings}</p>
                        </div>
                      </div>

                      {/* ✅ COURIER marks as delivered */}
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Once you've handed over the package:</p>
                        <p className="text-xs text-purple-500 dark:text-purple-400 mb-3">Tap below to confirm delivery and receive your earnings.</p>
                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Mark as Delivered
                        </button>
                      </div>

                      <button onClick={() => setIssueDialog({ open: true, orderId: order.id })}
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
                  <p className="text-slate-400 text-sm">{historyOrders.length} completed deliveries</p>
                </div>
                {historyOrders.map(d => (
                  <div key={d.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-[#0F172A] dark:text-white text-sm truncate">{d.deliveryAddress}</p>
                      </div>
                      <p className="text-xs text-slate-400">{new Date(d.updatedAt).toLocaleTimeString('en-IN')}</p>
                    </div>
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
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {o.user?.name ? o.user.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{o.user?.name || 'Customer'}</p>
                        <p className="text-slate-400 text-xs ml-2">{new Date(o.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= (o.courierRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />)}</div>
                    </div>
                    {o.courierFeedback && <p className="text-sm text-slate-600 dark:text-slate-300 italic mt-2">"{o.courierFeedback}"</p>}
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
                    <button onClick={() => { logout(); navigate('/auth'); }} className="flex-1 h-11 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors">Logout</button>
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
              onClick={async () => {
                if (!issueType || !issueDescription) { toast.error('Please fill in all fields'); return; }
                try {
                  await api.post('/riders/issues', { 
                    orderId: issueDialog.orderId,
                    issueType: issueType.toLowerCase().replace(/ /g, '_'), 
                    description: issueDescription 
                  });
                  toast.success('Issue reported successfully!');
                  setIssueDialog({ open: false, orderId: '' }); setIssueType(''); setIssuePriority('medium'); setIssueDescription('');
                } catch (error) {
                  toast.error('Failed to report issue');
                }
              }}
              className="w-full h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl transition-all active:scale-95"
            >Submit Report</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Broadcast POPUP Modal! */}
      <Dialog open={incomingPopup.open} onOpenChange={() => {}}>
        <DialogContent className="bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-2xl max-w-sm overflow-hidden p-0">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-center gap-3">
            <div className="relative">
              <span className="absolute inset-0 bg-white/40 rounded-full animate-ping" />
              <Zap className="w-6 h-6 text-white relative z-10 animate-bounce" />
            </div>
            <h2 className="text-white font-extrabold text-xl font-['Syne']">New Delivery Alert!</h2>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            {incomingPopup.order && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pickup</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{incomingPopup.order.vendor?.name}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Dropoff</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold max-w-[150px] truncate">{incomingPopup.order.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Guaranteed Pay</span>
                    <span className="text-emerald-500 dark:text-emerald-400 font-extrabold text-2xl">₹{incomingPopup.order.estimatedEarnings}</span>
                  </div>
                </div>
              </>
            )}
            
            <DialogFooter className="flex gap-3 sm:justify-center pt-2">
              <button onClick={() => handleReject(incomingPopup.order?.id)}
                className="flex-1 h-11 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                Ignore
              </button>
              <button onClick={() => handleAccept(incomingPopup.order?.id)}
                className="flex-1 h-11 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                Accept Now
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
