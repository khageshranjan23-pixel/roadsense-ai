import React, { useEffect } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, Loader2 } from 'lucide-react';

// ========================================================
// BUTTON COMPONENT
// ========================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-darkBg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
            {
              // Variants
              'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20': variant === 'primary',
              'bg-secondary hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20': variant === 'secondary',
              'bg-danger hover:bg-red-600 text-white shadow-lg shadow-red-500/20': variant === 'danger',
              'bg-success hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20': variant === 'success',
              'border border-gray-700 bg-transparent hover:bg-gray-800 text-gray-200': variant === 'outline',
              'bg-transparent hover:bg-gray-800 text-gray-400 hover:text-gray-100': variant === 'ghost',
              // Sizes
              'px-3 py-1.5 text-xs': size === 'sm',
              'px-4 py-2 text-sm': size === 'md',
              'px-6 py-3 text-base': size === 'lg',
            },
            className
          )
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ========================================================
// CARD COMPONENT
// ========================================================
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hoverEffect = false, children, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'glass-panel rounded-xl p-5 border border-gray-800 transition-all duration-300 bg-[#0D1B2E]/85',
          {
            'hover:border-primary/50 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-primary/5': hoverEffect,
          }
        ),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// ========================================================
// BADGE COMPONENT
// ========================================================
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'gray';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'info', children, ...props }) => {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          {
            'bg-success/10 border-success/30 text-emerald-400': variant === 'success',
            'bg-danger/10 border-danger/30 text-red-400': variant === 'danger',
            'bg-accent/10 border-accent/30 text-amber-400': variant === 'warning',
            'bg-primary/10 border-primary/30 text-blue-400': variant === 'info',
            'bg-secondary/10 border-secondary/30 text-violet-400': variant === 'purple',
            'bg-gray-800 border-gray-700 text-gray-400': variant === 'gray',
          }
        ),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// ========================================================
// SKELETON COMPONENT
// ========================================================
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect', ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-gray-800 animate-pulse',
          {
            'rounded h-4 w-full': variant === 'text',
            'rounded-lg': variant === 'rect',
            'rounded-full': variant === 'circle',
          }
        ),
        className
      )}
      {...props}
    />
  );
};

// ========================================================
// MODAL COMPONENT
// ========================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-gray-800 bg-[#0D1B2E] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          {title && <h3 className="text-lg font-bold text-gray-100">{title}</h3>}
          <button 
            onClick={onClose} 
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 text-gray-300 text-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

// ========================================================
// TIMER COMPONENT
// ========================================================
interface TimerProps {
  timeLeft: number; // 0 to 10 seconds
  maxTime?: number; // defaults to 10
}

export const Timer: React.FC<TimerProps> = ({ timeLeft, maxTime = 10 }) => {
  const percentage = (timeLeft / maxTime) * 100;
  
  // Calculate SVG circle properties
  const radius = 18;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color code based on time left
  let strokeColor = '#10B981'; // Green
  if (timeLeft <= 3) {
    strokeColor = '#EF4444'; // Red
  } else if (timeLeft <= 5) {
    strokeColor = '#F59E0B'; // Amber
  }

  return (
    <div className="relative inline-flex items-center justify-center font-mono">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          stroke="#1E293B"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Foreground Circle representing remaining time */}
        <circle
          stroke={strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span 
        className="absolute text-xs font-bold"
        style={{ color: strokeColor, transition: 'color 0.3s ease' }}
      >
        {timeLeft}s
      </span>
    </div>
  );
};
