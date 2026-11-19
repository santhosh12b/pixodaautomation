import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Lead, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Send, Phone, User, CheckCircle2, Video } from 'lucide-react';

interface ChatThreadProps {
  leadId: string | null;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ leadId }) => {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: leadData } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn: () => (leadId ? api.getLead(leadId) : Promise.reject('No ID')),
    enabled: !!leadId,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: () => (leadId ? api.getMessages(leadId) : Promise.reject('No ID')),
    enabled: !!leadId,
    refetchInterval: 3000, // Poll active chat thread every 3 seconds
  });

  const lead = leadData?.lead;
  const messages = messagesData?.messages || [];

  const sendMutation = useMutation({
    mutationFn: (text: string) => (leadId ? api.sendReply(leadId, text) : Promise.reject('No ID')),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['lead-messages', leadId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!leadId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
          <Phone className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">Select a Conversation</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
          Choose a lead from the list on the left to inspect automated WhatsApp text and promotional video messages, or send manual replies.
        </p>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(replyText);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden">
      {/* Top Thread Bar */}
      <div className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            {lead?.name.slice(0, 2).toUpperCase() || 'WA'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{lead?.name || 'Loading...'}</h3>
              {lead && (
                <Badge variant={lead.consentStatus === 'granted' ? 'success' : 'danger'}>
                  {lead.consentStatus}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
              <span>{lead?.phone}</span>
              {lead?.sourceSheet && <span>• {lead.sourceSheet}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Unipile Sync Active
          </span>
        </div>
      </div>

      {/* Messages Scroll Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {messagesLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading chat history...</div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No messages sent yet. When the campaign runs or lead replies, messages will appear here.
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-3 shrink-0"
      >
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`Type a WhatsApp message to ${lead?.name || 'lead'}...`}
          className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
        />

        <Button
          type="submit"
          variant="primary"
          icon={<Send className="w-4 h-4" />}
          isLoading={sendMutation.isPending}
          disabled={!replyText.trim()}
        >
          Send
        </Button>
      </form>
    </div>
  );
};

