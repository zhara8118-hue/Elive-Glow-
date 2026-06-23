'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import BranchFilter from '@/components/ui/BranchFilter';
import Avatar from '@/components/ui/Avatar';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, downloadCSV, logAudit } from '@/lib/utils';
import type { Customer, Branch } from '@/types';
import toast from 'react-hot-toast';
import { Search, Download, Trash2, Users, UserPlus, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CustomersPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const isOwner = profile?.role === 'owner';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    if (profile?.role === 'manager' && profile.branch_id) setBranchFilter(profile.branch_id);
  }, [profile]);

  useEffect(() => { loadCustomers(); }, [branchFilter]);

  const loadCustomers = async () => {
    setLoading(true);
    let q = supabase.from('customers').select('*, branch:branches(*)').order('last_visit', { ascending: false });
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    setCustomers(data || []);
    setLoading(false);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer record for ${customer.name}?`)) return;
    await supabase.from('customers').delete().eq('id', customer.id);
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'DELETE', entityType: 'customer', entityId: customer.id, branchId: customer.branch_id, details: { name: customer.name } });
    toast.success('Customer deleted');
    loadCustomers();
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_number || '').includes(search)
  );

  const exportCSV = () => {
    downloadCSV(filtered.map(c => ({
      Name: c.name, Contact: c.contact_number || '', Branch: (c.branch as Branch | null)?.name || '',
      'First Visit': c.first_visit ? formatDate(c.first_visit) : '',
      'Last Visit': c.last_visit ? formatDate(c.last_visit) : '',
      'Total Visits': c.visit_count,
    })), 'elive-glow-customers');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Elive Glow – Customer List', 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Name', 'Contact', 'Branch', 'First Visit', 'Last Visit', 'Visits']],
      body: filtered.map(c => [c.name, c.contact_number || '', (c.branch as Branch | null)?.name || '', c.first_visit ? formatDate(c.first_visit) : '', c.last_visit ? formatDate(c.last_visit) : '', c.visit_count]),
    });
    doc.save('elive-glow-customers.pdf');
  };

  return (
    <AppLayout>
      <PageHeader title="Customers" subtitle="Customer database from sales records">
        <button onClick={exportCSV} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2"><Download size={16} /> CSV</button>
        <button onClick={exportPDF} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2"><Download size={16} /> PDF</button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center"><p className="section-title flex items-center justify-center gap-1"><Users size={13} /> Total</p><p className="font-display text-2xl font-bold text-brand-plum mt-1">{filtered.length}</p></div>
        <div className="card text-center"><p className="section-title flex items-center justify-center gap-1"><UserPlus size={13} /> New (All Time)</p><p className="font-display text-2xl font-bold text-brand-plum mt-1">{filtered.filter(c => c.visit_count === 1).length}</p></div>
        <div className="card text-center"><p className="section-title flex items-center justify-center gap-1"><RefreshCw size={13} /> Returning</p><p className="font-display text-2xl font-bold text-brand-plum mt-1">{filtered.filter(c => c.visit_count > 1).length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 py-2 text-sm w-56" placeholder="Search name or number..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Customer list */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-cream border-b border-gray-100">
              <tr>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left">Contact</th>
                <th className="table-header text-left">Branch</th>
                <th className="table-header text-left">First Visit</th>
                <th className="table-header text-left">Last Visit</th>
                <th className="table-header text-right">Visits</th>
                {isOwner && <th className="table-header text-left">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-brand-plum/40">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-brand-plum/40">No customers found</td></tr>
              ) : filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-brand-blush/30 transition-colors group">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={customer.name} size="sm" />
                      <span className="font-semibold text-brand-plum">{customer.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-brand-plum/60">{customer.contact_number || '—'}</td>
                  <td className="table-cell text-xs text-brand-plum/50">{(customer.branch as Branch | null)?.name}</td>
                  <td className="table-cell text-sm text-brand-plum/50">{customer.first_visit ? formatDate(customer.first_visit) : '—'}</td>
                  <td className="table-cell text-sm text-brand-plum/50">{customer.last_visit ? formatDate(customer.last_visit) : '—'}</td>
                  <td className="table-cell text-right">
                    <span className={`badge ${customer.visit_count > 1 ? 'badge-purple' : 'badge-green'}`}>{customer.visit_count}</span>
                  </td>
                  {isOwner && (
                    <td className="table-cell">
                      <button onClick={() => handleDelete(customer)} className="p-1.5 rounded-lg hover:bg-red-50 text-brand-plum/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
