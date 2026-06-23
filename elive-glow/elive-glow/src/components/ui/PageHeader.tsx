import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('gradient-header rounded-2xl p-6 mb-6 shadow-luxury', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium mb-1">Elive Glow</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-white/60 text-sm mt-1">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
