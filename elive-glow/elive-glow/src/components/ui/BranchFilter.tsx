'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Branch } from '@/types';
import { Building2 } from 'lucide-react';

interface BranchFilterProps {
  value: string | 'all';
  onChange: (branchId: string | 'all') => void;
  showAll?: boolean;
}

export default function BranchFilter({ value, onChange, showAll = true }: BranchFilterProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const { profile } = useAuth();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('branches').select('*').order('name');
      if (data) setBranches(data);
    };
    fetch();
  }, []);

  // Managers can only see their branch
  if (profile?.role === 'manager') {
    return (
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Building2 size={16} className="text-brand-rose" />
        <span className="text-sm font-medium text-brand-plum">{profile.branch?.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-rose pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select pl-9 pr-8 py-2 text-sm min-w-48"
      >
        {showAll && <option value="all">All Branches</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}
