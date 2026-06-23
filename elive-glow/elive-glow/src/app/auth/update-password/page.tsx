'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password set successfully! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-header mb-4 shadow-luxury">
            <Sparkles className="w-8 h-8 text-brand-champagne" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-plum">Set Your Password</h1>
          <p className="text-brand-plum/50 text-sm mt-1">Choose a secure password for your account</p>
        </div>

        <div className="card border border-brand-champagne/40">
          <div className="gradient-header -mx-6 -mt-6 mb-6 px-6 py-4 rounded-t-2xl">
            <h2 className="text-white font-semibold">Create Password</h2>
            <p className="text-white/60 text-sm">Minimum 8 characters</p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-rose">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
