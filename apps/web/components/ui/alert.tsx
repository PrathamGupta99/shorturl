import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-destructive/8 border-destructive/25 [&>svg]:text-destructive',
        warning: 'text-warning bg-warning/10 border-warning/30 [&>svg]:text-warning',
        info: 'text-foreground bg-accent/60 border-accent [&>svg]:text-primary'
      }
    },
    defaultVariants: { variant: 'default' }
  }
);

export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('col-start-2 min-h-4 font-medium tracking-tight', className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('col-start-2 grid justify-items-start gap-1 text-sm opacity-90', className)}
      {...props}
    />
  );
}
