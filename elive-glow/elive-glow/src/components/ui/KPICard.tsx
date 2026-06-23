import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'rose' | 'gold' | 'green' | 'blue' | 'purple';
  className?: string;
}

const colorMap = {
  rose: { bg: 'bg-rose-50', icon: 'text-brand-rose', border: 'border-rose-100' },
  gold: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-brand-lavender', border: 'border-purple-100' },
};

export default function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'rose', className }: KPICardProps) {
  const colors = colorMap[color];
  return (
    <div className={cn('kpi-card group', className)}>
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 gradient-header rounded-t-2xl" />

      <div className="flex items-start justify-between pt-1">
        <div className="flex-1">
          <p className="section-title">{title}</p>
          <p className="font-display text-2xl md:text-3xl font-bold text-brand-plum mt-1.5 leading-tight">
            {value}
          </p>
          {subtitle && <p className="text-xs text-brand-plum/40 mt-1">{subtitle}</p>}

          {trend && (
            <div className={cn('inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold',
              trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
            )}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>

        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 border', colors.bg, colors.border)}>
          <Icon size={22} className={colors.icon} />
        </div>
      </div>
    </div>
  );
}
