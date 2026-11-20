import React, { useState } from 'react';
import { MediaAsset } from '../../types';
import { 
  Play, 
  FileText, 
  Film, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink, 
  Eye,
  MoreVertical,
  HardDrive
} from 'lucide-react';

interface VideoCardProps {
  asset: MediaAsset;
  onDelete: (id: string) => void;
  onPreview: (asset: MediaAsset) => void;
  isDeleting?: boolean;
}

export const getAssetThumbnail = (asset: MediaAsset): string | null => {
  if (asset.thumbnailUrl) return asset.thumbnailUrl;
  const match = asset.blobUrl.match(/sample-video-(\d)\.mp4/);
  if (match) {
    return `/sample-video-${match[1]}-thumb.jpg`;
  }
  if (asset.blobUrl.includes('sample-ai-video.mp4')) {
    return '/sample-ai-video-thumb.jpg';
  }
  return null;
};

export const VideoCard: React.FC<VideoCardProps> = ({ 
  asset, 
  onDelete, 
  onPreview,
  isDeleting 
}) => {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
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
  const isPdf = asset.mimeType === 'application/pdf';
  const thumbnail = getAssetThumbnail(asset);

  return (
    <div 
      onClick={() => onPreview(asset)}
      className="group relative bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Google Drive File Header */}
      <div className="p-3.5 pb-2.5 flex items-start justify-between gap-2.5 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isPdf 
              ? 'bg-red-50 text-red-600 border border-red-100' 
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {isPdf ? (
              <FileText className="w-4 h-4 text-red-600" />
            ) : (
              <Film className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={asset.title}>
              {asset.title}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {isPdf ? 'PDF Document' : 'MP4 Video'} • {formattedSize}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleCopyUrl}
            title="Copy Drive link"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete file "${asset.title}" from Drive?`)) {
                onDelete(asset.id);
              }
            }}
            title="Delete file"
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Google Drive Thumbnail / Preview Frame */}
      <div className="relative mx-3 my-1 h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-100 flex items-center justify-center">
        {isPdf ? (
          /* Google Drive PDF Document Style */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shadow-xs mb-2">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-700 max-w-[200px] truncate">{asset.title}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Google Drive PDF Brochure</span>
            <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
              <Eye className="w-3 h-3" /> Preview PDF
            </div>
          </div>
        ) : thumbnail ? (
          /* High-res instant thumbnail poster */
          <div className="relative w-full h-full">
            <img 
              src={thumbnail} 
              alt={asset.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Google Drive Frosted Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>

            {/* Google Drive Format Badge */}
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider border border-white/10 uppercase">
                9:16 Video
              </span>
            </div>

            {/* Bottom info banner */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white/90 text-[11px] font-medium pointer-events-none">
              <span className="truncate max-w-[180px] drop-shadow-sm">{asset.title}</span>
              <span className="bg-black/60 px-1.5 py-0.2 rounded text-[10px] font-mono">{formattedSize}</span>
            </div>
          </div>
        ) : (
          /* Fallback clean container with play */
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
            <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors mb-2">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="text-xs font-semibold text-slate-300">Click to Preview</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{formattedSize}</span>
          </div>
        )}
      </div>

      {/* Google Drive Card Footer */}
      <div className="p-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono truncate">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span>Drive CDN</span>
          <span>•</span>
          <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onPreview(asset)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3 h-3 text-slate-500" />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
