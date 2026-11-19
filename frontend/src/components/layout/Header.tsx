import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Play, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export const Header: React.FC<{ title?: string }> = ({ title = 'Dashboard Overview' }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      await api.processQueue(25);
      setLastProcessed(`Processed at ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setLastProcessed(null), 4000);
    } catch (err) {
      console.error('Queue processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Unipile WhatsApp Connected
        </span>
      </div>

      <div className="flex items-center gap-3">
        {lastProcessed && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {lastProcessed}
          </span>
        )}

        <Button
          size="sm"
          variant="secondary"
          icon={<Play className="w-3.5 h-3.5 fill-current" />}
          isLoading={isProcessing}
          onClick={handleProcessQueue}
        >
          Process Queue Now
        </Button>
      </div>
    </header>
  );
};

