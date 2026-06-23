'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/utils';
import type { Profile, StaffMember, Branch, Service } from '@/types';
import toast from 'react-hot-toast';
import { Crown, Shield, Plus, Pencil, Trash2, Upload, Users, UserCheck, Building2, Scissors, Mail, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'users' | 'staff' | 'branches' | 'services';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createSupabaseClient();
  const isOwner = profile?.role === 'owner';
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');

  // Data
  const [users, setUsers] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editService, setEditService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'manager' as 'owner' | 'manager', branch_id: '' });
  const [staffForm, setStaffForm] = useState({ name: '', branch_id: '', role: 'stylist', photo_url: '' });
  const [branchForm, setBranchForm] = useState({ name: '', location: '' });
  const [serviceForm, setServiceForm] = useState({ name: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: u }, { data: st }, { data: br }, { data: sv }] = await Promise.all([
      supabase.from('profiles').select('*, branch:branches(*)').order('full_name'),
      supabase.from('staff_members').select('*, branch:branches(*)').order('name'),
      supabase.from('branches').select('*').order('name'),
      supabase.from('services').select('*').order('name'),
    ]);
    setUsers(u || []);
    setStaff(st || []);
    setBranches(br || []);
    setServices(sv || []);
  };

  // ── USERS ──
  const inviteUser = async () => {
    if (!userForm.full_name || !userForm.email || !userForm.branch_id) { toast.error('Fill all fields'); return; }
    setSaving(true);
    try {
      // Use admin API via server route to invite user
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'INVITE_USER', entityType: 'profile', details: { email: userForm.email, role: userForm.role } });
      toast.success('Invitation sent!');
      setUserModalOpen(false);
      setUserForm({ full_name: '', email: '', role: 'manager', branch_id: '' });
      loadAll();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const updateUser = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: userForm.full_name, role: userForm.role, branch_id: userForm.branch_id || null }).eq('id', editUser.id);
    if (error) { toast.error(error.message); } else { toast.success('User updated'); setUserModalOpen(false); loadAll(); }
    setSaving(false);
  };

  const deleteUser = async (user: Profile) => {
    if (!confirm(`Remove access for ${user.full_name}?`)) return;
    await supabase.from('profiles').update({ status: 'inactive' }).eq('id', user.id);
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'DEACTIVATE_USER', entityType: 'profile', entityId: user.id });
    toast.success('User deactivated');
    loadAll();
  };

  // ── STAFF ──
  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `staff/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const saveStaff = async () => {
    if (!staffForm.name || !staffForm.branch_id) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (editStaff) {
        const { error } = await supabase.from('staff_members').update({ name: staffForm.name, branch_id: staffForm.branch_id, role: staffForm.role, photo_url: staffForm.photo_url || null }).eq('id', editStaff.id);
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'UPDATE', entityType: 'staff_member', entityId: editStaff.id });
        toast.success('Staff updated');
      } else {
        const { data, error } = await supabase.from('staff_members').insert({ name: staffForm.name, branch_id: staffForm.branch_id, role: staffForm.role, photo_url: staffForm.photo_url || null }).select().single();
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'CREATE', entityType: 'staff_member', entityId: data?.id, details: { name: staffForm.name } });
        toast.success('Staff member added');
      }
      setStaffModalOpen(false);
      setStaffForm({ name: '', branch_id: '', role: 'stylist', photo_url: '' });
      loadAll();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const deleteStaff = async (s: StaffMember) => {
    if (!confirm(`Remove ${s.name}?`)) return;
    await supabase.from('staff_members').update({ is_active: false }).eq('id', s.id);
    await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'DELETE', entityType: 'staff_member', entityId: s.id });
    toast.success('Staff removed');
    loadAll();
  };

  // ── BRANCHES ──
  const saveBranch = async () => {
    if (!branchForm.name || !branchForm.location) { toast.error('Fill all fields'); return; }
    setSaving(true);
    try {
      if (editBranch) {
        await supabase.from('branches').update({ name: branchForm.name, location: branchForm.location }).eq('id', editBranch.id);
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'UPDATE', entityType: 'branch', entityId: editBranch.id, details: { name: branchForm.name } });
        toast.success('Branch updated');
      } else {
        const { data, error } = await supabase.from('branches').insert({ name: branchForm.name, location: branchForm.location }).select().single();
        if (error) throw error;
        await logAudit(supabase, { userId: profile!.id, userName: profile!.full_name, actionType: 'CREATE', entityType: 'branch', entityId: data?.id, details: { name: branchForm.name } });
        toast.success('Branch added');
      }
      setBranchModalOpen(false);
      setBranchForm({ name: '', location: '' });
      loadAll();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setSaving(false);
  };

  // ── SERVICES ──
  const saveService = async () => {
    if (!serviceForm.name) return;
    setSaving(true);
    try {
      if (editService) {
        await supabase.from('services').update({ name: serviceForm.name }).eq('id', editService.id);
        toast.success('Service updated');
      } else {
        await supabase.from('services').insert({ name: serviceForm.name });
        toast.success('Service added');
      }
      setServiceModalOpen(false);
      setServiceForm({ name: '' });
      loadAll();
    } catch (e: unknown) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const deleteService = async (s: Service) => {
    await supabase.from('services').update({ is_active: false }).eq('id', s.id);
    toast.success('Service removed');
    loadAll();
  };

  const TABS: { key: SettingsTab; label: string; icon: React.ElementType; ownerOnly?: boolean }[] = [
    { key: 'users', label: 'Users', icon: Users, ownerOnly: true },
    { key: 'staff', label: 'Staff', icon: UserCheck },
    { key: 'branches', label: 'Branches', icon: Building2, ownerOnly: true },
    { key: 'services', label: 'Services', icon: Scissors },
  ];

  const visibleTabs = TABS.filter(t => !t.ownerOnly || isOwner);

  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="Manage users, staff, branches, and services" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === key ? 'gradient-header text-white shadow-luxury' : 'bg-white text-brand-plum/60 border border-gray-200 hover:border-brand-rose hover:text-brand-rose'
            )}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && isOwner && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div><p className="section-title">Team Members</p><p className="font-display font-bold text-brand-plum mt-0.5">Manage Access</p></div>
            <button onClick={() => { setEditUser(null); setUserForm({ full_name: '', email: '', role: 'manager', branch_id: '' }); setUserModalOpen(true); }} className="btn-primary flex items-center gap-2">
              <Mail size={16} /> Invite User
            </button>
          </div>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="card flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <Avatar name={u.full_name} photoUrl={u.photo_url} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-brand-plum">{u.full_name}</p>
                      {u.role === 'owner' ? <span className="badge badge-yellow"><Crown size={11} /> Owner</span> : <span className="badge badge-blue"><Shield size={11} /> Manager</span>}
                      {u.status === 'invited' && <span className="badge badge-gray">Invited</span>}
                    </div>
                    <p className="text-sm text-brand-plum/50">{u.email}</p>
                    {(u.branch as Branch | null)?.name && <p className="text-xs text-brand-plum/30">{(u.branch as Branch | null)?.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditUser(u); setUserForm({ full_name: u.full_name, email: u.email, role: u.role, branch_id: u.branch_id || '' }); setUserModalOpen(true); }} className="p-2 rounded-xl hover:bg-brand-blush text-brand-plum/40 hover:text-brand-rose">
                    <Pencil size={15} />
                  </button>
                  {u.id !== profile?.id && <button onClick={() => deleteUser(u)} className="p-2 rounded-xl hover:bg-red-50 text-brand-plum/40 hover:text-red-500"><Trash2 size={15} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAFF TAB ── */}
      {activeTab === 'staff' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div><p className="section-title">Staff Members</p><p className="font-display font-bold text-brand-plum mt-0.5">Manage Your Team</p></div>
            <button onClick={() => { setEditStaff(null); setStaffForm({ name: '', branch_id: profile?.branch_id || '', role: 'stylist', photo_url: '' }); setStaffModalOpen(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Staff
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staff.filter(s => s.is_active).filter(s => !profile?.branch_id || isOwner || s.branch_id === profile.branch_id).map(s => (
              <div key={s.id} className="card flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} photoUrl={s.photo_url} size="md" />
                  <div>
                    <p className="font-semibold text-brand-plum">{s.name}</p>
                    <p className="text-xs text-brand-plum/40 capitalize">{s.role}</p>
                    <p className="text-xs text-brand-plum/30">{(s.branch as Branch | null)?.name}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditStaff(s); setStaffForm({ name: s.name, branch_id: s.branch_id, role: s.role, photo_url: s.photo_url || '' }); setStaffModalOpen(true); }} className="p-2 rounded-xl hover:bg-brand-blush text-brand-plum/40 hover:text-brand-rose"><Pencil size={15} /></button>
                  {isOwner && <button onClick={() => deleteStaff(s)} className="p-2 rounded-xl hover:bg-red-50 text-brand-plum/40 hover:text-red-500"><Trash2 size={15} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BRANCHES TAB ── */}
      {activeTab === 'branches' && isOwner && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div><p className="section-title">Branch Locations</p><p className="font-display font-bold text-brand-plum mt-0.5">Manage Branches</p></div>
            <button onClick={() => { setEditBranch(null); setBranchForm({ name: '', location: '' }); setBranchModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Branch</button>
          </div>
          <div className="space-y-3">
            {branches.map(b => (
              <div key={b.id} className="card flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-header flex items-center justify-center"><Building2 size={22} className="text-white" /></div>
                  <div>
                    <p className="font-semibold text-brand-plum">{b.name}</p>
                    <p className="text-sm text-brand-plum/50">{b.location}</p>
                  </div>
                </div>
                <button onClick={() => { setEditBranch(b); setBranchForm({ name: b.name, location: b.location }); setBranchModalOpen(true); }} className="p-2 rounded-xl hover:bg-brand-blush text-brand-plum/40 hover:text-brand-rose opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SERVICES TAB ── */}
      {activeTab === 'services' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div><p className="section-title">Service Menu</p><p className="font-display font-bold text-brand-plum mt-0.5">Quick-select options for sales &amp; appointments</p></div>
            {isOwner && <button onClick={() => { setEditService(null); setServiceForm({ name: '' }); setServiceModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Service</button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {services.filter(s => s.is_active).map(s => (
              <div key={s.id} className="card flex items-center justify-between group py-3">
                <div className="flex items-center gap-2">
                  <Scissors size={16} className="text-brand-rose" />
                  <span className="font-medium text-brand-plum text-sm">{s.name}</span>
                </div>
                {isOwner && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditService(s); setServiceForm({ name: s.name }); setServiceModalOpen(true); }} className="p-1 rounded-lg hover:bg-brand-blush text-brand-plum/30 hover:text-brand-rose"><Pencil size={13} /></button>
                    <button onClick={() => deleteService(s)} className="p-1 rounded-lg hover:bg-red-50 text-brand-plum/30 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USER MODAL */}
      <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title={editUser ? 'Edit User' : 'Invite New User'} subtitle={!editUser ? 'An invitation email will be sent' : undefined}>
        <div className="space-y-4">
          <div><label className="label">Full Name *</label><input className="input" placeholder="e.g. Aisha Hassan" value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} /></div>
          {!editUser && <div><label className="label">Email Address *</label><input type="email" className="input" placeholder="manager@eliveglow.com" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} /></div>}
          <div><label className="label">Role</label>
            <select className="select" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'owner' | 'manager' }))}>
              <option value="manager">Branch Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div><label className="label">Assign Branch</label>
            <select className="select" value={userForm.branch_id} onChange={e => setUserForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">No specific branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setUserModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={editUser ? updateUser : inviteUser} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? 'Saving...' : editUser ? 'Update User' : <><Mail size={16} /> Send Invite</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* STAFF MODAL */}
      <Modal open={staffModalOpen} onClose={() => setStaffModalOpen(false)} title={editStaff ? 'Edit Staff Member' : 'Add Staff Member'}>
        <div className="space-y-4">
          {/* Photo upload */}
          <div className="flex items-center gap-4">
            <Avatar name={staffForm.name || 'ST'} photoUrl={staffForm.photo_url} size="xl" />
            <div>
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2 text-sm py-2">
                <Upload size={15} /> Upload Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                try { const url = await uploadPhoto(file); setStaffForm(f => ({ ...f, photo_url: url })); toast.success('Photo uploaded'); }
                catch { toast.error('Upload failed'); }
              }} />
              <p className="text-xs text-brand-plum/30 mt-1">JPG, PNG · Max 2MB</p>
            </div>
          </div>
          <div><label className="label">Name *</label><input className="input" placeholder="Staff name" value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div>
            <label className="label">Branch *</label>
            <select className="select" value={staffForm.branch_id} onChange={e => setStaffForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">Select branch...</option>
              {branches.filter(b => isOwner || b.id === profile?.branch_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Role/Speciality</label>
            <select className="select" value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>
              <option value="stylist">Stylist</option>
              <option value="colorist">Colorist</option>
              <option value="nail_tech">Nail Technician</option>
              <option value="esthetician">Esthetician</option>
              <option value="receptionist">Receptionist</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStaffModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={saveStaff} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editStaff ? 'Update' : 'Add Staff'}</button>
          </div>
        </div>
      </Modal>

      {/* BRANCH MODAL */}
      <Modal open={branchModalOpen} onClose={() => setBranchModalOpen(false)} title={editBranch ? 'Edit Branch' : 'Add Branch'} size="sm">
        <div className="space-y-4">
          <div><label className="label">Branch Name *</label><input className="input" placeholder="e.g. Abu Dhabi – Marina Mall" value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Location *</label><input className="input" placeholder="e.g. Marina Mall, Abu Dhabi" value={branchForm.location} onChange={e => setBranchForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setBranchModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={saveBranch} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editBranch ? 'Update' : 'Add Branch'}</button>
          </div>
        </div>
      </Modal>

      {/* SERVICE MODAL */}
      <Modal open={serviceModalOpen} onClose={() => setServiceModalOpen(false)} title={editService ? 'Edit Service' : 'Add Service'} size="sm">
        <div className="space-y-4">
          <div><label className="label">Service Name *</label><input className="input" placeholder="e.g. Balayage" value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveService()} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setServiceModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={saveService} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editService ? 'Update' : 'Add'}</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
