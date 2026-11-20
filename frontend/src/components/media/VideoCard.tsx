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

  const formattedSize = (asset.fileSize / (1024 * 1024)).toFixed(1);

  return (
    <Card className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
      {/* Video / Media Preview */}
      <div className="relative bg-slate-900 aspect-video flex items-center justify-center">
        {asset.mimeType === 'application/pdf' ? (
          <div className="flex flex-col items-center justify-center text-slate-300 gap-2 p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-200">PDF Document Brochure</span>
            <a
              href={asset.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              Open PDF Document <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : asset.blobUrl && !asset.blobUrl.includes('mock') ? (
          <video
            src={asset.blobUrl}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
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
            <span>{formattedSize} MB</span>
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

