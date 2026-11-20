import React from 'react';
import { Lead, Message } from '../../types';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  ShieldAlert, 
  Send, 
  Video, 
  CheckCheck, 
  AlertCircle 
} from 'lucide-react';

interface LeadTimelineProps {
  lead: Lead;
  messages?: Message[];
}

export const LeadTimeline: React.FC<LeadTimelineProps> = ({ lead, messages = [] }) => {
  const textMsg = messages.find((m) => m.type === 'text' && m.direction === 'outbound');
  const videoMsg = messages.find((m) => m.type === 'video' && m.direction === 'outbound');
  const inboundReply = messages.find((m) => m.direction === 'inbound');

  const steps = [
    {
      title: 'Ingested from Google Sheet',
      desc: `Detected row in ${lead.sourceSheet || 'Google Sheet'} via Google Apps Script`,
      time: new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      icon: FileSpreadsheet,
      status: 'completed',
    },
    {
      title: 'Consent Verification',
      desc: lead.consentStatus === 'granted' ? 'Explicit consent confirmed' : 'Consent revoked or pending',
      time: new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      icon: lead.consentStatus === 'granted' ? ShieldCheck : ShieldAlert,
      status: lead.consentStatus === 'granted' ? 'completed' : 'failed',
    },
    {
      title: 'WhatsApp Step 1: Text Message',
      desc: textMsg ? `Sent via WhatsApp (${textMsg.deliveryStatus})` : lead.status === 'new' ? 'Queued in Neon persistent queue' : 'Not sent',
      time: textMsg ? new Date(textMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      icon: Send,
      status: textMsg ? 'completed' : lead.status === 'new' ? 'pending' : 'skipped',
    },
    {
      title: 'WhatsApp Step 2: Promotional Video',
      desc: videoMsg ? `Delivered promotional video via WhatsApp` : textMsg ? 'Scheduled / Processed' : 'Waiting for Step 1 completion',
      time: videoMsg ? new Date(videoMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      icon: Video,
      status: videoMsg ? 'completed' : textMsg ? 'pending' : 'skipped',
    },
    {
      title: 'Recipient Engagement',
      desc: inboundReply ? `Lead replied: "${inboundReply.content}"` : (textMsg?.deliveryStatus === 'read' ? 'Message read (Blue double tick)' : 'Awaiting read receipt'),
      time: inboundReply ? new Date(inboundReply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      icon: inboundReply || textMsg?.deliveryStatus === 'read' ? CheckCheck : AlertCircle,
      status: inboundReply || textMsg?.deliveryStatus === 'read' ? 'completed' : 'pending',
    },
  ];

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isDone = step.status === 'completed';
        const isFailed = step.status === 'failed';
        const isPending = step.status === 'pending';

        return (
          <div key={idx} className="relative flex items-start gap-3">
            {/* Dot/Icon */}
            <div
              className={`absolute -left-6 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 bg-white ${
                isDone
                  ? 'border-emerald-500 text-emerald-600'
                  : isFailed
                  ? 'border-red-500 text-red-600'
                  : isPending
                  ? 'border-amber-400 text-amber-500 animate-pulse'
                  : 'border-slate-300 text-slate-300'
              }`}
            >
              <Icon className="w-3 h-3" />
            </div>

            <div className="flex-1 bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{step.title}</span>
                {step.time && <span className="text-[11px] font-mono text-slate-400">{step.time}</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

