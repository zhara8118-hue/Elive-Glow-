import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import type { DateFilter } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, HH:mm');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDateRange(preset: DateFilter['preset']): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: format(startOfDay(now), 'yyyy-MM-dd'), to: format(endOfDay(now), 'yyyy-MM-dd') };
    case 'week':
      return { from: format(startOfWeek(now), 'yyyy-MM-dd'), to: format(endOfWeek(now), 'yyyy-MM-dd') };
    case 'month':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'quarter':
      return { from: format(startOfQuarter(now), 'yyyy-MM-dd'), to: format(endOfQuarter(now), 'yyyy-MM-dd') };
    case 'year':
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
    default:
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
  }
}

export async function logAudit(
  supabase: ReturnType<typeof import('@/lib/supabase').createSupabaseClient>,
  {
    userId,
    userName,
    actionType,
    entityType,
    entityId,
    branchId,
    details,
  }: {
    userId: string;
    userName: string;
    actionType: string;
    entityType: string;
    entityId?: string;
    branchId?: string;
    details?: Record<string, unknown>;
  }
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    user_name: userName,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    branch_id: branchId,
    details,
  });
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const AVATAR_COLORS = [
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-teal-400 to-cyan-600',
  'from-emerald-400 to-green-600',
];

export function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
