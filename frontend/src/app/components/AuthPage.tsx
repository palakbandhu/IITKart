import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/contexts/AppContext';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Store,
  Bike,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Phone,
  Home,
} from 'lucide-react';
import { ForgotPassword } from './ForgotPassword';
import { isValidPhone } from '@/app/utils/validation';

type AppRole = 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'ADMIN';

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register, verifyRegistrationOtp, resendRegistrationOtp } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempUserId, setTempUserId] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const [registerData, setRegisterData] = useState<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: AppRole;
    phone: string;
    address: string;
  }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    phone: '',
    address: '',
  });

  const navigateToRole = (role: string) => {
    const map: Record<string, string> = {
      CUSTOMER: '/user',
      user: '/user',
      VENDOR: '/vendor',
      vendor: '/vendor',
      RIDER: '/courier',
      courier: '/courier',
      ADMIN: '/admin',
      admin: '/admin',
    };
    navigate(map[role] || '/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // mock delay (keep if you want UI spinner)
    await new Promise((r) => setTimeout(r, 600));

    const user = await login(loginData.email, loginData.password);

    setLoading(false);

    if (user) {
      toast.success(`Welcome back, ${user.name}!`);
      // user.role should now be CUSTOMER/VENDOR/RIDER/ADMIN after you update AppContext.tsx
      navigateToRole(user.role as AppRole);
    } else {
      toast.error('Invalid email or password');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (registerData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const response: any = await register(
      registerData.name,
      registerData.email,
      registerData.password,
      registerData.role,
      registerData.phone,
      // only customers need address in your UI
      registerData.role === 'CUSTOMER' ? registerData.address : undefined
    );

    setLoading(false);

    if (response && response.status === 'otp_sent') {
      toast.success('Registration successful. Please verify your email.');
      setAwaitingOtp(true);
      setTempUserId(response.userId);
    } else if (response && response.error) {
      toast.error(response.error);
    } else {
      toast.error('Registration failed. Try a different email.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error('Please enter a valid OTP');
      return;
    }

    setLoading(true);
    const user = await verifyRegistrationOtp(tempUserId, otp);
    setLoading(false);

    if (user) {
      toast.success(`Welcome to IITKart, ${user.name}!`);
      setAwaitingOtp(false);
      setTempUserId('');
      navigateToRole(user.role as AppRole);
    } else {
      toast.error('Invalid or expired OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    const success = await resendRegistrationOtp(tempUserId);
    if (success) {
      toast.success('A new OTP has been sent to your email.');
    } else {
      toast.error('Failed to resend OTP.');
    }
  };

  const roles: { value: AppRole; label: string; icon: React.ElementType }[] = [
    { value: 'CUSTOMER', label: 'Customer', icon: UserIcon },
    { value: 'VENDOR', label: 'Vendor', icon: Store },
    { value: 'RIDER', label: 'Delivery Partner', icon: Bike },
  ];

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex bg-[#F0F4FF] dark:bg-[#0A1628]">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-gradient-to-br from-[#1E3A8A] via-[#1a3380] to-[#162D6E] p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F97316]/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors mb-16"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>

          <div className="flex items-center gap-4 mb-8">
            <img
              src="/assets/iitKart-logo.jpg"
              alt="IITKart"
              className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-black/30"
            />
            <div>
              <div className="text-3xl font-extrabold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                IITKart
              </div>
              <div className="text-white/50 text-sm">Campus Delivery</div>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            Your campus,
            <br />
            <span className="text-[#F97316]">delivered.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Order from all your favourite campus shops and get everything delivered to your hostel room in minutes.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          {['500+ Daily Orders', '6 Campus Shops', '50+ Riders', 'Fast Delivery'].map((s) => (
            <div key={s} className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-white/80 text-sm font-medium">
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <img src="/assets/iitKart-logo.jpg" alt="IITKart" className="h-10 w-10 rounded-xl object-cover shadow" />
          <span className="text-2xl font-extrabold" style={{ fontFamily: 'Syne, sans-serif' }}>
            <span className="text-[#1E3A8A] dark:text-blue-300">IIT</span>
            <span className="text-[#F97316]">Kart</span>
          </span>
        </div>

        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex bg-white dark:bg-[#0F1E3A] rounded-2xl p-1.5 mb-8 shadow-sm border border-blue-100 dark:border-blue-900/30">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setAwaitingOtp(false); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab && !awaitingOtp
                    ? 'bg-[#1E3A8A] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {awaitingOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Check your email
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">We've sent a 6-digit OTP to {registerData.email}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Verification Code</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="h-14 text-center text-xl tracking-widest font-mono bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/20 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sm text-[#1E3A8A] dark:text-blue-400 font-semibold hover:underline"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setAwaitingOtp(false)}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold"
                >
                  Change Email
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl active:scale-95"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Account</span> <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Welcome back
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to your IITKart account</p>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@iitk.ac.in"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    className="pl-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/20 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="pl-10 pr-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/20 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#1E3A8A] dark:text-blue-400 font-semibold hover:underline"
              >
                Forgot password?
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 hover:-translate-y-0.5 active:scale-95"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span> <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Create account
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Join the IITKart community</p>
              </div>

              {/* Role chips */}
              <div className="space-y-1">
                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Register as</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: r.value })}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          registerData.role === r.value
                            ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-md'
                            : 'bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 text-slate-600 dark:text-slate-300 hover:border-[#1E3A8A]/40'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Full Name</Label>
                  <Input
                    placeholder="Your full name"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    required
                    className="h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] rounded-xl"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="you@iitk.ac.in"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      className="pl-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="tel"
                      placeholder="10-digit number"
                      value={registerData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setRegisterData({ ...registerData, phone: val });
                      }}
                      className={`pl-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] rounded-xl ${
                        registerData.phone && !isValidPhone(registerData.phone) ? 'border-red-500 focus:border-red-500' : ''
                      }`}
                    />
                  </div>
                  {registerData.phone && !isValidPhone(registerData.phone) && (
                    <p className="text-[10px] text-red-500 mt-1 pl-1 font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
                      Phone number must be exactly 10 digits
                    </p>
                  )}
                </div>

                {registerData.role === 'CUSTOMER' && (
                  <div className="space-y-1">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Address</Label>
                    <div className="relative">
                      <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Hall X, Room XXX"
                        value={registerData.address}
                        onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                        className="pl-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1 col-span-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      className="pl-10 pr-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                      className="pl-10 pr-10 h-11 bg-white dark:bg-[#0F1E3A] border-blue-100 dark:border-blue-900/40 focus:border-[#1E3A8A] rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isValidPhone(registerData.phone)}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl active:scale-95"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span> <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}