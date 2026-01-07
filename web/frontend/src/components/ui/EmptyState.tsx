import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-dark-700/50 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-gray-500" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">
        {title}
      </h3>

      <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      {(action || secondaryAction || children) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button onClick={action.onClick} className="btn-primary">
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn-secondary">
              {secondaryAction.label}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Predefined empty states for common scenarios
export function NoResultsEmpty({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Search}
      title="No results found"
      description="We couldn't find any items matching your search. Try adjusting your filters or search terms."
      action={onClearFilters ? {
        label: 'Clear filters',
        onClick: onClearFilters,
      } : undefined}
    />
  );
}

export function NoDataEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').PackageOpen}
      title="Nothing here yet"
      description="Get started by creating your first item."
      action={onCreate ? {
        label: 'Create now',
        onClick: onCreate,
      } : undefined}
    />
  );
}
