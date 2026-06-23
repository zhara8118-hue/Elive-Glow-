'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import DateFilterBar from '@/components/ui/DateFilterBar';
import BranchFilter from '@/components/ui/BranchFilter';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, getDateRange, logAudit, downloadCSV } from '@/lib/utils';
import type { SaleTransaction, StaffMember, DateFilter, Branch, Service, CustomerType, PaymentType } from '@/types';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Download, Search, Banknote, CreditCard,
  AlertCircle, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const emptyForm = {
  customer_name: '', customer_contact: '', customer_type: 'new' as CustomerType,
  service_name: '', amount: '', payment_type: 'cash' as PaymentType,
  staff_id: '', sale_date: format(new Date(), 'yyyy-MM-dd'), branch_id: '',
};

export default function SalesPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const isOwner = profile?.role === 'owner';

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ ...getDateRange('today'), preset: 'today' });
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editSale, setEditSale] = useState<SaleTransaction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailSale, setDetailSale] = useState<SaleTransaction | null>(null);

  useEffect(() => {
    if (profile?.role === 'manager' && profile.branch_id) {
      setBranchFilter(profile.branch_id);
      setForm(f => ({ ...f, branch_id: profile.branch_id! }));
    }
    loadMeta();
  }, [profile]);

  useEffect(() => { loadSales(); }, [dateFilter, branchFilter]);

  const loadMeta = async () => {
    const [{ data: st }, { data: br }, { data: sv }] = await Promise.all([
      supabase.from('staff_members').select('*').eq('is_active', true).order('name'),
      supabase.from('branches').select('*').order('name'),
      supabase.from('services').select('*').eq('is_active', true).order('name'),
    ]);
    setStaff(st || []);
    setBranches(br || []);
    setServices(sv || []);
  };

  const loadSales = async () => {
    setLoading(true);
    let q = supabase.from('sale_transactions')
      .select('*, branch:branches(*), staff:staff_members(*)')
      .gte('sale_date', dateFilter.from)
      .lte('sale_date', dateFilter.to)
      .order('sale_date', { ascending: false });
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    setSales(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditSale(null);
    setForm({ ...emptyForm, branch_id: profile?.branch_id || '' });
    setModalOpen(true);
  };

  const openEdit = (sale: SaleTransaction) => {
    if (!isOwner && sale.is_modified) {
      toast.error('Sales can only be modified once');
      return;
    }
    setEditSale(sale);
    setForm({
      customer_name: sale.customer_name,
      customer_contact: sale.customer_contact || '',
      customer_type: sale.customer_type,
      service_name: sale.service_name,
      amount: String(sale.amount),
      payment_type: sale.payment_type,
      staff_id: sale.staff_id || '',
      sale_date: sale.sale_date,
      branch_id: sale.branch_id,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.service_name || !form.amount || !form.branch_id) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editSale) {
        const modLog = {
          modified_by: profile!.id,
          modified_by_name: profile!.full_name,
          modified_at: new Date().toISOString(),
          old_values: { customer_name: editSale.customer_name, service_name: editSale.service_name, amount: editSale.amount },
          new_values: { customer_name: form.customer_name, service_name: form.service_name, amount: parseFloat(form.amount) },
        };
        const { error } = await supabase.from('sale_transactions').update({
          customer_name: form.customer_name, customer_contact: form.customer_contact || null,
          customer_type: form.customer_type, service_name: form.service_name,
          amount: parseFloat(form.amount), payment_type: form.payment_type,
          staff_id: form.staff_id || null, sale_date: form.sale_date,
          is_modified: true, modification_log: modLog,
        }).eq('id', editSale.id);
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'UPDATE', entityType: 'sale_transaction', entityId: editSale.id, branchId: form.branch_id, details: modLog });
        toast.success('Sale updated');
      } else {
        const { data: newSale, error } = await supabase.from('sale_transactions').insert({
          branch_id: form.branch_id, customer_name: form.customer_name,
          customer_contact: form.customer_contact || null, customer_type: form.customer_type,
          service_name: form.service_name, amount: parseFloat(form.amount),
          payment_type: form.payment_type, staff_id: form.staff_id || null,
          sale_date: form.sale_date, created_by: profile!.id,
        }).select().single();
        if (error) throw error;
        // Upsert customer record
        const existingCustomer = await supabase.from('customers')
          .select('id, visit_count').eq('branch_id', form.branch_id)
          .ilike('name', form.customer_name).single();
        if (existingCustomer.data) {
          await supabase.from('customers').update({ last_visit: form.sale_date, visit_count: existingCustomer.data.visit_count + 1, contact_number: form.customer_contact || null }).eq('id', existingCustomer.data.id);
        } else if (form.customer_name) {
          await supabase.from('customers').insert({ branch_id: form.branch_id, name: form.customer_name, contact_number: form.customer_contact || null, first_visit: form.sale_date, last_visit: form.sale_date, visit_count: 1 });
        }
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'CREATE', entityType: 'sale_transaction', entityId: newSale?.id, branchId: form.branch_id, details: { service: form.service_name, amount: parseFloat(form.amount) } });
        toast.success('Sale recorded');
      }
      setModalOpen(false);
      loadSales();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };

  const handleDelete = async (sale: SaleTransaction) => {
    if (!isOwner) return;
    if (!confirm('Delete this sale? This cannot be undone.')) return;
    await supabase.from('sale_transactions').delete().eq('id', sale.id);
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'DELETE', entityType: 'sale_transaction', entityId: sale.id, branchId: sale.branch_id, details: { service: sale.service_name, amount: sale.amount } });
    toast.success('Sale deleted');
    loadSales();
  };

  const filtered = sales.filter(s =>
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.service_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.reduce((s, r) => s + Number(r.amount), 0);
  const cashTotal = filtered.filter(s => s.payment_type === 'cash').reduce((s, r) => s + Number(r.amount), 0);
  const cardTotal = filtered.filter(s => s.payment_type === 'card').reduce((s, r) => s + Number(r.amount), 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Elive Glow – Sales Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(dateFilter.from)} – ${formatDate(dateFilter.to)}`, 14, 30);
    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Customer', 'Service', 'Staff', 'Payment', 'Amount']],
      body: filtered.map(s => [
        formatDate(s.sale_date), s.customer_name, s.service_name,
        s.staff?.name || '—', s.payment_type.toUpperCase(), `AED ${s.amount}`,
      ]),
    });
    doc.save('elive-glow-sales.pdf');
  };

  const exportCSV = () => {
    downloadCSV(filtered.map(s => ({
      Date: formatDate(s.sale_date), Customer: s.customer_name, Contact: s.customer_contact || '',
      Service: s.service_name, Staff: s.staff?.name || '', Branch: s.branch?.name || '',
      Payment: s.payment_type, Amount: s.amount, Modified: s.is_modified ? 'Yes' : 'No',
    })), 'elive-glow-sales');
  };

  return (
    <AppLayout>
      <PageHeader title="Sales" subtitle="Track daily transactions and revenue">
        <button onClick={exportCSV} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2">
          <Download size={16} /> CSV
        </button>
        <button onClick={exportPDF} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2">
          <Download size={16} /> PDF
        </button>
        <button onClick={openAdd} className="bg-white text-brand-plum hover:bg-brand-champagne px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all">
          <Plus size={16} /> Add Sale
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 py-2 text-sm w-48" placeholder="Search sales..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center"><p className="section-title">Total Revenue</p><p className="font-display text-2xl font-bold text-brand-plum mt-1">{formatCurrency(totalRevenue)}</p></div>
        <div className="card text-center"><p className="section-title flex items-center justify-center gap-1"><Banknote size={14} /> Cash</p><p className="font-display text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(cashTotal)}</p></div>
        <div className="card text-center"><p className="section-title flex items-center justify-center gap-1"><CreditCard size={14} /> Card</p><p className="font-display text-2xl font-bold text-blue-600 mt-1">{formatCurrency(cardTotal)}</p></div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-cream border-b border-gray-100">
              <tr>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left">Service</th>
                <th className="table-header text-left">Staff</th>
                <th className="table-header text-left">Branch</th>
                <th className="table-header text-left">Payment</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-left">Modified</th>
                <th className="table-header text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-brand-plum/40">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-brand-plum/40">No sales found for this period</td></tr>
              ) : filtered.map(sale => (
                <tr key={sale.id} className="hover:bg-brand-blush/30 transition-colors group">
                  <td className="table-cell text-brand-plum/60">{formatDate(sale.sale_date)}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-semibold text-brand-plum">{sale.customer_name}</p>
                      {sale.customer_contact && <p className="text-xs text-brand-plum/40">{sale.customer_contact}</p>}
                    </div>
                  </td>
                  <td className="table-cell">{sale.service_name}</td>
                  <td className="table-cell">{sale.staff?.name || <span className="text-brand-plum/30">—</span>}</td>
                  <td className="table-cell text-xs text-brand-plum/60">{sale.branch?.name}</td>
                  <td className="table-cell">
                    <span className={cn('badge', sale.payment_type === 'cash' ? 'badge-green' : 'badge-blue')}>
                      {sale.payment_type === 'cash' ? <Banknote size={11} /> : <CreditCard size={11} />}
                      {sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1)}
                    </span>
                  </td>
                  <td className="table-cell text-right font-bold text-brand-plum">{formatCurrency(Number(sale.amount))}</td>
                  <td className="table-cell">
                    {sale.is_modified && (
                      <button onClick={() => setDetailSale(sale)} className="badge badge-yellow gap-1 cursor-pointer hover:bg-amber-100">
                        <History size={11} /> Modified
                      </button>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(!sale.is_modified || isOwner) && (
                        <button onClick={() => openEdit(sale)} className="p-1.5 rounded-lg hover:bg-brand-blush text-brand-plum/40 hover:text-brand-rose transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      {isOwner && (
                        <button onClick={() => handleDelete(sale)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-plum/40 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editSale ? 'Edit Sale' : 'Record New Sale'} subtitle={editSale && !isOwner ? 'You can only modify a sale once' : undefined}>
        <div className="space-y-4">
          {isOwner && !editSale && (
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
              <label className="label">Customer Name *</label>
              <input className="input" placeholder="e.g. Sarah Ahmed" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input className="input" placeholder="+971..." value={form.customer_contact} onChange={e => setForm(f => ({ ...f, customer_contact: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Customer Type</label>
              <select className="select" value={form.customer_type} onChange={e => setForm(f => ({ ...f, customer_type: e.target.value as 'new' | 'returning' }))}>
                <option value="new">New Customer</option>
                <option value="returning">Returning Customer</option>
              </select>
            </div>
            <div>
              <label className="label">Payment Type</label>
              <select className="select" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value as 'cash' | 'card' }))}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Service *</label>
              <input className="input" list="services-list" placeholder="Service name..." value={form.service_name} onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} />
              <datalist id="services-list">{services.map(s => <option key={s.id} value={s.name} />)}</datalist>
            </div>
            <div>
              <label className="label">Amount (AED) *</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Staff Member</label>
              <select className="select" value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}>
                <option value="">Select staff...</option>
                {staff.filter(s => !form.branch_id || s.branch_id === form.branch_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.sale_date} onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))} />
            </div>
          </div>
          {editSale && !isOwner && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">This modification will be logged. Sales can only be edited once by managers.</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editSale ? 'Update Sale' : 'Record Sale'}</button>
          </div>
        </div>
      </Modal>

      {/* Modification detail modal */}
      <Modal open={!!detailSale} onClose={() => setDetailSale(null)} title="Modification History" size="sm">
        {detailSale?.modification_log && (
          <div className="space-y-3">
            <div className="bg-brand-blush rounded-xl p-3">
              <p className="text-xs font-semibold text-brand-plum/60 mb-1">Modified by</p>
              <p className="font-semibold text-brand-plum">{detailSale.modification_log.modified_by_name}</p>
              <p className="text-xs text-brand-plum/40">{new Date(detailSale.modification_log.modified_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-plum/60 mb-2 uppercase tracking-wider">Changes</p>
              {Object.keys(detailSale.modification_log.old_values).map(key => (
                <div key={key} className="flex items-center gap-2 text-sm mb-1">
                  <span className="text-brand-plum/40 capitalize">{key.replace('_', ' ')}:</span>
                  <span className="line-through text-red-400">{String(detailSale.modification_log!.old_values[key])}</span>
                  <span className="text-brand-plum/30">→</span>
                  <span className="text-emerald-600 font-medium">{String(detailSale.modification_log!.new_values[key])}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
