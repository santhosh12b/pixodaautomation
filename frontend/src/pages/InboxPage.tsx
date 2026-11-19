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

  const conversations = data?.conversations || [];

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
