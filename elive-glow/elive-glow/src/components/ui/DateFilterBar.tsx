'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { getDateRange } from '@/lib/utils';
import type { DateFilter } from '@/types';
import { cn } from '@/lib/utils';

interface DateFilterProps {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}

const PRESETS: { label: string; preset: DateFilter['preset'] }[] = [
  { label: 'Today', preset: 'today' },
  { label: 'This Week', preset: 'week' },
  { label: 'This Month', preset: 'month' },
  { label: 'This Quarter', preset: 'quarter' },
  { label: 'This Year', preset: 'year' },
  { label: 'Custom', preset: 'custom' },
];

export default function DateFilterBar({ value, onChange }: DateFilterProps) {
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset: DateFilter['preset']) => {
    if (preset === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const range = getDateRange(preset);
    onChange({ ...range, preset });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
        {PRESETS.map(({ label, preset }) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              value.preset === preset
                ? 'gradient-header text-white shadow-sm'
                : 'text-brand-plum/60 hover:text-brand-rose hover:bg-brand-blush'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {(showCustom || value.preset === 'custom') && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input py-1.5 text-xs w-36"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value, preset: 'custom' })}
          />
          <span className="text-brand-plum/40 text-xs">to</span>
          <input
            type="date"
            className="input py-1.5 text-xs w-36"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value, preset: 'custom' })}
          />
        </div>
      )}

      <div className="text-xs text-brand-plum/40 font-medium ml-1">
        {value.preset !== 'custom' && value.preset !== undefined && (
          <span>{format(new Date(value.from), 'dd MMM')} – {format(new Date(value.to), 'dd MMM yyyy')}</span>
        )}
      </div>
    </div>
  );
}
