import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { LucideIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconClick,
      size = 'md',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const sizeClasses = {
      sm: 'text-sm py-2 px-3',
      md: 'text-base py-3 px-4',
      lg: 'text-lg py-4 px-5',
    };

    const hasError = !!error;
    const hasSuccess = !!success && !error;

    return (
      <div className="w-full">
        {label && (
          <label className="form-label" htmlFor={props.id}>
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {LeftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <LeftIcon className={`h-5 w-5 transition-colors ${
                isFocused ? 'text-primary-500' : 'text-gray-500'
              }`} />
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            disabled={disabled}
            className={`
              input-field w-full
              ${sizeClasses[size]}
              ${LeftIcon ? 'pl-12' : ''}
              ${RightIcon || hasError || hasSuccess ? 'pr-12' : ''}
              ${hasError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${hasSuccess ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${className}
              transition-all duration-200
            `}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` :
              success ? `${props.id}-success` :
              helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {/* Right Icon or Status Icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {hasError && (
              <AlertCircle className="h-5 w-5 text-red-400" aria-label="Error" />
            )}
            {hasSuccess && (
              <CheckCircle className="h-5 w-5 text-green-400" aria-label="Success" />
            )}
            {RightIcon && !hasError && !hasSuccess && (
              <button
                type="button"
                onClick={onRightIconClick}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                <RightIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Helper/Error/Success Text */}
        {(error || success || helperText) && (
          <div className="mt-2 text-sm">
            {error && (
              <p id={`${props.id}-error`} className="text-red-400 flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
            {success && !error && (
              <p id={`${props.id}-success`} className="text-green-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                {success}
              </p>
            )}
            {helperText && !error && !success && (
              <p id={`${props.id}-helper`} className="text-gray-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component with similar API
interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, success, helperText, className = '', disabled, rows = 4, ...props }, ref) => {
    const hasError = !!error;
    const hasSuccess = !!success && !error;

    return (
      <div className="w-full">
        {label && (
          <label className="form-label" htmlFor={props.id}>
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          rows={rows}
          className={`
            input-field w-full resize-none
            ${hasError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${hasSuccess ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
            transition-all duration-200
          `}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${props.id}-error` :
            success ? `${props.id}-success` :
            helperText ? `${props.id}-helper` : undefined
          }
          {...props}
        />

        {(error || success || helperText) && (
          <div className="mt-2 text-sm">
            {error && (
              <p id={`${props.id}-error`} className="text-red-400 flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
            {success && !error && (
              <p id={`${props.id}-success`} className="text-green-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                {success}
              </p>
            )}
            {helperText && !error && !success && (
              <p id={`${props.id}-helper`} className="text-gray-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
