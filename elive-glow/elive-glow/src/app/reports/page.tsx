'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import DateFilterBar from '@/components/ui/DateFilterBar';
import BranchFilter from '@/components/ui/BranchFilter';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, getDateRange, downloadCSV } from '@/lib/utils';
import type { DateFilter, Branch, ExpenseCategory, StaffMember } from '@/types';
import toast from 'react-hot-toast';
import { Download, FileText, TrendingUp, Receipt, Users, UserCheck } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'sales' | 'expenses' | 'staff' | 'customers';

const REPORTS = [
  { key: 'sales' as ReportType, label: 'Sales Summary', icon: TrendingUp, desc: 'All transactions, cash vs card breakdown' },
  { key: 'expenses' as ReportType, label: 'Expense Breakdown', icon: Receipt, desc: 'Costs by category and branch' },
  { key: 'staff' as ReportType, label: 'Staff Performance', icon: UserCheck, desc: 'Revenue and services per staff' },
  { key: 'customers' as ReportType, label: 'Customer Growth', icon: Users, desc: 'New vs returning customer trends' },
];

export default function ReportsPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>({ ...getDateRange('month'), preset: 'month' });
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales');
  const [generating, setGenerating] = useState(false);

  useEffect_once(() => {
    if (profile?.role === 'manager' && profile.branch_id) setBranchFilter(profile.branch_id);
  });

  function useEffect_once(fn: () => void) {
    const [ran, setRan] = useState(false);
    if (!ran) { fn(); setRan(true); }
  }

  const getBranchLabel = () => branchFilter === 'all' ? 'All Branches' : branchFilter;

  const generateSalesReport = async () => {
    let q = supabase.from('sale_transactions')
      .select('*, branch:branches(*), staff:staff_members(*)')
      .gte('sale_date', dateFilter.from).lte('sale_date', dateFilter.to)
      .order('sale_date', { ascending: false });
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    return data || [];
  };

  const generateExpensesReport = async () => {
    let q = supabase.from('expenses')
      .select('*, branch:branches(*), category:expense_categories(*)')
      .gte('expense_date', dateFilter.from).lte('expense_date', dateFilter.to)
      .order('expense_date', { ascending: false });
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    return data || [];
  };

  const generateStaffReport = async () => {
    let q = supabase.from('sale_transactions')
      .select('amount, staff_id, staff:staff_members(*), branch:branches(*)')
      .gte('sale_date', dateFilter.from).lte('sale_date', dateFilter.to)
      .not('staff_id', 'is', null);
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    const map: Record<string, { name: string; branch: string; revenue: number; services: number }> = {};
    (data || []).forEach((sale: { amount: number; staff_id: string | null; staff: StaffMember[] | null; branch: Branch[] | null }) => {
      const staff = sale.staff?.[0] ?? null;
      const branch = sale.branch?.[0] ?? null;
      if (!sale.staff_id || !staff) return;
      if (!map[sale.staff_id]) map[sale.staff_id] = { name: staff.name, branch: branch?.name || '', revenue: 0, services: 0 };
      map[sale.staff_id].revenue += Number(sale.amount);
      map[sale.staff_id].services += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  };

  const generateCustomersReport = async () => {
    let q = supabase.from('customers').select('*, branch:branches(*)').order('last_visit', { ascending: false });
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    return data || [];
  };

  const exportPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const period = `${formatDate(dateFilter.from)} – ${formatDate(dateFilter.to)}`;
      const branch = branchFilter === 'all' ? 'All Branches' : '';
              <p className="section-title">Sales Preview</p>
              <p className="font-display font-bold text-brand-plum mt-0.5">Sales Summary</p>
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Elive Glow', 14, 18);
      doc.setFontSize(11);
      doc.text(REPORTS.find(r => r.key === selectedReport)?.label + ' Report', 14, 28);
      doc.setFontSize(9);
          <div className="bg-brand-cream rounded-xl p-8 text-center">
            <FileText size={48} className="mx-auto text-brand-plum/20 mb-3" />
            <p className="font-display font-bold text-brand-plum/40">Report Preview</p>
            <p className="text-sm text-brand-plum/30 mt-1">Below is a preview for the selected period/date.</p>

            {selectedReport === 'sales' ? (
              <div className="mt-6 text-left">
                <p className="text-sm font-semibold mb-2">Sales for {formatDate(dateFilter.from)}</p>
                <PreviewSales date={dateFilter.from} supabase={supabase} branchFilter={branchFilter} />
              </div>
            ) : (
              <>
                <p className="font-display font-bold text-brand-plum/40 mt-4">Click "Export PDF" or "Export CSV"</p>
                <p className="text-sm text-brand-plum/30 mt-1">to generate and download the {REPORTS.find(r => r.key === selectedReport)?.label} report</p>
              </>
            )}
          </div>
      if (selectedReport === 'sales') {
        const sales = await generateSalesReport();
        const total = sales.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        const cash = sales.filter((s: { payment_type: string }) => s.payment_type === 'cash').reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        const card = sales.filter((s: { payment_type: string }) => s.payment_type === 'card').reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        doc.setFontSize(11);
        doc.text(`Total Revenue: AED ${total.toLocaleString()}   Cash: AED ${cash.toLocaleString()}   Card: AED ${card.toLocaleString()}`, 14, 50);
        autoTable(doc, {
          startY: 58,
          head: [['Date', 'Customer', 'Service', 'Staff', 'Payment', 'Amount']],
          body: sales.map((s: { sale_date: string; customer_name: string; service_name: string; staff: StaffMember | null; payment_type: string; amount: number }) => [
            formatDate(s.sale_date), s.customer_name, s.service_name, s.staff?.name || '—', s.payment_type.toUpperCase(), `AED ${Number(s.amount).toLocaleString()}`
          ]),
          headStyles: { fillColor: [61, 31, 47] },
          alternateRowStyles: { fillColor: [247, 232, 236] },
        });
      } else if (selectedReport === 'expenses') {
        const expenses = await generateExpensesReport();
        const total = expenses.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        doc.setFontSize(11);
        doc.text(`Total Expenses: AED ${total.toLocaleString()}`, 14, 50);
        autoTable(doc, {
          startY: 58,
          head: [['Date', 'Branch', 'Category', 'Amount', 'Note']],
          body: expenses.map((e: { expense_date: string; branch: Branch | null; category: ExpenseCategory | null; amount: number; note: string | null }) => [
            formatDate(e.expense_date), e.branch?.name || '', e.category?.name || '', `AED ${Number(e.amount).toLocaleString()}`, e.note || ''
          ]),
          headStyles: { fillColor: [61, 31, 47] },
          alternateRowStyles: { fillColor: [247, 232, 236] },
        });
      } else if (selectedReport === 'staff') {
        const staffPerf = await generateStaffReport();
        autoTable(doc, {
          startY: 50,
          head: [['Rank', 'Staff Member', 'Branch', 'Revenue', 'Services', 'Avg/Service']],
          body: staffPerf.map((s, i) => [
            i + 1, s.name, s.branch, `AED ${s.revenue.toLocaleString()}`, s.services, `AED ${(s.services ? s.revenue / s.services : 0).toFixed(0)}`
          ]),
          headStyles: { fillColor: [61, 31, 47] },
          alternateRowStyles: { fillColor: [247, 232, 236] },
        });
      } else {
        const customers = await generateCustomersReport();
        autoTable(doc, {
          startY: 50,
          head: [['Name', 'Contact', 'Branch', 'First Visit', 'Last Visit', 'Visits']],
          body: customers.map((c: { name: string; contact_number: string | null; branch: Branch | null; first_visit: string | null; last_visit: string | null; visit_count: number }) => [
            c.name, c.contact_number || '', c.branch?.name || '', c.first_visit ? formatDate(c.first_visit) : '', c.last_visit ? formatDate(c.last_visit) : '', c.visit_count
          ]),
          headStyles: { fillColor: [61, 31, 47] },
          alternateRowStyles: { fillColor: [247, 232, 236] },
        });
      }

      doc.save(`elive-glow-${selectedReport}-report.pdf`);
      toast.success('PDF report downloaded');
    } catch (e: unknown) { toast.error((e as Error).message); }
    setGenerating(false);
  };

  const exportCSVReport = async () => {
    setGenerating(true);
    try {
      if (selectedReport === 'sales') {
        const sales = await generateSalesReport();
        downloadCSV(sales.map((s: { sale_date: string; customer_name: string; customer_contact: string | null; service_name: string; staff: StaffMember | null; branch: Branch | null; payment_type: string; amount: number; customer_type: string }) => ({
          Date: formatDate(s.sale_date), Customer: s.customer_name, Contact: s.customer_contact || '',
          Service: s.service_name, Staff: s.staff?.name || '', Branch: s.branch?.name || '',
          Payment: s.payment_type, Type: s.customer_type, Amount: s.amount,
        })), 'elive-glow-sales-report');
      } else if (selectedReport === 'expenses') {
        const expenses = await generateExpensesReport();
        const rows = expenses.map((e: { expense_date: string; branch: Branch | null; category: ExpenseCategory | null; amount: number; note: string | null }) => ({
          Date: formatDate(e.expense_date), Branch: e.branch?.name || '', Category: e.category?.name || '', Amount: e.amount, Note: e.note || '',
        }));
        const total = rows.reduce((s: number, r: any) => s + Number(r.Amount || 0), 0);
        if (rows.length) rows.push({ Date: '', Branch: '', Category: 'Total', Amount: total, Note: '' });
        downloadCSV(rows, 'elive-glow-expenses-report');
      } else if (selectedReport === 'staff') {
        const staffPerf = await generateStaffReport();
        downloadCSV(staffPerf.map((s, i) => ({
          Rank: i + 1, 'Staff Member': s.name, Branch: s.branch, Revenue: s.revenue,
          Services: s.services, 'Avg Per Service': s.services ? (s.revenue / s.services).toFixed(0) : 0,
        })), 'elive-glow-staff-report');
      } else {
        const customers = await generateCustomersReport();
        downloadCSV(customers.map((c: { name: string; contact_number: string | null; branch: Branch | null; first_visit: string | null; last_visit: string | null; visit_count: number }) => ({
          Name: c.name, Contact: c.contact_number || '', Branch: c.branch?.name || '',
          'First Visit': c.first_visit ? formatDate(c.first_visit) : '', 'Last Visit': c.last_visit ? formatDate(c.last_visit) : '',
          Visits: c.visit_count,
        })), 'elive-glow-customers-report');
      }
      toast.success('CSV report downloaded');
    } catch (e: unknown) { toast.error((e as Error).message); }
    setGenerating(false);
  };

  return (
    <AppLayout>
      <PageHeader title="Reports" subtitle="Generate and export detailed reports">
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={exportCSVReport} disabled={generating} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={exportPDF} disabled={generating} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm">
            <Download size={16} /> {generating ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {REPORTS.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => setSelectedReport(key)}
            className={cn(
              'card text-left transition-all',
              selectedReport === key
                ? 'border-2 border-brand-rose shadow-luxury-hover'
                : 'border border-transparent hover:border-brand-rose/30'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', selectedReport === key ? 'gradient-header' : 'bg-brand-cream')}>
              <Icon size={20} className={selectedReport === key ? 'text-white' : 'text-brand-rose'} />
            </div>
            <p className="font-semibold text-brand-plum text-sm">{label}</p>
            <p className="text-xs text-brand-plum/40 mt-1">{desc}</p>
            {selectedReport === key && <div className="mt-3 text-xs font-bold text-brand-rose uppercase tracking-wider flex items-center gap-1"><FileText size={11} /> Selected</div>}
          </button>
        ))}
      </div>

      {/* Preview panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-title">Report Preview</p>
            <p className="font-display font-bold text-brand-plum mt-0.5">{REPORTS.find(r => r.key === selectedReport)?.label}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-plum/40">
            <span>{formatDate(dateFilter.from)} – {formatDate(dateFilter.to)}</span>
            <span>·</span>
            <span>{branchFilter === 'all' ? 'All Branches' : 'Branch filtered'}</span>
          </div>
        </div>
        <div className="bg-brand-cream rounded-xl p-8 text-center">
          <FileText size={48} className="mx-auto text-brand-plum/20 mb-3" />
          <p className="font-display font-bold text-brand-plum/40">Click "Export PDF" or "Export CSV"</p>
          <p className="text-sm text-brand-plum/30 mt-1">to generate and download the {REPORTS.find(r => r.key === selectedReport)?.label} report</p>
        </div>
      </div>
    </AppLayout>
  );
}
