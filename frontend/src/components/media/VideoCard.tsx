import React, { useState } from 'react';
import { MediaAsset } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Video, Copy, Trash2, Check, ExternalLink, FileText } from 'lucide-react';

interface VideoCardProps {
  asset: MediaAsset;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ asset, onDelete, isDeleting }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(asset.blobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedSize = formatFileSize(asset.fileSize);

  return (
    <Card className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
      {/* Video / Media Preview */}
      <div className="relative bg-slate-950 h-64 sm:h-72 w-full flex items-center justify-center overflow-hidden border-b border-slate-100">
        {asset.mimeType === 'application/pdf' ? (
          <div className="flex flex-col items-center justify-center text-slate-300 gap-3 p-6 text-center w-full h-full bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/5">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">PDF Document Brochure</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block max-w-[220px] truncate">{asset.title}</span>
            </div>
            <a
              href={asset.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              Open PDF Document <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : asset.blobUrl && !asset.blobUrl.includes('mock') ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              src={asset.blobUrl}
              controls
              className="w-full h-full max-h-72 object-contain"
              preload="metadata"
            />
            {/* Format badge */}
            <div className="absolute top-2.5 right-2.5 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wider border border-white/10 uppercase">
                9:16 Vertical
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
              <Video className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-300">Video Asset</span>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{asset.title}</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 truncate">{asset.title}</h4>
          {asset.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{asset.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
            <span>{formattedSize}</span>
            <span>•</span>
            <span>{asset.mimeType}</span>
            <span>•</span>
            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyUrl}
          >
            {copied ? 'Copied' : 'Copy URL'}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            isLoading={isDeleting}
            onClick={() => {
              if (confirm(`Delete video "${asset.title}"?`)) {
                onDelete(asset.id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

