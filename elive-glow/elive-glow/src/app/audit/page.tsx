'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import DateFilterBar from '@/components/ui/DateFilterBar';
import BranchFilter from '@/components/ui/BranchFilter';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, getDateRange } from '@/lib/utils';
import type { AuditLog, DateFilter } from '@/types';
import { Shield, Search, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
  STATUS_CHANGE: 'badge-yellow',
  INVITE_USER: 'badge-purple',
  DEACTIVATE_USER: 'badge-red',
};

export default function AuditPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ ...getDateRange('week'), preset: 'week' });
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    if (profile && profile.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [profile]);

  useEffect(() => { loadLogs(); }, [dateFilter, branchFilter]);

  const loadLogs = async () => {
    setLoading(true);
    let q = supabase.from('audit_logs')
      .select('*, branch:branches(*)')
      .gte('created_at', dateFilter.from)
      .lte('created_at', dateFilter.to + 'T23:59:59')
      .order('created_at', { ascending: false })
      .limit(500);
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    const matchSearch = search
      ? (l.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
        l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
        l.action_type.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchAction = actionFilter === 'all' ? true : l.action_type === actionFilter;
    return matchSearch && matchAction;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action_type))];

  return (
    <AppLayout>
      <PageHeader title="Audit Log" subtitle="Complete history of all actions across the system">
        <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
          <Activity size={16} className="text-white/60" />
          <span className="text-white text-sm font-medium">{filtered.length} events</span>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 py-2 text-sm w-48" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select py-2 text-sm w-40" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="all">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-cream border-b border-gray-100">
              <tr>
                <th className="table-header text-left">Timestamp</th>
                <th className="table-header text-left">User</th>
                <th className="table-header text-left">Action</th>
                <th className="table-header text-left">Entity</th>
                <th className="table-header text-left">Branch</th>
                <th className="table-header text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-brand-plum/40">Loading audit logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <Shield size={40} className="mx-auto text-brand-plum/20 mb-3" />
                  <p className="text-brand-plum/40">No audit events found</p>
                </td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} className="hover:bg-brand-blush/20 transition-colors">
                  <td className="table-cell text-xs text-brand-plum/50 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="table-cell">
                    <span className="font-medium text-brand-plum text-sm">{log.user_name || 'System'}</span>
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge', ACTION_COLORS[log.action_type] || 'badge-gray')}>
                      {log.action_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-brand-plum/60 capitalize">{log.entity_type.replace('_', ' ')}</td>
                  <td className="table-cell text-xs text-brand-plum/40">{(log.branch as { name: string } | null)?.name || '—'}</td>
                  <td className="table-cell">
                    {log.details ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-brand-rose hover:text-brand-plum transition-colors font-medium">View details</summary>
                        <pre className="mt-2 p-2 bg-brand-cream rounded-lg text-brand-plum/60 text-[11px] whitespace-pre-wrap max-w-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : <span className="text-brand-plum/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
