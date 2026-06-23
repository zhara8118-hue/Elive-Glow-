'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import DateFilterBar from '@/components/ui/DateFilterBar';
import BranchFilter from '@/components/ui/BranchFilter';
import Avatar from '@/components/ui/Avatar';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, getDateRange } from '@/lib/utils';
import type { StaffMember, DateFilter } from '@/types';
import { Trophy, Star, TrendingUp, Hash } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

interface StaffPerf {
  staff: StaffMember;
  revenue: number;
  services: number;
  avgTransaction: number;
}

export default function StaffPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>({ ...getDateRange('month'), preset: 'month' });
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [perf, setPerf] = useState<StaffPerf[]>([]);
  const [weekTopStaff, setWeekTopStaff] = useState<StaffPerf | null>(null);
  const [monthTopStaff, setMonthTopStaff] = useState<StaffPerf | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'manager' && profile.branch_id) setBranchFilter(profile.branch_id);
  }, [profile]);

  useEffect(() => { loadPerf(); }, [dateFilter, branchFilter]);

  const buildPerf = async (from: string, to: string, branchId?: string): Promise<StaffPerf[]> => {
    let q = supabase.from('sale_transactions')
      .select('amount, staff_id, staff:staff_members(*)')
      .gte('sale_date', from).lte('sale_date', to).not('staff_id', 'is', null);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    const { data: sales } = await q;
    const map: Record<string, StaffPerf> = {};
    (sales || []).forEach((sale: { amount: number; staff_id: string | null; staff: StaffMember[] | null }) => {
      const staff = sale.staff?.[0] ?? null;
      if (!sale.staff_id || !staff) return;
      if (!map[sale.staff_id]) map[sale.staff_id] = { staff, revenue: 0, services: 0, avgTransaction: 0 };
      map[sale.staff_id].revenue += Number(sale.amount);
      map[sale.staff_id].services += 1;
    });
    return Object.values(map).map(p => ({ ...p, avgTransaction: p.services > 0 ? p.revenue / p.services : 0 })).sort((a, b) => b.revenue - a.revenue);
  };

  const loadPerf = async () => {
    setLoading(true);
    const now = new Date();
    const [main, week, month] = await Promise.all([
      buildPerf(dateFilter.from, dateFilter.to, branchFilter),
      buildPerf(format(startOfWeek(now), 'yyyy-MM-dd'), format(endOfWeek(now), 'yyyy-MM-dd'), branchFilter),
      buildPerf(format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd'), branchFilter),
    ]);
    setPerf(main);
    setWeekTopStaff(week[0] || null);
    setMonthTopStaff(month[0] || null);
    setLoading(false);
  };

  return (
    <AppLayout>
      <PageHeader title="Staff Performance" subtitle="Revenue contribution and service metrics per staff member" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
      </div>

      {/* Top Performer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card border-2 border-brand-gold/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-gold" />
          <div className="flex items-start justify-between pt-1">
            <div>
              <p className="section-title flex items-center gap-1.5"><Trophy size={13} className="text-brand-gold" /> Top Performer – This Week</p>
              {weekTopStaff ? (
                <div className="flex items-center gap-3 mt-3">
                  <Avatar name={weekTopStaff.staff.name} photoUrl={weekTopStaff.staff.photo_url} size="lg" />
                  <div>
                    <p className="font-display font-bold text-xl text-brand-plum">{weekTopStaff.staff.name}</p>
                    <p className="text-2xl font-bold text-brand-gold">{formatCurrency(weekTopStaff.revenue)}</p>
                    <p className="text-xs text-brand-plum/40">{weekTopStaff.services} services</p>
                  </div>
                </div>
              ) : <p className="text-brand-plum/30 text-sm mt-3">No data this week</p>}
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Star size={22} className="text-brand-gold" />
            </div>
          </div>
        </div>

        <div className="card border-2 border-brand-rose/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient-header" />
          <div className="flex items-start justify-between pt-1">
            <div>
              <p className="section-title flex items-center gap-1.5"><Trophy size={13} className="text-brand-rose" /> Top Performer – This Month</p>
              {monthTopStaff ? (
                <div className="flex items-center gap-3 mt-3">
                  <Avatar name={monthTopStaff.staff.name} photoUrl={monthTopStaff.staff.photo_url} size="lg" />
                  <div>
                    <p className="font-display font-bold text-xl text-brand-plum">{monthTopStaff.staff.name}</p>
                    <p className="text-2xl font-bold text-brand-rose">{formatCurrency(monthTopStaff.revenue)}</p>
                    <p className="text-xs text-brand-plum/40">{monthTopStaff.services} services</p>
                  </div>
                </div>
              ) : <p className="text-brand-plum/30 text-sm mt-3">No data this month</p>}
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Trophy size={22} className="text-brand-rose" />
            </div>
          </div>
        </div>
      </div>

      {/* Staff list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="section-title">All Staff Performance</p>
            <p className="font-display font-bold text-brand-plum mt-0.5">Selected Period</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-cream border-b border-gray-100">
              <tr>
                <th className="table-header text-left">Rank</th>
                <th className="table-header text-left">Staff Member</th>
                <th className="table-header text-right">Revenue</th>
                <th className="table-header text-right">Services</th>
                <th className="table-header text-right">Avg. Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-brand-plum/40">Loading...</td></tr>
              ) : perf.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-brand-plum/40">No staff data for this period</td></tr>
              ) : perf.map((p, i) => (
                <tr key={p.staff.id} className="hover:bg-brand-blush/30 transition-colors">
                  <td className="table-cell">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-gray-100 text-gray-500' : i === 2 ? 'bg-orange-100 text-orange-500' : 'bg-brand-cream text-brand-plum/40'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.staff.name} photoUrl={p.staff.photo_url} size="sm" />
                      <span className="font-semibold text-brand-plum">{p.staff.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-right font-bold text-brand-plum">{formatCurrency(p.revenue)}</td>
                  <td className="table-cell text-right text-brand-plum/70">{p.services}</td>
                  <td className="table-cell text-right text-brand-plum/70">{formatCurrency(p.avgTransaction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
