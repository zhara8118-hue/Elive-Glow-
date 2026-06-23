'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import DateFilterBar from '@/components/ui/DateFilterBar';
import BranchFilter from '@/components/ui/BranchFilter';
import Modal from '@/components/ui/Modal';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, getDateRange, logAudit, downloadCSV } from '@/lib/utils';
import type { Expense, ExpenseCategory, Branch, DateFilter } from '@/types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Download, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExpensesPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const isOwner = profile?.role === 'owner';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ ...getDateRange('today'), preset: 'today' });
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [form, setForm] = useState({ branch_id: '', category_id: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd'), note: '' });

  useEffect(() => {
    if (profile?.role === 'manager' && profile.branch_id) {
      setBranchFilter(profile.branch_id);
      setForm(f => ({ ...f, branch_id: profile.branch_id! }));
    }
    loadMeta();
  }, [profile]);

  useEffect(() => { loadExpenses(); }, [dateFilter, branchFilter]);

  const loadMeta = async () => {
    const [{ data: cats }, { data: brs }] = await Promise.all([
      supabase.from('expense_categories').select('*').order('name'),
      supabase.from('branches').select('*').order('name'),
    ]);
    setCategories(cats || []);
    setBranches(brs || []);
  };

  const loadExpenses = async () => {
    setLoading(true);
    let q = supabase.from('expenses')
      .select('*, branch:branches(*), category:expense_categories(*)')
      .gte('expense_date', dateFilter.from)
      .lte('expense_date', dateFilter.to)
      .order('expense_date', { ascending: false });
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    setExpenses(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditExpense(null);
    setForm({ branch_id: profile?.branch_id || '', category_id: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd'), note: '' });
    setModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditExpense(exp);
    setForm({ branch_id: exp.branch_id, category_id: exp.category_id, amount: String(exp.amount), expense_date: exp.expense_date, note: exp.note || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.branch_id || !form.category_id || !form.amount) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    try {
      if (editExpense) {
        const { error } = await supabase.from('expenses').update({ category_id: form.category_id, amount: parseFloat(form.amount), expense_date: form.expense_date, note: form.note || null }).eq('id', editExpense.id);
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'UPDATE', entityType: 'expense', entityId: editExpense.id, branchId: form.branch_id });
        toast.success('Expense updated');
      } else {
        const { data, error } = await supabase.from('expenses').insert({ branch_id: form.branch_id, category_id: form.category_id, amount: parseFloat(form.amount), expense_date: form.expense_date, note: form.note || null, created_by: profile!.id }).select().single();
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'CREATE', entityType: 'expense', entityId: data?.id, branchId: form.branch_id, details: { amount: parseFloat(form.amount) } });
        toast.success('Expense recorded');
      }
      setModalOpen(false);
      loadExpenses();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const handleDelete = async (exp: Expense) => {
    if (!isOwner) return;
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', exp.id);
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'DELETE', entityType: 'expense', entityId: exp.id, branchId: exp.branch_id });
    toast.success('Expense deleted');
    loadExpenses();
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from('expense_categories').insert({ name: newCatName.trim(), is_custom: true, created_by: profile!.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Category added');
    setNewCatName('');
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'CREATE', entityType: 'expense_category', details: { name: newCatName.trim() } });
    loadMeta();
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const catBreakdown: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = (e.category as ExpenseCategory | null)?.name || 'Other';
    catBreakdown[cat] = (catBreakdown[cat] || 0) + Number(e.amount);
  });

  const exportCSV = () => {
    downloadCSV(expenses.map(e => ({
      Date: formatDate(e.expense_date), Branch: (e.branch as Branch | null)?.name || '',
      Category: (e.category as ExpenseCategory | null)?.name || '', Amount: e.amount, Note: e.note || '',
    })), 'elive-glow-expenses');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Elive Glow – Expense Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(dateFilter.from)} – ${formatDate(dateFilter.to)}`, 14, 30);
    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Branch', 'Category', 'Amount', 'Note']],
      body: expenses.map(e => [formatDate(e.expense_date), (e.branch as Branch | null)?.name || '', (e.category as ExpenseCategory | null)?.name || '', `AED ${e.amount}`, e.note || '']),
    });
    doc.save('elive-glow-expenses.pdf');
  };

  return (
    <AppLayout>
      <PageHeader title="Expenses" subtitle="Track costs and spot overspending">
        <button onClick={exportCSV} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2"><Download size={16} /> CSV</button>
        <button onClick={exportPDF} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2"><Download size={16} /> PDF</button>
        {isOwner && <button onClick={() => setCatModalOpen(true)} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2"><Tag size={16} /> Categories</button>}
        <button onClick={openAdd} className="bg-white text-brand-plum hover:bg-brand-champagne px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"><Plus size={16} /> Add Expense</button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card col-span-2"><p className="section-title">Total Expenses</p><p className="font-display text-3xl font-bold text-brand-plum mt-1">{formatCurrency(totalExpenses)}</p></div>
        {Object.entries(catBreakdown).slice(0, 2).map(([cat, amt]) => (
          <div key={cat} className="card"><p className="section-title truncate">{cat}</p><p className="font-display text-xl font-bold text-brand-plum mt-1">{formatCurrency(amt)}</p></div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-cream border-b border-gray-100">
              <tr>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Branch</th>
                <th className="table-header text-left">Category</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-left">Note</th>
                <th className="table-header text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-brand-plum/40">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-brand-plum/40">No expenses found for this period</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-brand-blush/30 transition-colors group">
                  <td className="table-cell text-brand-plum/60">{formatDate(exp.expense_date)}</td>
                  <td className="table-cell text-sm text-brand-plum/60">{(exp.branch as Branch | null)?.name}</td>
                  <td className="table-cell">
                    <span className="badge badge-purple">{(exp.category as ExpenseCategory | null)?.name}</span>
                  </td>
                  <td className="table-cell text-right font-bold text-brand-plum">{formatCurrency(Number(exp.amount))}</td>
                  <td className="table-cell text-sm text-brand-plum/50">{exp.note || '—'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-brand-blush text-brand-plum/40 hover:text-brand-rose transition-colors"><Pencil size={14} /></button>
                      {isOwner && <button onClick={() => handleDelete(exp)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-plum/40 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editExpense ? 'Edit Expense' : 'Record Expense'}>
        <div className="space-y-4">
          {isOwner && !editExpense && (
            <div>
              <label className="label">Branch *</label>
              <select className="select" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category *</label>
              <select className="select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_custom ? ' ✦' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (AED) *</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Note (Optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="Add any notes..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editExpense ? 'Update' : 'Record'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Expense Categories" subtitle="Manage and add custom categories">
        <div className="space-y-4">
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-cream">
                <span className="text-sm font-medium text-brand-plum">{cat.name}</span>
                {cat.is_custom && <span className="badge badge-purple text-xs">Custom</span>}
              </div>
            ))}
          </div>
          {isOwner && (
            <div className="border-t border-gray-100 pt-4">
              <p className="section-title mb-2">Add Custom Category</p>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Category name..." value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
                <button onClick={addCategory} className="btn-primary px-4"><Plus size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
