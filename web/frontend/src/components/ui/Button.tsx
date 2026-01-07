import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      inline-flex items-center justify-center
      font-semibold rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      ${fullWidth ? 'w-full' : ''}
    `;

    const variantClasses = {
      primary: `
        bg-primary-500 text-white border border-transparent
        hover:bg-primary-600 hover:-translate-y-0.5
        focus:ring-primary-500
        active:translate-y-0
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-dark-800 text-white border border-dark-600
        hover:bg-dark-700 hover:border-dark-500
        focus:ring-dark-500
      `,
      danger: `
        bg-red-500 text-white border border-transparent
        hover:bg-red-600 hover:-translate-y-0.5
        focus:ring-red-500
        active:translate-y-0
        shadow-sm hover:shadow-md
      `,
      ghost: `
        bg-transparent text-gray-300 border border-transparent
        hover:bg-dark-800 hover:text-white
        focus:ring-dark-700
      `,
      link: `
        bg-transparent text-primary-500 border border-transparent
        hover:text-primary-400 hover:underline
        focus:ring-primary-500
        p-0
      `,
    };

    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5 gap-1.5',
      md: 'text-base px-4 py-2.5 gap-2',
      lg: 'text-lg px-6 py-3 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${variant !== 'link' ? sizeClasses[size] : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && LeftIcon && <LeftIcon className="h-5 w-5" />}
        {children}
        {!loading && RightIcon && <RightIcon className="h-5 w-5" />}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon button for actions without text
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'leftIcon' | 'rightIcon'> & { icon: LucideIcon }>(
  ({ icon: Icon, children, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    };

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          rounded-lg transition-all duration-200
          ${sizeClasses[size]}
          ${props.variant === 'ghost'
            ? 'hover:bg-dark-800 text-gray-400 hover:text-white'
            : 'bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white'
          }
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${props.className || ''}
        `}
        aria-label={children as string}
        {...props}
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
