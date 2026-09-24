import { AlertCircle } from 'lucide-react';

export function Alert({ children, variant = 'default', className = '', ...props }) {
  const variants = {
    default: 'bg-background text-foreground border-border',
    destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
  };

  return (
    <div className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AlertDescription({ children, className = '' }) {
  return <div className={`text-sm [&_p]:leading-relaxed ${className}`}>{children}</div>;
}
