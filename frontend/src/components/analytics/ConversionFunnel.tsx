import React from 'react';
import { FunnelStage } from '../../types';

interface ConversionFunnelProps {
  stages: FunnelStage[];
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ stages }) => {
  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => {
        const percentageNum = parseFloat(stage.rate.replace('%', '')) || 0;

        return (
          <div key={stage.stage} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </span>
                {stage.stage}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">{stage.count} leads</span>
                <span className="text-emerald-600 font-semibold w-12 text-right">{stage.rate}</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(percentageNum, 5)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

