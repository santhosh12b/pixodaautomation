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
  Download 
} from 'lucide-react';

interface DriveFileListProps {
  assets: MediaAsset[];
  onDelete: (id: string) => void;
  onPreview: (asset: MediaAsset) => void;
  deletingId: string | null;
}

export const DriveFileList: React.FC<DriveFileListProps> = ({
  assets,
  onDelete,
  onPreview,
  deletingId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4">Last Modified</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((asset) => {
              const isPdf = asset.mimeType === 'application/pdf';
              const formattedSize = formatFileSize(asset.fileSize);
              const isCopied = copiedId === asset.id;

              return (
                <tr
                  key={asset.id}
                  onClick={() => onPreview(asset)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                >
                  {/* File Name + Icon */}
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isPdf ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {isPdf ? <FileText className="w-4 h-4 text-red-600" /> : <Film className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block truncate max-w-sm sm:max-w-md">
                        {asset.title}
                      </span>
                      {asset.description && (
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {asset.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isPdf ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {isPdf ? 'PDF' : 'MP4 Video'}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formattedSize}
                  </td>

                  {/* Modified */}
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPreview(asset)}
                        className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Preview File"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopy(asset.id, asset.blobUrl, e)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Copy Link"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <a
                        href={asset.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Open File"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete file "${asset.title}" from Drive?`)) {
                            onDelete(asset.id);
                          }
                        }}
                        disabled={deletingId === asset.id}
                        className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
