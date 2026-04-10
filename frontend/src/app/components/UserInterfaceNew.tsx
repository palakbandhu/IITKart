import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { useApp } from '@/app/contexts/AppContext';
import { Header } from '@/app/components/Header';
import { Sidebar, SidebarItem } from '@/app/components/Sidebar';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  ShoppingCart, Search, MapPin, Plus, Minus, Trash2, Star, Heart,
  Settings, User, Wallet, Package, Camera, Mail, Phone, Home as HomeIcon,
  Bike, Store, CheckCircle, Clock, Truck, Box, AlertTriangle, Download,
  Printer, Coins, X, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentModal } from '@/app/components/PaymentModal';
import { isValidPhone } from '@/app/utils/validation';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    picked:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    accepted:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colors[status] || colors.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const NAV_ITEMS: SidebarItem[] = [
  { id: 'browse',       label: 'Browse',       icon: Search   },
  { id: 'orders',       label: 'My Orders',    icon: Package  },
  { id: 'transactions', label: 'Transactions', icon: Receipt  },
  { id: 'wallet',       label: 'Kart Coins',   icon: Coins    },
  { id: 'settings',     label: 'Settings',     icon: Settings },
];

export function UserInterface() {
  const navigate = useNavigate();
  const {
    products, currentUser, cart, addToCart, removeFromCart,
    updateCartQuantity, clearCart, addOrder, updateOrder, orders, vendors,
    updateUser, addComplaint, rateOrder, complaints, authLoading, logout, toggleFavorite: contextToggleFavorite
  } = useApp();

  const [activeTab, setActiveTab]     = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shopFilter, setShopFilter]   = useState<'all' | 'bestsellers' | 'favorites'>('all');
  const [showCart, setShowCart]       = useState(false);
  const [useKartCoins, setUseKartCoins] = useState(false);
  const [location, setLocation]       = useState(currentUser?.address || '');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [favorites, setFavorites]     = useState<string[]>(currentUser?.favorites || []);

  const [settingsData, setSettingsData] = useState({
    name: currentUser?.name || '', email: currentUser?.email || '',
    phone: currentUser?.phone || '', address: currentUser?.address || '', photo: currentUser?.photo || ''
  });

  // Sync settings data when currentUser changes (e.g., on page reload)
  React.useEffect(() => {
    if (currentUser) {
      setSettingsData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        photo: currentUser.photo || ''
      });
      // Also sync delivery location when user data loads
      setLocation(currentUser.address || '');
    }
  }, [currentUser?.id]); // Only depend on ID to avoid constant updates

  React.useEffect(() => {
    if (currentUser && currentUser.favorites) {
      setFavorites(currentUser.favorites);
    }
  }, [currentUser?.favorites]);

  const [feedbackDialog, setFeedbackDialog] = useState<{ open: boolean; orderId: string; type: 'product' | 'courier' | 'vendor' }>({ open: false, orderId: '', type: 'product' });
  const [rating, setRating]   = useState(5);
  const [feedback, setFeedback] = useState('');

  const [complaintDialog, setComplaintDialog] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' });
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (!currentUser) navigate('/auth');
  }, [currentUser, authLoading, navigate]);

  const getImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `http://localhost:5001${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const bestsellers = ['1', '7', '9', '13'];

  const filteredProducts = useMemo(() => products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      && (categoryFilter === 'all' || p.category === categoryFilter)
      && (selectedVendor === 'all' || p.vendorId === selectedVendor)
      && (shopFilter !== 'bestsellers' || bestsellers.includes(p.id))
      && (shopFilter !== 'favorites' || favorites.includes(p.id))
      && p.inStock;
  }), [products, searchQuery, categoryFilter, selectedVendor, shopFilter, favorites]);

  const groupedByVendor = useMemo(() => {
    const m = new Map<string, typeof filteredProducts>();
    filteredProducts.forEach(p => { if (!m.has(p.vendorId)) m.set(p.vendorId, []); m.get(p.vendorId)!.push(p); });
    return Array.from(m.entries());
  }, [filteredProducts]);

  const userOrders    = currentUser ? orders.filter(o => o.userId === currentUser.id) : [];
  const pendingOrders = userOrders.filter(o => o.status !== 'delivered').length;
  const cartTotal      = cart.reduce((s, i) => s + (products.find(p => p.id === i.productId)?.price || 0) * i.quantity, 0);
  const deliveryCharges = useKartCoins ? 0 : 30;
  const orderTotal     = cartTotal + deliveryCharges;
  const cartCount      = cart.reduce((s, i) => s + i.quantity, 0);

  // Update nav items with live badges
  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    badge: item.id === 'orders' && pendingOrders > 0 ? pendingOrders : undefined,
  }));

  const toggleFavorite = async (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    if (currentUser) {
      await contextToggleFavorite(id);
    }
    toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleCheckout = async () => {
    if (!location.trim()) { toast.error('Please enter a delivery location'); return; }
    if (!cart.length)     { toast.error('Your cart is empty'); return; }
    if (isProcessingCheckout) return;
    setIsProcessingCheckout(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login first');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendorId: products.find(p => p.id === cart[0].productId)?.vendorId || '',
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          deliveryAddress: location,
          paymentMethod: 'UPI',
          useKartCoins
        })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to create order');
        setIsProcessingCheckout(false);
        return;
      }

      const { data: createdOrder } = await response.json();

      setPendingOrder(createdOrder);
      setShowPaymentModal(true);
      setShowCart(false);
      setIsProcessingCheckout(false);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Checkout failed');
      setIsProcessingCheckout(false);
    }
  };

  const handlePaymentSuccess = (paymentMethod: string, totalAmount: number) => {
    clearCart();
    setShowPaymentModal(false);
    if (pendingOrder) {
      setPendingOrder(null);
      toast.success(`Order placed! You earned ${pendingOrder.kartCoinsEarned} Kart Coins`);
    }
    setActiveTab('orders');
  };

  const handleFeedbackSubmit = () => {
    rateOrder(feedbackDialog.orderId, feedbackDialog.type, rating, feedback);
    toast.success('Feedback submitted successfully');
    setFeedbackDialog({ open: false, orderId: '', type: 'product' });
    setRating(5); setFeedback('');
  };

  const handleComplaintSubmit = () => {
    if (!complaintSubject.trim() || !complaintDescription.trim()) { toast.error('Please fill in all fields'); return; }
    addComplaint({ id: `CMP${Date.now()}`, orderId: complaintDialog.orderId, userId: currentUser.id, userName: currentUser.name, userEmail: currentUser.email, subject: complaintSubject, description: complaintDescription, status: 'pending', date: new Date().toISOString(), type: 'order' });
    toast.success('Complaint submitted!');
    setComplaintDialog({ open: false, orderId: '' }); setComplaintSubject(''); setComplaintDescription('');
  };

  const generateReceipt = (order: any) => {
    const vendor = vendors.find(v => v.id === order.vendorId);
    const total  = order.total + 30;
    return `\n╔══════════════════════════════════╗\n║        ORDER RECEIPT            ║\n║           IITKart               ║\n╠══════════════════════════════════╣\n║ Order ID : ${order.id}\n║ Date     : ${new Date(order.createdAt || order.date).toLocaleString('en-IN')}\n║ Vendor   : ${vendor?.name || 'Unknown'}\n║\n║ Item Total : ₹${order.total.toFixed(2)}\n║ Delivery   : ₹30.00\n║ ────────────────────────────────\n║ TOTAL      : ₹${total.toFixed(2)}\n║\n║ Payment : ${order.paymentMethod || 'UPI'} (${order.paymentStatus === 'success' ? 'PAID ✓' : 'PENDING'})\n║ Coins   : +${order.kartCoinsEarned}\n║ Address : ${order.deliveryAddress}\n╚══════════════════════════════════╝`;
  };

  const downloadReceipt = (order: any) => {
    const blob = new Blob([generateReceipt(order)], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `IITKart-${order.id}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  };

  const printReceipt = (order: any) => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;white-space:pre;padding:20px}</style></head><body>${generateReceipt(order)}</body></html>`);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 250);
    }
  };

  if (authLoading) return null;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A1628] flex flex-col">
      <Header>
        <button
          onClick={() => setShowCart(true)}
          className="relative flex items-center gap-2 bg-white dark:bg-[#0F1E3A] border border-blue-100 dark:border-blue-900/30 hover:border-[#1E3A8A]/40 text-slate-600 dark:text-slate-300 hover:text-[#1E3A8A] dark:hover:text-blue-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Cart</span>
          {cartCount > 0 && <Badge className="bg-[#F97316] text-white text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">{cartCount}</Badge>}
        </button>
      </Header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          items={navItems}
          activeId={activeTab}
          onSelect={setActiveTab}
          accentColor="#1E3A8A"
          header={
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentUser.photo
                  ? <img src={getImageUrl(currentUser.photo)} alt="" className="w-full h-full object-cover" />
                  : <User className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#0F172A] dark:text-white text-sm truncate">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
          }
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-5xl mx-auto">

            {/* ── BROWSE ── */}
            {activeTab === 'browse' && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Browse Products</h1>
                  <p className="text-slate-400 text-sm">Order from your favourite campus shops</p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                  <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="Search products…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl focus:border-[#1E3A8A]" />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-36 h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl text-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger className="w-36 h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl text-sm">
                        <SelectValue placeholder="All Shops" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shops</SelectItem>
                        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={shopFilter} onValueChange={(v: any) => setShopFilter(v)}>
                      <SelectTrigger className="w-36 h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="bestsellers">🔥 Bestsellers</SelectItem>
                        <SelectItem value="favorites">❤️ My Favourites</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 min-w-[150px]">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="Delivery location" value={location} onChange={e => setLocation(e.target.value)}
                        className="pl-10 h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl focus:border-[#1E3A8A]" />
                    </div>
                  </div>
                </div>

                {groupedByVendor.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Search className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No products found</h3>
                    <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
                  </div>
                ) : groupedByVendor.map(([vendorId, vendorProducts]) => {
                  const vendor = vendors.find(v => v.id === vendorId);
                  return (
                    <div key={vendorId} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-blue-50 dark:border-blue-900/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Store className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0F172A] dark:text-white text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>{vendor?.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{vendor?.rating}</span>
                              <span>{vendor?.availability}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">{vendorProducts.length} items</Badge>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {vendorProducts.map(product => (
                          <div key={product.id} className="group bg-[#F0F4FF] dark:bg-[#0A1628] rounded-2xl overflow-hidden border border-blue-100/50 dark:border-blue-900/20 hover:shadow-lg hover:shadow-blue-900/10 hover:-translate-y-0.5 transition-all duration-200">
                            <div className="relative">
                              <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-28 object-cover" />
                              <button onClick={() => toggleFavorite(product.id)}
                                className="absolute top-2 right-2 w-7 h-7 bg-white/90 dark:bg-slate-800/90 rounded-full flex items-center justify-center shadow hover:scale-110 transition-transform">
                                <Heart className={`w-3.5 h-3.5 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                              </button>
                              {bestsellers.includes(product.id) && (
                                <span className="absolute top-2 left-2 bg-[#F97316] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">🔥 Best</span>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="font-bold text-[#0F172A] dark:text-white text-xs leading-tight mb-1 line-clamp-1">{product.name}</h4>
                              <p className="text-slate-400 text-[10px] mb-2 line-clamp-1">{product.description}</p>
                              {product.rating ? (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{product.rating.toFixed(1)}</span>
                                  <span className="text-[10px] text-slate-400">({product.totalReviews})</span>
                                </div>
                              ) : null}
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[#1E3A8A] dark:text-blue-300 text-sm">₹{product.price}</span>
                                <button onClick={() => { addToCart(product.id); toast.success('Added to cart!', { position: 'bottom-center' }); }}
                                  className="w-7 h-7 rounded-xl bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow">
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ORDERS ── */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>My Orders</h1>
                  <p className="text-slate-400 text-sm">{userOrders.length} order{userOrders.length !== 1 ? 's' : ''} placed</p>
                </div>
                {userOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Package className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No orders yet</h3>
                    <p className="text-slate-400 text-sm mb-4">Start browsing and place your first order!</p>
                    <button onClick={() => setActiveTab('browse')} className="bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95">Browse Products</button>
                  </div>
                ) : userOrders.map(order => {
                  const vendor = vendors.find(v => v.id === order.vendorId);
                  const steps = ['pending', 'accepted', 'picked', 'delivered'];
                  const currentIdx = steps.indexOf(order.status);
                  return (
                    <div key={order.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-blue-50 dark:border-blue-900/20 flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-[#0F172A] dark:text-white text-sm font-mono">#{order.id}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-slate-400 text-xs">{vendor?.name} · {new Date(order.createdAt || order.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-[#1E3A8A] dark:text-blue-300">₹{order.total + 30}</p>
                          <p className="text-xs text-emerald-600 flex items-center gap-1 justify-end"><Coins className="w-3 h-3" />+{order.kartCoinsEarned} coins</p>
                        </div>
                      </div>
                      {/* Tracking */}
                      <div className="px-5 py-5">
                        <div className="relative flex justify-between">
                          <div className="absolute top-5 left-0 right-0 h-0.5 bg-blue-100 dark:bg-blue-900/30" />
                          <div className="absolute top-5 left-0 h-0.5 bg-[#1E3A8A] transition-all duration-700"
                            style={{ width: currentIdx === 0 ? '0%' : currentIdx === 1 ? '33%' : currentIdx === 2 ? '66%' : '100%' }} />
                          {[
                            { label: 'Placed', sublabel: 'Confirmed', icon: Clock },
                            { label: 'Accepted', sublabel: 'By shop', icon: CheckCircle },
                            { label: 'On Way', sublabel: 'Out for delivery', icon: Truck },
                            { label: 'Delivered', sublabel: 'Completed', icon: Box },
                          ].map((step, i) => {
                            const Icon = step.icon;
                            const active = i <= currentIdx;
                            return (
                              <div key={step.label} className="relative flex flex-col items-center gap-2 z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  active
                                    ? i === 3 && order.status === 'delivered' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                                    : 'bg-white dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 text-slate-300 dark:text-slate-600'
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="text-center">
                                  <p className={`text-xs font-bold ${active ? 'text-[#0F172A] dark:text-white' : 'text-slate-400'}`}>{step.label}</p>
                                  <p className="text-[10px] text-slate-400 hidden sm:block">{step.sublabel}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-5 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-sm text-slate-600 dark:text-slate-400">
                          <div>
                            {order.status === 'pending'   && '🕐 Awaiting shop confirmation…'}
                            {order.status === 'accepted'  && '✅ Shop has accepted and is preparing your order'}
                            {order.status === 'picked'    && '🚴 Your order is on the way!'}
                            {order.status === 'delivered' && '✨ Order delivered! Hope you enjoyed your purchase'}
                          </div>
                          {order.status === 'pending' && (
                            <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all shadow shadow-red-500/20 active:scale-95">
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Rating & complaint */}
                      {order.status === 'delivered' && (
                        <div className="px-5 pb-5 border-t border-blue-50 dark:border-blue-900/20 pt-4 space-y-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rate Your Experience</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { key: 'product', label: 'Products',         icon: Package,  hasRating: order.rating,       action: () => setFeedbackDialog({ open: true, orderId: order.id, type: 'product' }) },
                              ...(order.courierId ? [{ key: 'courier', label: 'Delivery Partner', icon: Bike, hasRating: order.courierRating, action: () => setFeedbackDialog({ open: true, orderId: order.id, type: 'courier' as any }) }] : []),
                              { key: 'vendor',  label: 'Shop',             icon: Store,    hasRating: order.vendorRating, action: () => setFeedbackDialog({ open: true, orderId: order.id, type: 'vendor' as any }) },
                            ].map(r => {
                              const Icon = r.icon;
                              return (
                                <button key={r.key} onClick={r.action} disabled={!!r.hasRating}
                                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                    r.hasRating
                                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 text-emerald-600 cursor-not-allowed'
                                      : 'bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 text-slate-600 dark:text-slate-300 hover:border-[#1E3A8A]/40 hover:bg-blue-50'
                                  }`}>
                                  {r.hasRating ? <CheckCircle className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                                  {r.hasRating ? `Rated ${r.label}` : `Rate ${r.label}`}
                                </button>
                              );
                            })}
                          </div>
                          {complaints.some((c: any) => c.orderId === order.id) ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 text-xs font-semibold w-fit">
                              <AlertTriangle className="w-3.5 h-3.5" /> Complaint Filed
                            </div>
                          ) : (
                            <button onClick={() => setComplaintDialog({ open: true, orderId: order.id })}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-fit">
                              <AlertTriangle className="w-3.5 h-3.5" /> File a Complaint
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TRANSACTIONS ── */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Transaction History</h1>
                  <p className="text-slate-400 text-sm">{userOrders.length} transaction{userOrders.length !== 1 ? 's' : ''}</p>
                </div>
                {userOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Wallet className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No transactions yet</h3>
                    <p className="text-slate-400 text-sm">Your order history will appear here</p>
                  </div>
                ) : userOrders.map(order => {
                  const vendor = vendors.find(v => v.id === order.vendorId);
                  const total  = order.total + 30;
                  return (
                    <div key={order.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-blue-50 dark:border-blue-900/20 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-[#0F172A] dark:text-white font-mono text-sm">#{order.id}</span>
                            <StatusBadge status={order.status} />
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${order.paymentStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {order.paymentStatus === 'success' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs">{new Date(order.createdAt || order.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          {vendor && <p className="text-slate-500 text-xs mt-0.5"><Store className="inline w-3 h-3 mr-1" />{vendor.name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-[#1E3A8A] dark:text-blue-300">₹{total.toFixed(2)}</p>
                          <p className="text-xs text-slate-400">{order.paymentMethod || 'UPI'}</p>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="space-y-1">
                          {((order as any).products || (order as any).items || []).map((item: any, idx: number) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                              <div key={idx} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>{product?.name || 'Unknown'} × {item.quantity}</span>
                                <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-blue-50 dark:border-blue-900/20 pt-3 space-y-1 text-sm">
                          <div className="flex justify-between text-slate-500"><span>Item Total</span><span>₹{order.total.toFixed(2)}</span></div>
                          <div className="flex justify-between text-slate-500"><span>Delivery</span><span>₹30.00</span></div>
                          <div className="flex justify-between font-bold text-[#0F172A] dark:text-white pt-1 border-t border-blue-50 dark:border-blue-900/20">
                            <span>Total</span><span className="text-[#1E3A8A] dark:text-blue-300">₹{total.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => downloadReceipt(order)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                          <button onClick={() => printReceipt(order)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── WALLET ── */}
            {activeTab === 'wallet' && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Kart Coins Wallet</h1>
                  <p className="text-slate-400 text-sm">Earn and redeem campus rewards</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1a3380] to-[#162D6E] rounded-3xl p-8 text-white shadow-2xl shadow-blue-900/40">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F97316]/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <div className="relative">
                    <p className="text-white/60 text-sm mb-2">Kart Coins Balance</p>
                    <div className="flex items-end gap-3 mb-2">
                      <span className="text-6xl font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>{currentUser.kartCoins}</span>
                      <Coins className="w-10 h-10 text-[#F97316] mb-2" />
                    </div>
                    <p className="text-white/50 text-sm">≈ ₹{(currentUser.kartCoins).toFixed(2)} in rewards</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm p-5">
                  <h3 className="font-bold text-[#0F172A] dark:text-white mb-4 text-sm uppercase tracking-wider">Recent Earnings</h3>
                  {userOrders.length === 0
                    ? <p className="text-center text-slate-400 py-4 text-sm">Place an order to earn Kart Coins!</p>
                    : userOrders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex justify-between items-center py-2.5 border-b border-blue-50 dark:border-blue-900/20 last:border-0">
                        <div>
                          <p className="font-semibold text-[#0F172A] dark:text-white text-sm font-mono">#{order.id}</p>
                          <p className="text-xs text-slate-400">{new Date(order.createdAt || order.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm">
                          <Coins className="w-4 h-4" />+{order.kartCoinsEarned}
                        </span>
                      </div>
                    ))
                  }
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
                  <h4 className="font-bold text-[#1E3A8A] dark:text-blue-300 mb-3 text-sm">How Kart Coins work</h4>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2"><span className="text-[#F97316]">•</span> Earn 10% of order value as Kart Coins</li>
                    <li className="flex items-center gap-2"><span className="text-[#F97316]">•</span> Use Kart Coins for discounts on future orders</li>
                    <li className="flex items-center gap-2"><span className="text-[#F97316]">•</span> 1 Kart Coin = ₹1 discount</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Account Settings</h1>
                  <p className="text-slate-400 text-sm">Manage your profile and preferences</p>
                </div>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm p-6 space-y-5">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden">
                        {settingsData.photo
                          ? <img src={getImageUrl(settingsData.photo)} alt="Profile" className="w-full h-full object-cover" />
                          : <User className="w-10 h-10 text-[#1E3A8A] dark:text-blue-400" />}
                      </div>
                      <input 
                        type="file" 
                        id="photo-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSettingsData({ ...settingsData, photo: reader.result as string, photoFile: file } as any);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button onClick={() => document.getElementById('photo-upload')?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Click the camera icon to select a local photo</p>
                  </div>
                  {[
                    { label: 'Full Name',  icon: User,     field: 'name',    type: 'text',  placeholder: 'Your full name' },
                    { label: 'Email',      icon: Mail,     field: 'email',   type: 'email', placeholder: 'your@email.com' },
                    { label: 'Phone',      icon: Phone,    field: 'phone',   type: 'tel',   placeholder: '10-digit number' },
                    { label: 'Address',    icon: HomeIcon, field: 'address', type: 'text',  placeholder: 'Hall X, Room XXX' },
                  ].map(f => {
                    const Icon = f.icon;
                    return (
                      <div key={f.field} className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{f.label}</Label>
                        <Input 
                          type={f.type} 
                          placeholder={f.placeholder} 
                          value={(settingsData as any)[f.field]}
                          onChange={e => {
                            let val = e.target.value;
                            if (f.field === 'phone') {
                              val = val.replace(/\D/g, '').slice(0, 10);
                            }
                            setSettingsData({ ...settingsData, [f.field]: val });
                          }}
                          disabled={f.field === 'email'}
                          className={`h-11 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl focus:border-[#1E3A8A] disabled:opacity-60 disabled:cursor-not-allowed ${
                            f.field === 'phone' && settingsData.phone && !isValidPhone(settingsData.phone) ? 'border-red-500 focus:border-red-500' : ''
                          }`} 
                        />
                        {f.field === 'phone' && settingsData.phone && !isValidPhone(settingsData.phone) && (
                          <p className="text-[10px] text-red-500 mt-1 pl-1 font-semibold">
                            Phone number must be exactly 10 digits
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex gap-3 pt-2">
                      <button onClick={async () => {
                        if (!isValidPhone(settingsData.phone)) {
                          toast.error('Please enter a valid 10-digit phone number');
                          return;
                        }
                        try {
                          let photoRef = settingsData.photo;
                          // Handle FormData if file was selected
                          if ((settingsData as any).photoFile) {
                            const formData = new FormData();
                            formData.append('photo', (settingsData as any).photoFile);
                            formData.append('name', settingsData.name);
                            formData.append('email', settingsData.email);
                            formData.append('phone', settingsData.phone);
                            formData.append('address', settingsData.address);
                            // Use the proper api instance for multipart form data
                            const res = await api.patch('/users/profile', formData, {
                               headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res?.data?.data) {
                              photoRef = res.data.data.photo;
                              toast.success('Settings & Photo saved!');
                            }
                          }

                          // Update all user data
                          updateUser(currentUser.id, {
                            name: settingsData.name,
                            email: settingsData.email,
                            phone: settingsData.phone,
                            address: settingsData.address,
                            photo: photoRef
                          });

                          // Clear photoFile after save
                          setSettingsData(prev => ({ ...prev, photoFile: undefined } as any));
                          toast.success('Settings saved!');
                        } catch (e) {
                          toast.error('Failed to save settings');
                        }
                      }}
                        disabled={!isValidPhone(settingsData.phone)}
                        className="flex-1 h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm">Save Changes</button>
                    <button onClick={() => { logout(); navigate('/auth'); }}
                      className="flex-1 h-11 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm">Logout</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── CART DRAWER ── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0F1E3A] h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 dark:border-blue-900/30">
              <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                <ShoppingCart className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" /> Shopping Cart
              </h2>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <ShoppingCart className="w-12 h-12 text-blue-200 dark:text-blue-800" />
                  <p className="font-bold text-slate-600 dark:text-slate-300" style={{ fontFamily: 'Syne, sans-serif' }}>Your cart is empty</p>
                  <button onClick={() => setShowCart(false)} className="bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all mt-2">Browse Products</button>
                </div>
              ) : cart.map(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;
                return (
                  <div key={item.productId} className="flex gap-3 bg-[#F0F4FF] dark:bg-[#0A1628] rounded-2xl p-3 border border-blue-100/50 dark:border-blue-900/20">
                    <img src={getImageUrl(product.image)} alt={product.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0F172A] dark:text-white text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-slate-400 mb-2">{product.vendorName}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#1E3A8A] dark:text-blue-300 text-sm">₹{product.price * item.quantity}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateCartQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-[#0F1E3A] border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-slate-600 hover:border-[#1E3A8A]/40 transition-colors"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-bold text-[#0F172A] dark:text-white w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-[#0F1E3A] border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-slate-600 hover:border-[#1E3A8A]/40 transition-colors"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => removeFromCart(item.productId)} className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center justify-center transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-blue-100 dark:border-blue-900/30 space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-[#1E3A8A] dark:text-blue-300 flex items-center gap-1.5"><Coins className="w-4 h-4 text-[#F97316]"/> Kart Coins</span>
                    <span className="text-xs font-bold bg-[#1E3A8A] text-white px-2 py-0.5 rounded-full">{currentUser.kartCoins} Available</span>
                  </div>
                  <label className={`flex items-center gap-2 mt-2 cursor-pointer ${currentUser.kartCoins < 30 ? 'opacity-50' : ''}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A]" 
                      checked={useKartCoins}
                      onChange={(e) => setUseKartCoins(e.target.checked)}
                      disabled={currentUser.kartCoins < 30}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Use 30 Kart Coins for free delivery</span>
                  </label>
                  {currentUser.kartCoins < 30 && (
                    <p className="text-[10px] text-red-500 mt-1 ml-6">You need {30 - currentUser.kartCoins} more coins to unlock free delivery.</p>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-500"><span>Item Total</span><span>₹{cartTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery</span>
                    <span className={useKartCoins ? "text-emerald-500 font-bold" : ""}>
                      {useKartCoins ? "FREE (₹0.00)" : `₹${deliveryCharges.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[#0F172A] dark:text-white text-base pt-1.5 border-t border-blue-50 dark:border-blue-900/20">
                    <span>Total</span><span className="text-[#1E3A8A] dark:text-blue-300">₹{orderTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={handleCheckout} disabled={isProcessingCheckout} className="w-full h-12 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                  {isProcessingCheckout ? 'Processing...' : 'Proceed to Checkout →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback dialog */}
      <Dialog open={feedbackDialog.open} onOpenChange={open => setFeedbackDialog({ ...feedbackDialog, open })}>
        <DialogContent className="bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Rate {feedbackDialog.type === 'product' ? 'Products' : feedbackDialog.type === 'courier' ? 'Delivery Partner' : 'Shop'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">Share your experience to help us improve</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2 justify-center">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                  <Star className={`w-8 h-8 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                </button>
              ))}
            </div>
            <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Share detailed feedback (optional)…"
              className="bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" rows={3} />
            <button onClick={handleFeedbackSubmit} className="w-full h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl transition-all active:scale-95">Submit Feedback</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint dialog */}
      <Dialog open={complaintDialog.open} onOpenChange={open => setComplaintDialog({ ...complaintDialog, open })}>
        <DialogContent className="bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>File a Complaint</DialogTitle>
            <DialogDescription className="text-slate-500">Report any issues with your order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</Label>
              <Input value={complaintSubject} onChange={e => setComplaintSubject(e.target.value)} placeholder="Brief subject"
                className="bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</Label>
              <Textarea value={complaintDescription} onChange={e => setComplaintDescription(e.target.value)} placeholder="Describe the issue in detail…"
                className="bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" rows={4} />
            </div>
            <button onClick={handleComplaintSubmit} className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all active:scale-95">Submit Complaint</button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentModal open={showPaymentModal} onOpenChange={setShowPaymentModal} order={pendingOrder} onPaymentSuccess={handlePaymentSuccess} />
    </div>
  );
}
