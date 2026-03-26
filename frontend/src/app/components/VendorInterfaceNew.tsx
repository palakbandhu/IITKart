import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, Product } from '@/app/contexts/AppContext';
import { Header } from '@/app/components/Header';
import { Sidebar, SidebarItem } from '@/app/components/Sidebar';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
// Removed 'History' from this import list to fix the duplicate declaration error
import {
  Package, Plus, Edit, Trash2, Star, Settings, Store, 
  ClipboardList, Mail, Phone, MapPin, DollarSign,
  ShoppingCart, Truck, MessageSquare, RefreshCw, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { VendorDeliveryIssues } from './VendorDeliveryIssues';

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
  { id: 'orders',    label: 'Orders',    icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Package       },
  { id: 'issues',    label: 'Issues',    icon: AlertTriangle },
  { id: 'reviews',   label: 'Reviews',   icon: Star          },
  { id: 'settings',  label: 'Settings',  icon: Settings      },
];

// Moved outside the main component to prevent input focus loss on re-renders
function ProductFormFields({ productForm, setProductForm, onSubmit, label }: { productForm: any, setProductForm: any, onSubmit: () => void, label: string }) {
  return (
    <div className="space-y-4 pt-2">
      {[
        { f: 'name',  l: 'Product Name', t: 'text',   ph: 'e.g. Masala Chai' },
        { f: 'price', l: 'Price (₹)',    t: 'number', ph: '0' },
        { f: 'stock', l: 'Stock Qty',    t: 'number', ph: '10' },
      ].map(({ f, l, t, ph }) => (
        <div key={f} className="space-y-1">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{l}</Label>
          <Input type={t} placeholder={ph} value={productForm[f]}
            onChange={e => setProductForm({ ...productForm, [f]: t === 'number' ? Number(e.target.value) : e.target.value })}
            className="h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" />
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Image</Label>
        <Input type="file" accept="image/*"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              setProductForm({ ...productForm, image: e.target.files[0] });
            }
          }}
          className="h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 p-2" />
        {typeof productForm.image === 'string' && productForm.image && (
          <p className="text-[10px] text-slate-400 mt-1 truncate">Current: {productForm.image.split('/').pop()}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</Label>
        <Select value={productForm.category} onValueChange={v => setProductForm({ ...productForm, category: v })}>
          <SelectTrigger className="h-10 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Food', 'Beverages', 'Snacks', 'Stationery', 'Services', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</Label>
        <Textarea placeholder="Brief description…" value={productForm.description}
          onChange={e => setProductForm({ ...productForm, description: e.target.value })}
          className="bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" rows={2} />
      </div>
      <button onClick={onSubmit} className="w-full h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl transition-all active:scale-95">{label}</button>
    </div>
  );
}

export function VendorInterface() {
  const navigate = useNavigate();
  const { products, addProduct, removeProduct, updateProduct, orders, refreshOrders, currentUser, setCurrentUser, vendors, courierProfiles, users, updateOrderStatus } = useApp();

  React.useEffect(() => { if (!currentUser || (currentUser.role !== 'VENDOR' && currentUser.role !== 'vendor')) navigate('/auth'); }, [currentUser, navigate]);
  if (!currentUser || (currentUser.role !== 'VENDOR' && currentUser.role !== 'vendor')) return null;

  const getImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `http://localhost:5001${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const [activeTab, setActiveTab] = useState('orders');
  const vendor   = vendors.find(v => v.userId === currentUser.id);
  const vendorId = vendor?.id || currentUser.id;
  const vendorProducts  = products.filter(p => p.vendorId === vendorId);
  const vendorOrders    = orders; // API natively pre-filters to the authenticated Vendor's scope
  const activeOrders    = vendorOrders.filter(o => ['pending', 'accepted', 'picked'].includes(o.status));
  const completedOrders = vendorOrders.filter(o => o.status === 'delivered');
  const vendorReviews   = vendorOrders.filter(o => o.vendorRating);
  const avgRating       = vendorReviews.length ? (vendorReviews.reduce((s, o) => s + (o.vendorRating || 0), 0) / vendorReviews.length).toFixed(1) : '0.0';

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    badge: item.id === 'orders' && activeOrders.length > 0 ? activeOrders.length : undefined,
  }));

  const [showProductDialog, setShowProductDialog]   = useState(false);
  const [editingProduct, setEditingProduct]         = useState<Product | null>(null);
  const [productForm, setProductForm]               = useState({ name: '', category: 'Food', price: 0, description: '', image: '', stock: 10 });
  const [settingsData, setSettingsData]             = useState({ name: vendor?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', address: vendor?.location || '' });

  const handleAddProduct = () => {
    if (!productForm.name.trim() || !productForm.price) { toast.error('Name and price are required'); return; }
    addProduct({ id: `P${Date.now()}`, vendorId, vendorName: vendor?.name || 'My Shop', name: productForm.name, category: productForm.category, price: productForm.price, description: productForm.description, image: productForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', inStock: productForm.stock > 0 });
    toast.success('Product added!');
    setShowProductDialog(false);
    setProductForm({ name: '', category: 'Food', price: 0, description: '', image: '', stock: 10 });
  };

  const handleUpdateProduct = () => {
    if (!editingProduct) return;
    updateProduct(editingProduct.id, { name: productForm.name, category: productForm.category, price: productForm.price, description: productForm.description, image: productForm.image || editingProduct.image, inStock: productForm.stock > 0 });
    toast.success('Product updated!');
    setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setProductForm({ name: p.name, category: p.category, price: p.price, description: p.description, image: p.image, stock: p.inStock ? 10 : 0 });
    setEditingProduct(p);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A1628] flex flex-col">
      <Header /> 
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} activeId={activeTab} onSelect={setActiveTab} accentColor="#0F766E"
          header={
            <div>
              <p className="font-bold text-[#0F172A] dark:text-white text-sm truncate">{vendor?.name || 'My Shop'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs text-slate-400">{vendor?.rating} · {vendor?.status}</span>
              </div>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-5xl mx-auto">

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Total Earnings" value={`₹${vendor?.totalEarnings || 0}`} icon={DollarSign} colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <MetricCard label="Total Orders"   value={vendor?.totalOrders || 0}           icon={ShoppingCart} colorClass="bg-blue-100 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400" />
              <MetricCard label="Avg Rating"     value={`${avgRating} ★`}                   icon={Star}        colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <MetricCard label="Products"       value={vendorProducts.length}              icon={Package}     colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
            </div>

            {/* ── ORDERS ── */}
            {activeTab === 'orders' && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-blue-50 dark:border-blue-900/20 flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                      Active Orders
                      <button onClick={refreshOrders} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#1E3A8A] transition-colors" title="Refresh Orders"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </h3>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400 text-xs">{activeOrders.length}</Badge>
                  </div>
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {activeOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ClipboardList className="w-10 h-10 text-blue-200 dark:text-blue-800 mb-2" />
                        <p className="text-slate-400 text-sm">No active orders</p>
                      </div>
                    ) : activeOrders.map(order => (
                      <div key={order.id} className="bg-[#F0F4FF] dark:bg-[#0A1628] rounded-xl p-4 border border-blue-100/50 dark:border-blue-900/20">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-[#0F172A] dark:text-white text-sm font-mono">#{order.id}</p>
                            <p className="text-xs text-slate-400">{new Date(order.createdAt || order.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${order.status === 'picked' ? 'bg-blue-100 text-blue-700' : order.status === 'accepted' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{order.status}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#1E3A8A] dark:text-blue-300 mb-1">{(order.items || order.products || []).length} items · ₹{order.total + 30}</p>
                        
                        <div className="bg-white dark:bg-[#0F1E3A] rounded-lg p-2.5 text-xs mb-3 border border-blue-50 dark:border-blue-900/10">
                          <p className="font-bold text-slate-600 dark:text-slate-300 mb-1.5">Order Items:</p>
                          <ul className="text-slate-500 dark:text-slate-400 space-y-1">
                            {(order.items || order.products || []).map((item: any, idx: number) => (
                              <li key={idx} className="flex justify-between">
                                <span><span className="font-semibold">{item.quantity || 1}x</span> {item.product?.name || item.name || 'Item'}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <p className="text-xs text-slate-400 flex items-center gap-1 mb-3"><MapPin className="w-3 h-3" />{order.deliveryAddress}</p>
                        {order.courierId && (
                          <div className="bg-white dark:bg-[#0F1E3A] rounded-lg p-3 text-xs mb-3 border border-blue-100 dark:border-blue-900/20">
                            <p className="font-bold text-[#1E3A8A] dark:text-blue-400 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Delivery Partner</p>
                            {(() => { const u = order.courier || users.find((us: any) => us.id === order.courierId); return (
                              <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                <p><span className="font-semibold">Name:</span> {u?.name || 'Assigned Rider'}</p>
                                <p><span className="font-semibold">Phone:</span> {u?.phone || 'Available shortly'}</p>
                              </div>
                            ); })()}
                          </div>
                        )}
                        {order.status === 'pending' && (
                          <button onClick={async () => {
                              try {
                                await updateOrderStatus(order.id, 'accepted');
                                toast.success('Order accepted!');
                              } catch (err) {
                                toast.error('Failed to accept order');
                              }
                            }}
                            className="w-full h-9 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white text-xs font-bold rounded-xl transition-all active:scale-95">Accept Order</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-blue-50 dark:border-blue-900/20 flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                      <History className="w-4 h-4" /> Order History
                    </h3>
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">{completedOrders.length}</Badge>
                  </div>
                  <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                    {completedOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <History className="w-10 h-10 text-blue-200 dark:text-blue-800 mb-2" />
                        <p className="text-slate-400 text-sm">No completed orders yet</p>
                      </div>
                    ) : completedOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-blue-50 dark:border-blue-900/20 last:border-0">
                        <div>
                          <p className="font-bold text-[#0F172A] dark:text-white text-sm font-mono">#{order.id}</p>
                          <p className="text-xs text-slate-400">{new Date(order.createdAt || order.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-[#1E3A8A] dark:text-blue-300 text-sm">₹{order.total + 30}</p>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Delivered</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── INVENTORY ── */}
            {activeTab === 'inventory' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>Inventory</h1>
                    <p className="text-slate-400 text-sm">{vendorProducts.length} product{vendorProducts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => { setProductForm({ name: '', category: 'Food', price: 0, description: '', image: '', stock: 10 }); setShowProductDialog(true); }}
                    className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95">
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
                {vendorProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <Package className="w-12 h-12 text-blue-200 dark:text-blue-800 mb-4" />
                    <p className="text-slate-400 text-sm">No products yet — add your first one!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {vendorProducts.map(p => (
                      <div key={p.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all">
                        <div className="relative">
                          <img src={getImageUrl(p.image)} alt={p.name} className="w-full h-28 object-cover" />
                          <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {p.inStock ? 'In Stock' : 'Out'}
                          </span>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-[#0F172A] dark:text-white text-xs line-clamp-1 mb-0.5">{p.name}</h4>
                          <p className="text-slate-400 text-[10px] mb-2">{p.category}</p>
                          <p className="font-extrabold text-[#1E3A8A] dark:text-blue-300 text-sm mb-3">₹{p.price}</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => openEdit(p)} className="flex-1 h-7 bg-blue-50 dark:bg-blue-900/20 text-[#1E3A8A] dark:text-blue-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => { if (window.confirm('Delete this product?')) { removeProduct(p.id); toast.success('Deleted!'); } }}
                              className="flex-1 h-7 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-red-100 transition-colors">
                              <Trash2 className="w-3 h-3" /> Del
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── REVIEWS ── */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Customer Reviews</h1>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm flex items-center gap-5">
                  <div className="text-5xl font-extrabold text-[#1E3A8A] dark:text-blue-300" style={{ fontFamily: 'Syne, sans-serif' }}>{avgRating}</div>
                  <div>
                    <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />)}</div>
                    <p className="text-xs text-slate-400">{vendorReviews.length} reviews</p>
                  </div>
                </div>
                {vendorReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <MessageSquare className="w-10 h-10 text-blue-200 dark:text-blue-800 mb-3" />
                    <p className="text-slate-400 text-sm">No reviews yet</p>
                  </div>
                ) : vendorReviews.map(order => (
                  <div key={order.id} className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-slate-400 text-xs">#{order.id}</p>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= (order.vendorRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />)}</div>
                    </div>
                    {order.vendorFeedback && <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{order.vendorFeedback}"</p>}
                    <p className="text-xs text-slate-400 mt-2">{new Date(order.createdAt || order.date).toLocaleDateString('en-IN')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── ISSUES ── */}
            {activeTab === 'issues' && (
              <VendorDeliveryIssues />
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="max-w-lg space-y-5">
                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Shop Settings</h1>
                <div className="bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm space-y-4">
                  {[
                    { label: 'Shop Name',      icon: Store, field: 'name',    type: 'text',  ph: 'Shop name' },
                    { label: 'Contact Email',  icon: Mail,  field: 'email',   type: 'email', ph: 'shop@iitk.ac.in' },
                    { label: 'Phone',          icon: Phone, field: 'phone',   type: 'tel',   ph: '10-digit number' },
                    { label: 'Location',       icon: MapPin,field: 'address', type: 'text',  ph: 'Shop location' },
                  ].map(f => {
                    const Icon = f.icon;
                    return (
                      <div key={f.field} className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{f.label}</Label>
                        <Input type={f.type} placeholder={f.ph} value={(settingsData as any)[f.field]}
                          onChange={e => setSettingsData({ ...settingsData, [f.field]: e.target.value })}
                          className="h-11 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl" />
                      </div>
                    );
                  })}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => toast.success('Settings saved!')} className="flex-1 h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl transition-all active:scale-95 text-sm">Save Changes</button>
                    <button onClick={() => { setCurrentUser(null); navigate('/auth'); }} className="flex-1 h-11 border-2 border-red-200 dark:border-red-900/30 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors text-sm">Logout</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Add New Product</DialogTitle>
            <DialogDescription className="text-slate-500">Fill in the details for your new product</DialogDescription>
          </DialogHeader>
          <ProductFormFields productForm={productForm} setProductForm={setProductForm} onSubmit={handleAddProduct} label="Add Product" />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingProduct} onOpenChange={open => { if (!open) setEditingProduct(null); }}>
        <DialogContent className="bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/30 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Edit Product</DialogTitle>
            <DialogDescription className="text-slate-500">Update your product details</DialogDescription>
          </DialogHeader>
          <ProductFormFields productForm={productForm} setProductForm={setProductForm} onSubmit={handleUpdateProduct} label="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Missing import fix
function History({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  );  
}