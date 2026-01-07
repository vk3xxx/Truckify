interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={`
        bg-dark-700/50
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

// Skeleton components for common patterns
export function SkeletonCard() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton width={80} height={24} />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={20} />
        <Skeleton width="80%" height={20} />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton width="48%" height={36} />
        <Skeleton width="48%" height={36} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 card">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height={16} />
            <Skeleton width="60%" height={14} />
          </div>
          <Skeleton width={100} height={32} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="circular" width={44} height={44} />
          </div>
          <Skeleton width="60%" height={32} className="mb-2" />
          <Skeleton width="40%" height={16} />
        </div>
      ))}
    </div>
  );
}

// Add wave animation to index.css
export const skeletonStyles = `
@keyframes wave {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-wave {
  background: linear-gradient(
    90deg,
    rgba(38, 38, 38, 0.5) 0%,
    rgba(64, 64, 64, 0.5) 50%,
    rgba(38, 38, 38, 0.5) 100%
  );
  background-size: 200% 100%;
  animation: wave 1.5s ease-in-out infinite;
}
`;
