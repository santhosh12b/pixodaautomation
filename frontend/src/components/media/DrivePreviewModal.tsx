import React, { useEffect } from 'react';
import { MediaAsset } from '../../types';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Film,
  Play
} from 'lucide-react';

interface DrivePreviewModalProps {
  asset: MediaAsset | null;
  assets: MediaAsset[];
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: MediaAsset) => void;
}

export const DrivePreviewModal: React.FC<DrivePreviewModalProps> = ({
  asset,
  assets,
  isOpen,
  onClose,
  onSelectAsset,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Keyboard navigation: ESC to close, Left/Right arrows to navigate
  useEffect(() => {
    if (!isOpen || !asset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        const idx = assets.findIndex((a) => a.id === asset.id);
        if (idx > 0) {
          onSelectAsset(assets[idx - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const idx = assets.findIndex((a) => a.id === asset.id);
        if (idx < assets.length - 1) {
          onSelectAsset(assets[idx + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, asset, assets, onClose, onSelectAsset]);

  if (!isOpen || !asset) return null;

  const currentIndex = assets.findIndex((a) => a.id === asset.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < assets.length - 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.blobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPdf = asset.mimeType === 'application/pdf';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Google Drive Style Bar */}
      <div 
        className="h-16 px-6 bg-slate-950/80 border-b border-white/10 flex items-center justify-between shrink-0 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isPdf ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {isPdf ? <FileText className="w-5 h-5" /> : <Film className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate max-w-md">{asset.title}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>{formatFileSize(asset.fileSize)}</span>
              <span>•</span>
              <span className="uppercase">{isPdf ? 'PDF' : 'MP4 Video'}</span>
              <span>•</span>
              <span>{currentIndex + 1} of {assets.length}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            title="Copy Drive URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <a
            href={asset.blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>

          <a
            href={asset.blobUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <div className="h-5 w-px bg-white/20 mx-1" />

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Preview Stage */}
      <div 
        className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {hasPrev && (
          <button
            type="button"
            onClick={() => onSelectAsset(assets[currentIndex - 1])}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110 shadow-lg"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            type="button"
            onClick={() => onSelectAsset(assets[currentIndex + 1])}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110 shadow-lg"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Media Content */}
        <div className="max-w-4xl max-h-[78vh] w-full flex items-center justify-center">
          {isPdf ? (
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-8 text-center text-white space-y-4 shadow-2xl">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-xl">
                <FileText className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold">{asset.title}</h4>
                {asset.description && (
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{asset.description}</p>
                )}
                <p className="text-xs text-slate-500 font-mono mt-2">{formatFileSize(asset.fileSize)} • PDF Document</p>
              </div>
              <div className="pt-4 flex items-center justify-center gap-3">
                <a
                  href={asset.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full PDF in New Tab
                </a>
                <a
                  href={asset.blobUrl}
                  download
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
              </div>
            </div>
          ) : (
            <div className="relative w-full flex items-center justify-center">
              <video
                key={asset.id}
                src={asset.blobUrl}
                controls
                autoPlay
                className="max-h-[76vh] max-w-full rounded-xl shadow-2xl bg-black border border-white/10"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Hints & Description */}
      <div 
        className="h-12 px-6 bg-slate-950/80 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="truncate max-w-md">
          {asset.description || 'Promotional media asset stored in Google Drive'}
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-500">
          <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">→</kbd> to navigate</span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};

