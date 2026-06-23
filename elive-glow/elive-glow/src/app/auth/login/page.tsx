'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset link sent to your email!');
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-rose/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-lavender/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-header mb-4 shadow-luxury">
            <Sparkles className="w-10 h-10 text-brand-champagne" />
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-plum tracking-tight">
            Elive Glow
          </h1>
          <p className="text-brand-plum/50 text-sm mt-1 uppercase tracking-widest font-medium">
            Salon Management
          </p>
        </div>

        {/* Card */}
        <div className="card border border-brand-champagne/40">
          {/* Gradient strip */}
          <div className="gradient-header -mx-6 -mt-6 mb-6 px-6 py-4 rounded-t-2xl">
            <h2 className="text-white font-semibold text-lg">
              {mode === 'login' ? 'Sign In to Dashboard' : 'Reset Password'}
            </h2>
            <p className="text-white/60 text-sm">
              {mode === 'login' ? 'Welcome back — enter your credentials' : 'Enter your email to receive reset link'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handlePasswordReset} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="you@eliveglow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode === 'login' && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-rose transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Sending...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'reset' : 'login')}
              className="text-sm text-brand-rose hover:text-brand-plum transition-colors font-medium"
            >
              {mode === 'login' ? 'Forgot password?' : '← Back to sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-brand-plum/30 mt-6">
          Elive Glow © {new Date().getFullYear()} · Dubai & Sharjah
        </p>
      </div>
    </div>
  );
}
