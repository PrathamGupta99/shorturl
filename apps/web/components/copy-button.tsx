'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { useCopy } from '@/hooks/use-copy';
import { cn } from '@/lib/utils';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  value: string;
  label?: string;
}

export function CopyButton({ value, label, className, ...props }: CopyButtonProps) {
  const { copied, copy } = useCopy();

  return (
    <Button
      type="button"
      onClick={() => void copy(value)}
      aria-label={copied ? 'Copied' : `Copy ${label ?? 'to clipboard'}`}
      className={cn(className)}
      {...props}
    >
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
      {label !== undefined && <span>{copied ? 'Copied' : label}</span>}
    </Button>
  );
}
