import React from 'react';
import { Message } from '../../types';
import { Check, CheckCheck, Clock, AlertCircle, Video } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';

  const renderStatusIcon = () => {
    switch (message.deliveryStatus) {
      case 'queued':
        return <Clock className="w-3 h-3 text-slate-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-slate-400" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500 font-bold" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Check className="w-3 h-3 text-slate-400" />;
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full ${isOutbound ? 'justify-end' : 'justify-start'} my-2`}>
      <div
        className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-2xs relative text-sm ${
          isOutbound
            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
            : 'bg-white text-slate-900 rounded-tl-xs border border-slate-100'
        }`}
      >
        {/* Video Player Embed if media exists */}
        {message.type === 'video' || message.mediaUrl ? (
          <div className="mb-2 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
            {message.mediaUrl ? (
              <video
                src={message.mediaUrl}
                controls
                className="w-full max-h-56 object-cover"
                poster=""
              />
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-300 gap-2 text-xs">
                <Video className="w-5 h-5 text-emerald-400" />
                <span>Promotional Video Attached</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Message Content Text */}
        {message.content && (
          <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
        )}

        {/* Timestamp and Delivery Receipts */}
        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1 select-none">
          <span>{formattedTime}</span>
          {isOutbound && <span className="ml-0.5">{renderStatusIcon()}</span>}
        </div>
      </div>
    </div>
  );
};

