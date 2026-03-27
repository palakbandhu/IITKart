import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/contexts/AppContext';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ShoppingCart, Home, LogOut, User, Menu, X, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const navigate = useNavigate();
  const { cart, currentUser, logout } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleDark = () => {
    setDark(d => {
      document.documentElement.classList.toggle('dark', !d);
      return !d;
    });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/90 dark:bg-[#0F1E3A]/90 backdrop-blur-xl shadow-lg shadow-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/30'
          : 'bg-white dark:bg-[#0F1E3A] border-b border-blue-50 dark:border-blue-900/20'
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <img
                src="/assets/iitKart-logo.jpg"
                alt="IITKart"
                className="h-9 w-9 rounded-xl object-cover shadow-sm group-hover:shadow-md transition-shadow"
              />
              <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-orange-400/40 transition-all" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-xl font-bold"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                <span className="text-[#1E3A8A] dark:text-blue-300">IIT</span>
                <span className="text-[#F97316]">Kart</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">Campus Delivery</span>
            </div>
          </div>

          {/* Center nav */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="hidden md:flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-[#1E3A8A] dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl px-4"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {children}

            <button
              onClick={toggleDark}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-[#1E3A8A] hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser && (
              <>

                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                    <User className="w-4 h-4 text-[#1E3A8A] dark:text-blue-300" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <button
                    onClick={() => { logout(); navigate('/auth'); }}
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 hover:bg-blue-50 transition-colors"
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-blue-50 dark:border-blue-900/20 pt-2">
            <button
              onClick={() => { navigate('/'); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-[#1E3A8A] transition-colors text-sm font-medium"
            >
              <Home className="w-4 h-4" /> Home
            </button>
            {currentUser && (
              <button
                onClick={() => { logout(); navigate('/auth'); setMobileOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            )}
            <button
              onClick={() => { toggleDark(); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-600 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
