'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingBag, Receipt, Users, Calendar,
  BarChart3, Settings, ScrollText, LogOut, Crown, Shield,
  Sparkles, Menu, X, ChevronRight, UserCheck
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales', label: 'Sales', icon: ShoppingBag },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/staff', label: 'Staff Performance', icon: UserCheck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/audit', label: 'Audit Log', icon: ScrollText, ownerOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter(item => !item.ownerOnly || profile?.role === 'owner');

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="gradient-header p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-brand-champagne" />
          </div>
          <div>
            <h1 className="font-display text-white font-bold text-lg leading-none">Elive Glow</h1>
            <p className="text-white/50 text-xs uppercase tracking-widest">Salon Management</p>
          </div>
        </div>

        {/* User info */}
        {profile && (
          <div className="mt-5 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-inner', getAvatarColor(profile.full_name))}>
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full rounded-xl object-cover" />
              ) : getInitials(profile.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{profile.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {profile.role === 'owner' ? (
                  <><Crown className="w-3 h-3 text-brand-gold" /><span className="text-brand-gold text-xs font-medium">Owner</span></>
                ) : (
                  <><Shield className="w-3 h-3 text-white/60" /><span className="text-white/60 text-xs">Manager</span></>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch context for manager */}
      {profile?.role === 'manager' && profile.branch && (
        <div className="mx-4 mt-3 px-3 py-2 bg-brand-blush rounded-xl border border-brand-rose/20">
          <p className="text-xs text-brand-plum/40 uppercase tracking-wider font-semibold">Your Branch</p>
          <p className="text-sm font-semibold text-brand-plum mt-0.5 truncate">{profile.branch.name}</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <p className="section-title mb-3 px-1">Navigation</p>
        {filteredNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(active ? 'sidebar-item-active' : 'sidebar-item', 'flex items-center gap-3')}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-brand-rose" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-gray-100">
        <button onClick={signOut} className="sidebar-item w-full text-red-400 hover:bg-red-50 hover:text-red-500">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 min-h-screen bg-white border-r border-gray-100 shadow-card fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 gradient-header px-4 py-3 flex items-center justify-between shadow-luxury">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-champagne" />
          <span className="font-display text-white font-bold text-lg">Elive Glow</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-luxury" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
