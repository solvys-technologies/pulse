import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => {
    const baseStyles = 'px-4 py-2 rounded font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles = {
      primary: 'bg-[#FFC038] text-black hover:bg-[#FBC717] active:scale-95',
      secondary: 'bg-[#0a0a00] text-[#FFC038] border border-[#FFC038]/20 hover:border-[#FFC038]/40 active:scale-95',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95',
      ghost: 'bg-transparent text-[#FFC038] hover:bg-[#FFC038]/10 active:scale-95',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
