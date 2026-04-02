import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  accentColor?: string;
  header?: React.ReactNode;
}

export function Sidebar({ items, activeId, onSelect, accentColor = '#1E3A8A', header }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-[#0F1E3A] border-r border-blue-100 dark:border-blue-900/30 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-56'
        }`}
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {/* Header slot */}
        {!collapsed && header && (
          <div className="px-4 pt-5 pb-3 border-b border-blue-50 dark:border-blue-900/20">
            {header}
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto pt-4">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group relative ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                style={isActive ? { background: accentColor } : {}}
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isActive ? 'bg-white/25 text-white' : `${item.badgeColor || 'bg-[#F97316] text-white'}`
                  }`}>
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge !== undefined && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F97316]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-blue-50 dark:border-blue-900/20">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-[#1E3A8A] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-xs font-semibold"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
              <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0F1E3A] border-t border-blue-100 dark:border-blue-900/30 shadow-lg">
        <nav className="flex items-center justify-around px-2 py-1.5">
          {items.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl relative transition-all ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
                style={isActive ? { background: accentColor } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold">{item.label.split(' ')[0]}</span>
                {item.badge !== undefined && !isActive && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#F97316]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
