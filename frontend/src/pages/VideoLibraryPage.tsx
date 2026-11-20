import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { VideoCard } from '../components/media/VideoCard';
import { DriveFileList } from '../components/media/DriveFileList';
import { DrivePreviewModal } from '../components/media/DrivePreviewModal';
import { VideoUploadModal } from '../components/media/VideoUploadModal';
import { Button } from '../components/ui/Button';
import { MediaAsset } from '../types';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  HardDrive, 
  Film, 
  FileText, 
  Sparkles,
  Cloud,
  CheckCircle2
} from 'lucide-react';

export const VideoLibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'pdf'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['media-assets'],
    queryFn: api.getMedia,
  });

  const assets: MediaAsset[] = data?.assets || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMedia(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Calculate stats
  const totalBytes = useMemo(() => {
    return assets.reduce((acc, a) => acc + (a.fileSize || 0), 0);
  }, [assets]);

  const formattedTotalSize = useMemo(() => {
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(0)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [totalBytes]);

  const videoCount = useMemo(() => assets.filter((a) => a.mimeType !== 'application/pdf').length, [assets]);
  const docCount = useMemo(() => assets.filter((a) => a.mimeType === 'application/pdf').length, [assets]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Type filter
      if (filterType === 'video' && asset.mimeType === 'application/pdf') return false;
      if (filterType === 'pdf' && asset.mimeType !== 'application/pdf') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = asset.title.toLowerCase().includes(query);
        const matchesDesc = (asset.description || '').toLowerCase().includes(query);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [assets, filterType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Google Drive Style Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-900">Google Drive Media Storage</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Cloud className="w-3 h-3 text-blue-600" />
              Drive Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Store, preview, and manage promotional video files and PDF brochures delivered via WhatsApp
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsUploadOpen(true)}
          className="shadow-sm"
        >
          Upload to Drive
        </Button>
      </div>

      {/* Drive Storage Health Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Cloud Storage Usage:</span>
              <span className="text-xs font-mono font-bold text-blue-600">{formattedTotalSize}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">{assets.length} items ({videoCount} videos, {docCount} document)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All files are hosted on high-speed CDN and instantly attached to WhatsApp automated outreach.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Automated WhatsApp Dispatch Ready</span>
        </div>
      </div>

      {/* Drive Toolbar: Search, Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files in Drive..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filter Chips & View Mode */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({assets.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                filterType === 'video' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Film className="w-3 h-3 text-red-500" />
              Videos ({videoCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pdf')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                filterType === 'pdf' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3 h-3 text-red-500" />
              PDFs ({docCount})
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Grid vs List toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Files Display */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading Google Drive media...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-8">
          <HardDrive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-700">No media found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? `No files matched "${searchQuery}".` : 'Upload your sample promotional MP4 videos or PDF brochure to store in Drive.'}
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={() => setIsUploadOpen(true)}>
              Upload File to Drive
            </Button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAssets.map((asset) => (
            <VideoCard
              key={asset.id}
              asset={asset}
              onPreview={(item) => setPreviewAsset(item)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deletingId === asset.id}
            />
          ))}
        </div>
      ) : (
        <DriveFileList
          assets={filteredAssets}
          onPreview={(item) => setPreviewAsset(item)}
          onDelete={(id) => deleteMutation.mutate(id)}
          deletingId={deletingId}
        />
      )}

      {/* Google Drive Video Player & Lightbox Preview Modal */}
      <DrivePreviewModal
        asset={previewAsset}
        assets={filteredAssets}
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
        onSelectAsset={(item) => setPreviewAsset(item)}
      />

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['media-assets'] })}
      />
    </div>
  );
};

export default VideoLibraryPage;
