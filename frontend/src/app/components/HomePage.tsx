import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Store, Truck, Shield, ArrowRight, Star, Zap, Clock, Package } from 'lucide-react';
import API from "../../services/api";

function useCountUp(target: number, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

const roles = [
  {
    title: 'Customer',
    description: 'Browse campus shops, add to cart, and get items delivered to your room.',
    icon: ShoppingCart,
    path: '/user',
    color: 'from-[#1E3A8A] to-[#2B4FBA]',
    accent: '#F97316',
    emoji: '🛒',
  },
  {
    title: 'Vendor',
    description: 'Manage your shop, update inventory, and track incoming orders.',
    icon: Store,
    path: '/vendor',
    color: 'from-[#0F766E] to-[#0D9488]',
    accent: '#FCD34D',
    emoji: '🏪',
  },
  {
    title: 'Delivery Partner',
    description: 'Accept deliveries, earn money, and build your campus rider profile.',
    icon: Truck,
    path: '/courier',
    color: 'from-[#7C3AED] to-[#6D28D9]',
    accent: '#FB923C',
    emoji: '🚴',
  },
  {
    title: 'Admin',
    description: 'Oversee the platform, manage users, and view analytics.',
    icon: Shield,
    path: '/admin',
    color: 'from-[#BE123C] to-[#9F1239]',
    accent: '#FCA5A5',
    emoji: '🛡️',
  },
];

const shops = [
  { name: 'Amul Parlour', emoji: '🍦', tag: 'Ice Cream & Dairy' },
  { name: 'Nescafe', emoji: '☕', tag: 'Coffee & Snacks' },
  { name: 'KC Shop', emoji: '🍜', tag: 'Meals & Noodles' },
  { name: 'Chhota Bazaar', emoji: '📚', tag: 'Stationery & Books' },
  { name: 'Photocopy', emoji: '🖨️', tag: 'Print & Scan' },
  { name: 'Wash & Iron', emoji: '👕', tag: 'Laundry Services' },
];

export function HomePage() {
  const navigate = useNavigate();
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await API.get("/products");
        console.log("PRODUCTS:", res.data);
      } catch (err) {
        console.log("ERROR:", err);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const orders = useCountUp(500, 1800, statsVisible);
  const vendors = useCountUp(6, 800, statsVisible);
  const riders = useCountUp(50, 1200, statsVisible);

  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A1628] overflow-x-hidden">
      {/* Top nav bar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#0F1E3A]/90 backdrop-blur-xl border-b border-blue-100/60 dark:border-blue-900/30 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/iitKart-logo.jpg" alt="IITKart" className="h-9 w-9 rounded-xl object-cover shadow" />
            <span className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="text-[#1E3A8A] dark:text-blue-300">IIT</span>
              <span className="text-[#F97316]">Kart</span>
            </span>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-blue-900/25 active:scale-95"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-200/40 via-indigo-100/30 to-orange-100/20 dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-orange-300/20 dark:bg-orange-800/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-[#EA580C] dark:text-orange-400 rounded-full px-4 py-1.5 text-sm font-semibold mb-8 animate-[fadeInDown_0.5s_ease]">
              <Zap className="w-3.5 h-3.5" /> Campus-first delivery platform
            </div>

            {/* Logo + Heading */}
            <div className="flex flex-col items-center gap-6 mb-8 animate-[fadeInUp_0.6s_ease]">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A]/20 to-[#F97316]/20 rounded-3xl blur-xl scale-110" />
                <img
                  src="/assets/iitKart-logo.jpg"
                  alt="IITKart Logo"
                  className="relative w-28 h-28 rounded-3xl object-cover shadow-2xl shadow-blue-900/30"
                />
              </div>
              <div>
                <h1
                  className="text-5xl md:text-7xl font-extrabold mb-4"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  <span className="text-[#1E3A8A] dark:text-blue-300">IIT</span>
                  <span className="text-[#F97316]">Kart</span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Everything you need,{' '}
                  <span className="text-[#1E3A8A] dark:text-blue-400 font-bold">within your campus.</span>
                </p>
                <p className="mt-3 text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto">
                  From hot meals to stationery — order from your favourite campus shops and get it delivered right to your room.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-12 animate-[fadeInUp_0.8s_ease]">
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 active:scale-95"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('role-cards')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-[#1E3A8A] dark:text-blue-300 font-bold px-8 py-4 rounded-2xl text-base transition-all hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 hover:-translate-y-0.5 active:scale-95"
              >
                Explore Roles
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 animate-[fadeInUp_1s_ease]">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />, text: 'Fast Delivery' },
                { icon: <Star className="w-3.5 h-3.5" />, text: 'Top Rated Shops' },
                { icon: <Package className="w-3.5 h-3.5" />, text: 'Easy Tracking' },
              ].map(f => (
                <span key={f.text} className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                  <span className="text-[#F97316]">{f.icon}</span> {f.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section ref={statsRef} className="py-12 bg-white dark:bg-[#0F1E3A] border-y border-blue-100/60 dark:border-blue-900/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { value: orders, suffix: '+', label: 'Daily Orders' },
              { value: vendors, suffix: '', label: 'Campus Vendors' },
              { value: riders, suffix: '+', label: 'Delivery Partners' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-4xl md:text-5xl font-extrabold text-[#1E3A8A] dark:text-blue-300 mb-1"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE CARDS ──────────────────────────────────── */}
      <section id="role-cards" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-[#0F172A] dark:text-white mb-3"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Choose your role
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg mx-auto">
              IITKart brings together students, shops, and delivery partners on one campus platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((role, i) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.path}
                  onClick={() => navigate('/auth')}
                  className="group relative bg-white dark:bg-[#0F1E3A] rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-md hover:shadow-xl hover:shadow-blue-900/10 cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Top gradient bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${role.color}`} />

                  <div className="p-6">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={1.8} />
                    </div>

                    <h3
                      className="text-lg font-bold text-[#0F172A] dark:text-white mb-2"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {role.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">
                      {role.description}
                    </p>

                    <button
                      className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${role.color} text-white text-sm font-bold py-3 rounded-xl transition-all shadow group-hover:shadow-md active:scale-95`}
                    >
                      Enter as {role.title} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SHOPS ───────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-[#0F1E3A] border-t border-blue-100/60 dark:border-blue-900/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <h2
              className="text-3xl font-extrabold text-[#0F172A] dark:text-white mb-2"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Popular Campus Shops
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Your favourite stops, now delivered.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {shops.map(shop => (
              <div
                key={shop.name}
                onClick={() => navigate('/auth')}
                className="group bg-[#F0F4FF] dark:bg-[#0A1628] hover:bg-gradient-to-br hover:from-[#1E3A8A] hover:to-[#2B4FBA] rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/20"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{shop.emoji}</div>
                <p className="text-[#0F172A] dark:text-white group-hover:text-white font-bold text-sm leading-tight">{shop.name}</p>
                <p className="text-slate-400 group-hover:text-blue-200 text-[10px] mt-1 leading-tight">{shop.tag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="py-8 border-t border-blue-100/60 dark:border-blue-900/30">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/assets/iitKart-logo.jpg" alt="IITKart" className="h-7 w-7 rounded-lg object-cover" />
            <span className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="text-[#1E3A8A] dark:text-blue-300">IIT</span>
              <span className="text-[#F97316]">Kart</span>
            </span>
          </div>
          <p className="text-slate-400 text-xs text-center">
            © 2025 IITKart · Campus Delivery Management System · IIT Kanpur
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInUp   { from { opacity:0; transform:translateY(16px);  } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

export default HomePage;