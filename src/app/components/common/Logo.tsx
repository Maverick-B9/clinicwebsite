import React from 'react';

export function Logo({ size = 48, className }: { size?: number, className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="Asoka Logo" 
      width={size} 
      height={size} 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
