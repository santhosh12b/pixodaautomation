import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { VideoCard } from '../components/media/VideoCard';
import { VideoUploadModal } from '../components/media/VideoUploadModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Video, Plus, Info, ShieldCheck } from 'lucide-react';

export const VideoLibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['media-assets'],
    queryFn: api.getMedia,
  });

  const assets = data?.assets || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMedia(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Promotional Video Library</h3>
          <p className="text-xs text-slate-500">
            High-converting video assets hosted on Vercel Blob and delivered via Unipile
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload Video Asset
        </Button>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <h4 className="font-bold">Automated Two-Step Delivery Pipeline</h4>
          <p className="text-emerald-800 leading-relaxed">
            When a lead arrives from Google Sheets, the queue delivers the personalized WhatsApp text message first. Once the text message transmission is confirmed by Unipile, the queue immediately schedules and dispatches the attached promotional video with your configured delay.
          </p>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            Loading video library...
          </div>
        ) : assets.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-8">
            <Video className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No promotional videos yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Upload your MP4 video clips to attach them to your automated WhatsApp outreach campaigns.
            </p>
            <div className="mt-4">
              <Button size="sm" onClick={() => setIsUploadOpen(true)}>
                Upload Video Now
              </Button>
            </div>
          </div>
        ) : (
          assets.map((asset) => (
            <VideoCard
              key={asset.id}
              asset={asset}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deletingId === asset.id}
            />
          ))
        )}
      </div>

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
