import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const titleMap: Record<string, string> = {
  '/': 'Platform Dashboard',
  '/campaigns': 'Campaigns & Message Automation',
  '/leads': 'Lead Management & Activity Timeline',
  '/inbox': 'WhatsApp 2-Way Inbox',
  '/media': 'Promotional Video Library',
  '/analytics': 'Performance Analytics & Funnel',
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const currentTitle = titleMap[location.pathname] || 'WhatsApp Lead Automation';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={currentTitle} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
