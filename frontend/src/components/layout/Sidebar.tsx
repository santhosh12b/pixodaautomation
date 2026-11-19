import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  MessageSquare, 
  Video, 
  BarChart3, 
  Zap,
  CheckCircle2
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'WhatsApp Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Video Library', href: '/media', icon: Video },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen text-slate-300">
      {/* Brand logo & title */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
          <MessageSquare className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            AutoWhatsApp <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Pro</span>
          </h1>
          <p className="text-[11px] text-slate-400">Lead Automation Suite</p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* System Status Pill */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Queue Worker
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Google Apps Script polling sheet every 60s. Auto 2-step text & video pipeline active.
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium pt-1 border-t border-slate-700/40">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Neon Atomic Lock Ready</span>
        </div>
      </div>
    </aside>
  );
};
