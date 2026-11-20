import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ConversationList } from '../components/inbox/ConversationList';
import { ChatThread } from '../components/inbox/ChatThread';
import { Card } from '../components/ui/Card';

export const InboxPage: React.FC = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.getConversations,
    refetchInterval: 5000,
  });

  const rawConversations = data?.conversations || [];

  // Deduplicate conversations by normalized phone number (guaranteeing 1 entry per contact)
  const conversations = React.useMemo(() => {
    const seen = new Set<string>();
    const unique: typeof rawConversations = [];
    for (const c of rawConversations) {
      const cleanDigits = c.leadPhone.replace(/\D/g, '');
      const key = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }
    return unique;
  }, [rawConversations]);

  // Default select first conversation if none selected
  useEffect(() => {
    if (!selectedLeadId && conversations.length > 0) {
      setSelectedLeadId(conversations[0].leadId);
    }
  }, [conversations, selectedLeadId]);

  return (
    <div className="h-[calc(100vh-7rem)] flex rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      <ConversationList
        conversations={conversations}
        selectedLeadId={selectedLeadId}
        onSelectLead={setSelectedLeadId}
        isLoading={isLoading}
      />
      <ChatThread leadId={selectedLeadId} />
    </div>
  );
};

export default InboxPage;
