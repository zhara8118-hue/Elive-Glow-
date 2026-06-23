'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-rose/30 border-t-brand-rose rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-plum/50 text-sm uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <Sidebar />
      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
