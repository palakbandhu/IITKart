import React from 'react';
import { ShoppingBag, MapPin } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function Logo({ size = 'md', showIcon = true }: LogoProps) {
  const sizes = {
    sm: { text: 'text-xl', icon: 'w-5 h-5' },
    md: { text: 'text-3xl', icon: 'w-8 h-8' },
    lg: { text: 'text-5xl', icon: 'w-12 h-12' }
  };

  return (
    <div className="flex items-center gap-3">
      {showIcon && (
        <div className="relative">
          <ShoppingBag className={`${sizes[size].icon} text-emerald-500`} strokeWidth={2.5} />
          <MapPin className={`${sizes[size].icon === 'w-5 h-5' ? 'w-3 h-3' : sizes[size].icon === 'w-8 h-8' ? 'w-4 h-4' : 'w-6 h-6'} text-emerald-500 absolute -top-1 -right-1`} />
        </div>
      )}
      <div className={`${sizes[size].text} font-bold`}>
        <span className="text-slate-700">IIT</span>
        <span className="text-emerald-500">Kart</span>
      </div>
    </div>
  );
}
