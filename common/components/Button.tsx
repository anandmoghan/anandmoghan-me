import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'accent' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'btn btn--primary',
      accent: 'btn btn--outline text-accent',
      destructive: 'btn btn--outline text-destructive',
      outline: 'btn btn--outline',
      ghost: 'btn btn--ghost',
    };

    const sizes = {
      sm: 'btn--sm',
      md: '',
      lg: 'text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
