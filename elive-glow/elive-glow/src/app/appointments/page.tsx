'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import BranchFilter from '@/components/ui/BranchFilter';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, logAudit } from '@/lib/utils';
import type { Appointment, StaffMember, Branch, Service } from '@/types';
import toast from 'react-hot-toast';
import { Plus, Calendar, Clock, User, Phone, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';

type TabStatus = 'upcoming' | 'confirmed' | 'completed' | 'cancelled' | 'past';

const STATUS_TABS: { key: TabStatus; label: string; color: string }[] = [
  { key: 'upcoming', label: 'Upcoming', color: 'badge-blue' },
  { key: 'confirmed', label: 'Confirmed', color: 'badge-green' },
  { key: 'completed', label: 'Completed', color: 'badge-purple' },
  { key: 'cancelled', label: 'Cancelled', color: 'badge-red' },
  { key: 'past', label: 'Past', color: 'badge-gray' },
];

const emptyForm = {
  customer_name: '', customer_contact: '', service: '', staff_id: '',
  appointment_date: format(new Date(), 'yyyy-MM-dd'),
  appointment_time: '10:00', notes: '', branch_id: '',
};

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabStatus>('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarWeek, setCalendarWeek] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<Appointment | null>(null);

  useEffect(() => {
    if (profile?.role === 'manager' && profile.branch_id) {
      setBranchFilter(profile.branch_id);
      setForm(f => ({ ...f, branch_id: profile.branch_id! }));
    }
    loadMeta();
  }, [profile]);

  useEffect(() => { loadAppointments(); }, [branchFilter, activeTab]);

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

  const loadAppointments = async () => {
    setLoading(true);
    let q = supabase.from('appointments')
      .select('*, branch:branches(*), staff:staff_members(*)')
      .eq('status', activeTab)
      .order('appointment_date').order('appointment_time');
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    setAppointments(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditAppt(null);
    setForm({ ...emptyForm, branch_id: profile?.branch_id || '' });
    setModalOpen(true);
  };

  const openEdit = (appt: Appointment) => {
    setEditAppt(appt);
    setForm({
      customer_name: appt.customer_name, customer_contact: appt.customer_contact || '',
      service: appt.service, staff_id: appt.staff_id || '',
      appointment_date: appt.appointment_date, appointment_time: appt.appointment_time,
      notes: appt.notes || '', branch_id: appt.branch_id,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.service || !form.branch_id || !form.appointment_date || !form.appointment_time) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name, customer_contact: form.customer_contact || null,
        service: form.service, staff_id: form.staff_id || null,
        appointment_date: form.appointment_date, appointment_time: form.appointment_time,
        notes: form.notes || null, branch_id: form.branch_id,
      };
      if (editAppt) {
        const { error } = await supabase.from('appointments').update(payload).eq('id', editAppt.id);
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'UPDATE', entityType: 'appointment', entityId: editAppt.id, branchId: form.branch_id });
        toast.success('Appointment updated');
      } else {
        const { data, error } = await supabase.from('appointments').insert({ ...payload, status: 'upcoming', created_by: profile!.id }).select().single();
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'CREATE', entityType: 'appointment', entityId: data?.id, branchId: form.branch_id });
        toast.success('Appointment booked');
      }
      setModalOpen(false);
      loadAppointments();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const updateStatus = async (appt: Appointment, newStatus: TabStatus) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', appt.id);
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'STATUS_CHANGE', entityType: 'appointment', entityId: appt.id, branchId: appt.branch_id, details: { from: appt.status, to: newStatus } });
    toast.success(`Appointment marked as ${newStatus}`);
    loadAppointments();
  };

  const handleDrop = async (appt: Appointment, newDate: Date) => {
    const dateStr = format(newDate, 'yyyy-MM-dd');
    await supabase.from('appointments').update({ appointment_date: dateStr }).eq('id', appt.id);
    toast.success(`Appointment moved to ${format(newDate, 'dd MMM')}`);
    setDragItem(null);
    loadAppointments();
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(calendarWeek), i));
  const weekAppointments = async () => {
    let q = supabase.from('appointments')
      .select('*, branch:branches(*), staff:staff_members(*)')
      .in('status', ['upcoming', 'confirmed'])
      .gte('appointment_date', format(weekDays[0], 'yyyy-MM-dd'))
      .lte('appointment_date', format(weekDays[6], 'yyyy-MM-dd'));
    if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
    const { data } = await q;
    return data || [];
  };

  const [calendarAppts, setCalendarAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      weekAppointments().then(setCalendarAppts);
    }
  }, [viewMode, calendarWeek, branchFilter]);

  const counts: Record<TabStatus, number> = { upcoming: 0, confirmed: 0, completed: 0, cancelled: 0, past: 0 };

  return (
    <AppLayout>
      <PageHeader title="Appointments" subtitle="Book, manage, and track salon appointments">
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className="btn-secondary text-white border-white/30 hover:bg-white/20 hover:text-white flex items-center gap-2">
            <Calendar size={16} /> {viewMode === 'list' ? 'Calendar' : 'List'} View
          </button>
          <button onClick={openAdd} className="bg-white text-brand-plum hover:bg-brand-champagne px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all">
            <Plus size={16} /> Book Appointment
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarWeek(subWeeks(calendarWeek, 1))} className="p-2 rounded-xl hover:bg-brand-blush text-brand-plum/60 hover:text-brand-rose transition-colors">
              <ChevronLeft size={20} />
            </button>
            <p className="font-display font-bold text-brand-plum">
              {format(weekDays[0], 'dd MMM')} – {format(weekDays[6], 'dd MMM yyyy')}
            </p>
            <button onClick={() => setCalendarWeek(addWeeks(calendarWeek, 1))} className="p-2 rounded-xl hover:bg-brand-blush text-brand-plum/60 hover:text-brand-rose transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className={cn('min-h-32 rounded-xl border p-2 transition-colors', isSameDay(day, new Date()) ? 'border-brand-rose bg-brand-blush/50' : 'border-gray-100 bg-brand-cream/50')}
                onDragOver={e => e.preventDefault()}
                onDrop={() => dragItem && handleDrop(dragItem, day)}
              >
                <p className={cn('text-xs font-bold uppercase tracking-wider mb-1', isSameDay(day, new Date()) ? 'text-brand-rose' : 'text-brand-plum/40')}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn('font-bold text-sm mb-2', isSameDay(day, new Date()) ? 'text-brand-rose' : 'text-brand-plum')}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-1">
                  {calendarAppts
                    .filter(a => a.appointment_date === format(day, 'yyyy-MM-dd'))
                    .map(appt => (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={() => setDragItem(appt)}
                        onDragEnd={() => setDragItem(null)}
                        className="bg-gradient-to-r from-brand-plum to-brand-lavender text-white text-xs rounded-lg p-1.5 cursor-grab active:cursor-grabbing hover:shadow-luxury transition-all"
                        onClick={() => openEdit(appt)}
                      >
                        <p className="font-semibold truncate">{appt.customer_name}</p>
                        <p className="text-white/60 text-[10px]">{appt.appointment_time} · {appt.service}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-plum/30 mt-3 text-center">Drag appointments to reschedule</p>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeTab === tab.key
                ? 'gradient-header text-white shadow-luxury'
                : 'bg-white text-brand-plum/60 border border-gray-200 hover:border-brand-rose hover:text-brand-rose'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="card text-center py-12 text-brand-plum/40">Loading...</div>
        ) : appointments.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar size={40} className="mx-auto text-brand-plum/20 mb-3" />
            <p className="font-display font-bold text-brand-plum/40">No {activeTab} appointments</p>
          </div>
        ) : appointments.map(appt => (
          <div key={appt.id} className="card hover:shadow-luxury-hover transition-all group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl gradient-header flex flex-col items-center justify-center flex-shrink-0">
                  <p className="text-white font-bold text-lg leading-none">{format(parseISO(appt.appointment_date), 'd')}</p>
                  <p className="text-white/60 text-xs uppercase">{format(parseISO(appt.appointment_date), 'MMM')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-display font-bold text-brand-plum">{appt.customer_name}</p>
                    <span className={cn('badge', STATUS_TABS.find(t => t.key === appt.status)?.color || 'badge-gray')}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-plum/60">
                    <span className="flex items-center gap-1"><Clock size={13} /> {appt.appointment_time}</span>
                    <span className="flex items-center gap-1"><Calendar size={13} /> {appt.service}</span>
                    {appt.staff && <span className="flex items-center gap-1"><User size={13} /> {(appt.staff as StaffMember).name}</span>}
                    {appt.customer_contact && <span className="flex items-center gap-1"><Phone size={13} /> {appt.customer_contact}</span>}
                  </div>
                  <p className="text-xs text-brand-plum/40 mt-1">{(appt.branch as Branch | null)?.name}</p>
                  {appt.notes && <p className="text-xs text-brand-plum/50 mt-1 italic">"{appt.notes}"</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                {(activeTab === 'upcoming' || activeTab === 'confirmed') && (
                  <>
                    {activeTab === 'upcoming' && (
                      <button onClick={() => updateStatus(appt, 'confirmed')} className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1">
                        <Check size={13} /> Confirm
                      </button>
                    )}
                    <button onClick={() => updateStatus(appt, 'completed')} className="px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-1">
                      <Check size={13} /> Complete
                    </button>
                    <button onClick={() => updateStatus(appt, 'cancelled')} className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1">
                      <X size={13} /> Cancel
                    </button>
                    <button onClick={() => openEdit(appt)} className="p-1.5 rounded-xl hover:bg-brand-blush text-brand-plum/30 hover:text-brand-rose transition-colors">
                      <Pencil size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Book/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editAppt ? 'Edit Appointment' : 'Book Appointment'}>
        <div className="space-y-4">
          {profile?.role === 'owner' && !editAppt && (
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
              <input className="input" placeholder="e.g. Fatima Al-Rashidi" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input className="input" placeholder="+971..." value={form.customer_contact} onChange={e => setForm(f => ({ ...f, customer_contact: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Service *</label>
            <input className="input" list="appt-services" placeholder="Select or type service..." value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
            <datalist id="appt-services">{services.map(s => <option key={s.id} value={s.name} />)}</datalist>
          </div>
          <div>
            <label className="label">Staff Member</label>
            <select className="select" value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}>
              <option value="">Any Available</option>
              {staff.filter(s => !form.branch_id || s.branch_id === form.branch_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.appointment_date} min={format(new Date(), 'yyyy-MM-dd')} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Time *</label>
              <input type="time" className="input" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Any special requests..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editAppt ? 'Update' : 'Book Appointment'}</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
