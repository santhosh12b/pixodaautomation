import React, { useState } from 'react';
import { Conversation } from '../../types';
import { Search, MessageSquare } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedLeadId,
  onSelectLead,
  isLoading,
}) => {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(
    (c) =>
      c.leadName.toLowerCase().includes(search.toLowerCase()) ||
      c.leadPhone.includes(search) ||
      (c.lastMessage && c.lastMessage.content.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-80 border-r border-slate-200/80 bg-white flex flex-col shrink-0 h-full">
      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Conversations scroll area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            No conversations found
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = c.leadId === selectedLeadId;
            const initials = c.leadName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const timeStr = c.lastMessage
              ? new Date(c.lastMessage.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <button
                key={c.leadId}
                type="button"
                onClick={() => onSelectLead(c.leadId)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                  isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                  {initials || 'WA'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{c.leadName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{timeStr}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{c.leadPhone}</p>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-600 truncate">
                      {c.lastMessage ? c.lastMessage.content : 'No messages yet'}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

