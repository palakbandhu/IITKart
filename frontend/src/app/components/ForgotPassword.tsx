import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/contexts/AppContext';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Phone, CheckCircle, XCircle, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const { requestPasswordReset, verifyPasswordResetOtp, resetPassword } = useApp();

  const [step, setStep] = useState<'identifier' | 'otp' | 'newPassword' | 'success'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [userId, setUserId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(900);

  useEffect(() => {
    if (step !== 'otp' || !otpExpiry) return;
    const iv = setInterval(() => {
      const r = Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000));
      setTimeRemaining(r);
      if (r === 0) { clearInterval(iv); toast.error('OTP expired. Please request a new one.'); resetFlow(); }
    }, 1000);
    return () => clearInterval(iv);
  }, [step, otpExpiry]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const uid = await requestPasswordReset(identifier);
    if (!uid) { 
      toast.error('Failed to send OTP. Account not found or network error.'); 
      setIsLoading(false); 
      return; 
    }
    
    setUserId(uid);
    setOtpExpiry(Date.now() + 900000); // 15 mins
    setTimeRemaining(900);
    toast.success(`OTP sent to your email!`);
    setStep('otp'); 
    setIsLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Please enter a 6-digit OTP'); return; }
    setIsLoading(true);
    
    if (otpExpiry && Date.now() > otpExpiry) { toast.error('OTP expired. Please request a new one.'); resetFlow(); setIsLoading(false); return; }
    
    const token = await verifyPasswordResetOtp(userId, otp);
    if (token) { 
      toast.success('OTP verified!'); 
      setResetToken(token);
      setStep('newPassword'); 
    } else {
      const att = otpAttempts + 1; setOtpAttempts(att);
      if (att >= 3) { toast.error('Too many failed attempts. Try again later.'); resetFlow(); }
      else { toast.error(`Incorrect OTP — ${3 - att} attempt(s) left`); setOtp(''); }
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setIsLoading(true);
    
    const success = await resetPassword(userId, resetToken, newPassword);
    if (success) {
      toast.success('Password reset successfully!');
      setStep('success'); 
    } else {
      toast.error('Failed to reset password. Timeout or invalid token.');
    }
    setIsLoading(false);
  };

  const resetFlow = () => {
    setStep('identifier'); setIdentifier(''); setOtp('');
    setNewPassword(''); setConfirmPassword(''); setUserId('');
    setResetToken(''); setOtpAttempts(0); setOtpExpiry(null); setTimeRemaining(900);
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    const uid = await requestPasswordReset(identifier);
    if (uid) {
      setUserId(uid);
      setOtpAttempts(0); setOtp('');
      setOtpExpiry(Date.now() + 900000); setTimeRemaining(900);
      toast.success(`New OTP sent to your email!`);
    } else {
      toast.error('Failed to resend OTP.');
    }
    setIsLoading(false);
  };

  const steps = ['identifier', 'otp', 'newPassword', 'success'];
  const stepIdx = steps.indexOf(step);

  const titles: Record<string, string> = {
    identifier: 'Forgot Password',
    otp: 'Enter OTP',
    newPassword: 'Create New Password',
    success: 'Password Reset!',
  };

  const subtitles: Record<string, string> = {
    identifier: 'Enter your email or phone to receive a verification code',
    otp: `Enter the 6-digit OTP sent to ${identifier}`,
    newPassword: 'Choose a strong password for your account',
    success: 'You can now sign in with your new password',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF] dark:bg-[#0A1628] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-[#0F1E3A] rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-xl shadow-blue-900/10 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#1E3A8A] to-[#F97316]" />

          <div className="p-8">
            {/* Back button */}
            <button
              onClick={step === 'success' ? onBack : step === 'identifier' ? onBack : () => {
                if (step === 'otp') setStep('identifier');
                else if (step === 'newPassword') setStep('otp');
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-[#1E3A8A] dark:hover:text-blue-300 text-sm font-semibold mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Step progress */}
            {step !== 'success' && (
              <div className="flex items-center gap-2 mb-6">
                {[0, 1, 2].map(i => (
                  <React.Fragment key={i}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < stepIdx ? 'bg-[#1E3A8A] text-white' :
                      i === stepIdx ? 'bg-[#1E3A8A] text-white ring-4 ring-blue-100 dark:ring-blue-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30 text-slate-400'
                    }`}>
                      {i < stepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < 2 && <div className={`flex-1 h-0.5 rounded transition-colors ${i < stepIdx ? 'bg-[#1E3A8A]' : 'bg-blue-100 dark:bg-blue-900/30'}`} />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Logo + title */}
            <div className="flex items-center gap-3 mb-2">
              <img src="/assets/iitKart-logo.jpg" alt="IITKart" className="w-10 h-10 rounded-xl object-cover shadow" />
              <div>
                <h1 className="text-xl font-extrabold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{titles[step]}</h1>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-6">{subtitles[step]}</p>

            {/* Step 1 – Identifier */}
            {step === 'identifier' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email or Phone</Label>
                  <div className="relative">
                    {identifier.includes('@') ? <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                    <Input
                      type="text" placeholder="you@iitk.ac.in or 9876543210"
                      value={identifier} onChange={e => setIdentifier(e.target.value)} required
                      className="pl-10 h-11 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-start gap-2 text-xs text-[#1E3A8A] dark:text-blue-300 border border-blue-100 dark:border-blue-800/30">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  A 6-digit OTP will be sent to your registered email safely.
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center h-12 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
                  {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send OTP →'}
                </button>
              </form>
            )}

            {/* Step 2 – OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2 flex flex-col items-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map(i => (
                        <InputOTPSlot key={i} index={i} className="border-blue-200 dark:border-blue-800 focus:border-[#1E3A8A] w-11 h-12 text-lg font-bold" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-center justify-between text-xs border border-blue-100 dark:border-blue-800/30">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    {3 - otpAttempts} attempt{3 - otpAttempts !== 1 ? 's' : ''} left
                  </span>
                  <span className={`font-bold ${timeRemaining < 60 ? 'text-red-500' : 'text-[#1E3A8A] dark:text-blue-300'}`}>⏱ {fmt(timeRemaining)}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleResendOTP} disabled={isLoading || timeRemaining > 840}
                    className="flex-1 h-11 border-2 border-blue-100 dark:border-blue-900/30 text-[#1E3A8A] dark:text-blue-300 font-bold rounded-xl text-sm hover:bg-blue-50 disabled:opacity-50 transition-colors">
                    Resend {timeRemaining > 840 && `(${fmt(900 - timeRemaining)})`}
                  </button>
                  <button type="submit" disabled={isLoading || otp.length !== 6}
                    className="flex-1 h-11 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all active:scale-95">
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3 – New Password */}
            {step === 'newPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      className="pl-10 pr-10 h-11 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl focus:border-[#1E3A8A]"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password" placeholder="Repeat new password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                      className="pl-10 h-11 bg-[#F0F4FF] dark:bg-[#0A1628] border-blue-100 dark:border-blue-900/30 rounded-xl focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>
                {newPassword && confirmPassword && (
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border ${
                    newPassword === confirmPassword
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800/30 dark:text-emerald-400'
                      : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/10 dark:border-red-800/30'
                  }`}>
                    {newPassword === confirmPassword ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
                <button type="submit" disabled={isLoading}
                  className="w-full h-12 bg-[#1E3A8A] hover:bg-[#2B4FBA] disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
                  {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : 'Reset Password'}
                </button>
              </form>
            )}

            {/* Step 4 – Success */}
            {step === 'success' && (
              <div className="flex flex-col items-center text-center py-4 space-y-5">
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Password Updated!</h2>
                  <p className="text-slate-400 text-sm">Your password has been successfully changed. You can now sign in with your new password.</p>
                </div>
                <button onClick={onBack} className="w-full h-12 bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
                  Back to Sign In →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
