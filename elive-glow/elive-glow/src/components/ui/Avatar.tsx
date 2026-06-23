import { cn, getInitials, getAvatarColor } from '@/lib/utils';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export default function Avatar({ name, photoUrl, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(
      'rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-white flex-shrink-0 overflow-hidden',
      sizeMap[size],
      getAvatarColor(name),
      className
    )}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
