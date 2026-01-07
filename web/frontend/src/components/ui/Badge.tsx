import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  dot = false,
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-dark-700 text-gray-300 border-dark-600',
    primary: 'bg-primary-500/15 text-primary-400 border-primary-500/30',
    success: 'bg-green-500/15 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/15 text-red-400 border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const dotColors = {
    default: 'fill-gray-400',
    primary: 'fill-primary-400',
    success: 'fill-green-400',
    warning: 'fill-yellow-400',
    danger: 'fill-red-400',
    info: 'fill-blue-400',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold
        rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <svg className={`w-1.5 h-1.5 ${dotColors[variant]}`} viewBox="0 0 6 6">
          <circle cx="3" cy="3" r="3" />
        </svg>
      )}
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

// Status badge helper - maps job statuses to appropriate badge variants
export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string; dot?: boolean }> = {
    pending: { variant: 'warning', label: 'Pending', dot: true },
    assigned: { variant: 'info', label: 'Assigned', dot: true },
    in_transit: { variant: 'primary', label: 'In Transit', dot: true },
    delivered: { variant: 'success', label: 'Delivered', dot: false },
    cancelled: { variant: 'danger', label: 'Cancelled', dot: false },
    active: { variant: 'success', label: 'Active', dot: true },
    inactive: { variant: 'default', label: 'Inactive', dot: false },
    verified: { variant: 'success', label: 'Verified', dot: false },
    unverified: { variant: 'warning', label: 'Unverified', dot: true },
  };

  const config = statusConfig[status.toLowerCase()] || {
    variant: 'default' as const,
    label: status,
  };

  return (
    <Badge variant={config.variant} dot={config.dot} size="sm">
      {config.label}
    </Badge>
  );
}
