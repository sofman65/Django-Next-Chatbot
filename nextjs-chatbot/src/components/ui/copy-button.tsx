"use client"

import React from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, copy] = useCopyToClipboard();

  const handleCopy = async () => {
    const success = await copy(value);
    if (success) {
      console.log('Text copied to clipboard:', value);
    } else {
      console.log('Failed to copy text.');
    }
  };

  return (
    <Button onClick={handleCopy} className={className}>
      {copied === value ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

