'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import KPICard from '@/components/ui/KPICard';
import DateFilterBar from '@/components/ui/DateFilterBar';
import BranchFilter from '@/components/ui/BranchFilter';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, getDateRange } from '@/lib/utils';
import type { DateFilter, KPIData, ExpenseCategory } from '@/types';
import {
  TrendingUp, Receipt, Wallet, Users, CreditCard, Banknote,
  UserPlus, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

const CHART_COLORS = ['#C9748A', '#8B6FA8', '#C9A84C', '#3D1F2F', '#5B8DB8'];

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>({ ...getDateRange('month'), preset: 'month' });
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [kpi, setKpi] = useState<KPIData>({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, customerCount: 0, cashSales: 0, cardSales: 0, newCustomers: 0, returningCustomers: 0 });
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number; expenses: number }[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<{ date: string; new: number; returning: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'manager' && profile.branch_id) {
      setBranchFilter(profile.branch_id);
    }
  }, [profile]);

  useEffect(() => {
    loadDashboard();
  }, [dateFilter, branchFilter]);

  const loadDashboard = async () => {
    setLoading(true);
    const { from, to } = dateFilter;

    let salesQuery = supabase
      .from('sale_transactions')
      .select('amount, payment_type, customer_type, sale_date, branch_id')
      .gte('sale_date', from)
      .lte('sale_date', to);

    let expenseQuery = supabase
      .from('expenses')
      .select('amount, expense_date, branch_id, category:expense_categories(name)')
      .gte('expense_date', from)
      .lte('expense_date', to);

    if (branchFilter !== 'all') {
      salesQuery = salesQuery.eq('branch_id', branchFilter);
      expenseQuery = expenseQuery.eq('branch_id', branchFilter);
    }

    const [{ data: sales }, { data: expenses }, { data: customers }] = await Promise.all([
      salesQuery,
      expenseQuery,
      supabase.from('customers').select('id, branch_id, created_at').gte('first_visit', from).lte('first_visit', to),
    ]);

    const totalRevenue = (sales || []).reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = (expenses || []).reduce((s, r) => s + Number(r.amount), 0);
    const cashSales = (sales || []).filter(s => s.payment_type === 'cash').reduce((s, r) => s + Number(r.amount), 0);
    const cardSales = (sales || []).filter(s => s.payment_type === 'card').reduce((s, r) => s + Number(r.amount), 0);
    const newCustomers = (sales || []).filter(s => s.customer_type === 'new').length;
    const returningCustomers = (sales || []).filter(s => s.customer_type === 'returning').length;

    setKpi({
      totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses,
      customerCount: newCustomers + returningCustomers, cashSales, cardSales,
      newCustomers, returningCustomers,
    });

    // Revenue trend by day
    const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
    const dailyData = days.slice(-30).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayRevenue = (sales || []).filter(s => s.sale_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
      const dayExpenses = (expenses || []).filter(e => e.expense_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
      return { date: format(day, 'dd MMM'), revenue: dayRevenue, expenses: dayExpenses };
    });
    setRevenueData(dailyData);

    // Expense breakdown by category
    const catMap: Record<string, number> = {};
    (expenses || []).forEach(e => {
      const cat = (e.category as { name?: string } | null)?.name || 'Other';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });
    setExpenseBreakdown(Object.entries(catMap).map(([name, value]) => ({ name, value })));

    // Customer growth
    const customerDays = days.slice(-14).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayNew = (sales || []).filter(s => s.sale_date === dateStr && s.customer_type === 'new').length;
      const dayRet = (sales || []).filter(s => s.sale_date === dateStr && s.customer_type === 'returning').length;
      return { date: format(day, 'dd MMM'), new: dayNew, returning: dayRet };
    });
    setCustomerGrowth(customerDays);

    setLoading(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle={profile?.role === 'manager' ? `${profile.branch?.name} · Branch Overview` : 'All Branches · Global Overview'}
      >
        <button onClick={loadDashboard} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2">
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Revenue" value={formatCurrency(kpi.totalRevenue)} icon={TrendingUp} color="rose" />
        <KPICard title="Total Expenses" value={formatCurrency(kpi.totalExpenses)} icon={Receipt} color="gold" />
        <KPICard title="Net Profit" value={formatCurrency(kpi.netProfit)} icon={Wallet} color={kpi.netProfit >= 0 ? 'green' : 'rose'} />
        <KPICard title="Total Customers" value={kpi.customerCount.toString()} icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard title="Cash Sales" value={formatCurrency(kpi.cashSales)} icon={Banknote} color="green" />
        <KPICard title="Card Sales" value={formatCurrency(kpi.cardSales)} icon={CreditCard} color="blue" />
        <KPICard title="New Customers" value={kpi.newCustomers.toString()} icon={UserPlus} color="rose" />
        <KPICard title="Returning" value={kpi.returningCustomers.toString()} icon={RefreshCw} color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue vs Expenses */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">Revenue vs Expenses</p>
              <p className="font-display text-lg font-bold text-brand-plum mt-0.5">Daily Trend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9748A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C9748A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v/1000}k`} />
              <Tooltip formatter={(val) => formatCurrency(Number(val))} contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#C9748A" strokeWidth={2} fill="url(#rev)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#C9A84C" strokeWidth={2} fill="url(#exp)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="card">
          <p className="section-title mb-1">Expense Breakdown</p>
          <p className="font-display text-lg font-bold text-brand-plum mb-4">By Category</p>
          {expenseBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                  {expenseBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(Number(val))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-brand-plum/30 text-sm">No expense data for this period</div>
          )}
        </div>
      </div>

      {/* Customer Growth */}
      <div className="card">
        <p className="section-title mb-1">Customer Growth</p>
        <p className="font-display text-lg font-bold text-brand-plum mb-4">New vs Returning</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={customerGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }} />
            <Legend />
            <Bar dataKey="new" name="New" fill="#C9748A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="returning" name="Returning" fill="#8B6FA8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppLayout>
  );
}
