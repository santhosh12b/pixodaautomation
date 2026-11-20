import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Campaign, MediaAsset } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TemplateEditor } from './TemplateEditor';
import { X, Video, ShieldAlert, Sparkles, FileText, ArrowUp, ArrowDown, CheckSquare, Square, ListOrdered } from 'lucide-react';

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  campaignToEdit?: Campaign | null;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  campaignToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetTab, setSheetTab] = useState('Sheet1');
  const [messageTemplate, setMessageTemplate] = useState('Hi {{name}}\nThank you for enquiring with us regarding AI videos');
  const [videoAssetIds, setVideoAssetIds] = useState<string[]>([]);
  const [videoCaption, setVideoCaption] = useState('Pls find these sample we did for other brands');
  const [videoDelaySeconds, setVideoDelaySeconds] = useState(5);
  const [documentAssetId, setDocumentAssetId] = useState('');
  const [documentCaption, setDocumentCaption] = useState('Please refer to the PDF above for video types and pricing packages 👆');
  const [documentDelaySeconds, setDocumentDelaySeconds] = useState(5);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [status, setStatus] = useState<'active' | 'draft' | 'paused'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available videos & documents
  const { data: mediaData } = useQuery({
    queryKey: ['media-assets-modal'],
    queryFn: api.getMedia,
    enabled: isOpen,
  });

  const mediaAssets = mediaData?.assets || [];
  const videoAssets = mediaAssets.filter(a => a.mimeType.startsWith('video/'));
  const documentAssets = mediaAssets.filter(a => a.mimeType.includes('pdf') || !a.mimeType.startsWith('video/'));

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name);
      setDescription(campaignToEdit.description || '');
      setSheetUrl(campaignToEdit.sheetUrl || '');
      setSheetTab(campaignToEdit.sheetTab || 'Sheet1');
      setMessageTemplate(campaignToEdit.messageTemplate);
      
      const existingIds = (campaignToEdit.videoAssetIds && campaignToEdit.videoAssetIds.length > 0)
        ? campaignToEdit.videoAssetIds
        : (campaignToEdit.videoAssetId ? [campaignToEdit.videoAssetId] : []);
      setVideoAssetIds(existingIds);

      setVideoCaption(campaignToEdit.videoCaption || 'Pls find these sample we did for other brands');
      setVideoDelaySeconds(campaignToEdit.videoDelaySeconds ?? 5);
      setDocumentAssetId(campaignToEdit.documentAssetId || '');
      setDocumentCaption(campaignToEdit.documentCaption || 'Please refer to the PDF above for video types and pricing packages 👆');
      setDocumentDelaySeconds(campaignToEdit.documentDelaySeconds ?? 5);
      setCooldownHours(campaignToEdit.cooldownHours ?? 24);
      setStatus(campaignToEdit.status as 'active' | 'draft' | 'paused');
    } else {
      setName('Google Sheet Inbound VIPs');
      setDescription('Automates 3-step sequence: Greeting text -> 4 Sample Videos -> Pricing PDF');
      setSheetUrl('Inbound Leads 2026');
      setSheetTab('Sheet1');
      setMessageTemplate('Hi {{name}}\nThank you for enquiring with us regarding AI videos');
      
      // Default to all 4 sample videos
      const sampleVideoIds = videoAssets
        .filter(a => a.title.toLowerCase().includes('sample'))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(a => a.id);
      setVideoAssetIds(sampleVideoIds.length > 0 ? sampleVideoIds : videoAssets.slice(0, 4).map(a => a.id));

      setVideoCaption('Pls find these sample we did for other brands');
      setVideoDelaySeconds(5);
      
      // Default to PDF brochure
      const pdfAsset = mediaAssets.find(a => a.mimeType.includes('pdf') || a.title.toLowerCase().includes('pdf') || a.title.toLowerCase().includes('pricing'));
      setDocumentAssetId(pdfAsset?.id || '');
      setDocumentCaption('Please refer to the PDF above for video types and pricing packages 👆');
      setDocumentDelaySeconds(5);
      setCooldownHours(24);
      setStatus('active');
    }
    setError(null);
  }, [campaignToEdit, isOpen, mediaAssets.length]);

  if (!isOpen) return null;

  const toggleVideoSelection = (id: string) => {
    setVideoAssetIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(v => v !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const moveVideo = (index: number, direction: 'up' | 'down') => {
    setVideoAssetIds(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const selectAllSampleVideos = () => {
    const samples = videoAssets
      .filter(a => a.title.toLowerCase().includes('sample'))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(a => a.id);
    setVideoAssetIds(samples.length > 0 ? samples : videoAssets.map(a => a.id));
  };

  const selectAllVideos = () => {
    setVideoAssetIds(videoAssets.map(a => a.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a campaign name.');
      return;
    }

    if (!messageTemplate.trim()) {
      setError('Message template is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        description,
        sheetUrl,
        sheetTab,
        messageTemplate,
        videoAssetId: videoAssetIds[0] || undefined,
        videoAssetIds: videoAssetIds.length > 0 ? videoAssetIds : undefined,
        videoCaption: videoCaption || undefined,
        videoDelaySeconds,
        documentAssetId: documentAssetId || undefined,
        documentCaption: documentCaption || undefined,
        documentDelaySeconds,
        cooldownHours,
        status,
      };

      if (campaignToEdit) {
        await api.updateCampaign(campaignToEdit.id, payload);
      } else {
        await api.createCampaign(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {campaignToEdit ? 'Edit Campaign' : 'Create New Campaign'}
            </h3>
            <p className="text-xs text-slate-500">Configure automated WhatsApp sequence and video delivery</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Campaign Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Campaign Name"
                placeholder="e.g. VIP Inbound Leads"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'draft' | 'paused')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="active">Active (Auto-send)</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Input
              label="Description (Optional)"
              placeholder="e.g. Captures leads from Marketing Sheet and sends introductory video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Google Sheet Matching Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Google Sheet (Name or URL)"
              placeholder="e.g. Inbound Leads 2026"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
            <Input
              label="Sheet Tab Name"
              placeholder="e.g. Sheet1"
              value={sheetTab}
              onChange={(e) => setSheetTab(e.target.value)}
            />
          </div>

          {/* Template Editor */}
          <TemplateEditor value={messageTemplate} onChange={setMessageTemplate} />

          {/* Step 2: Promotional Video Sequence */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-600" />
                Step 2: Sample Videos Sequence Follow-up
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {videoAssetIds.length} {videoAssetIds.length === 1 ? 'Video' : 'Videos'} in Sequence
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Videos will be delivered one-by-one via WhatsApp with automatic delay between each video.
            </p>

            {/* Quick Actions & Multi-Select Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Multi-Select:</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {videoAssetIds.length} of {videoAssets.length} Selected
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllVideos}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white transition-colors"
                >
                  Select All ({videoAssets.length})
                </button>
                <button
                  type="button"
                  onClick={selectAllSampleVideos}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition-colors"
                >
                  Select 4 Samples
                </button>
                <button
                  type="button"
                  onClick={() => setVideoAssetIds([])}
                  className="px-2 py-1 rounded text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Video List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {videoAssets.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No promotional videos in library.</div>
              ) : (
                videoAssets.map((asset) => {
                  const selectedIndex = videoAssetIds.indexOf(asset.id);
                  const isSelected = selectedIndex !== -1;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => toggleVideoSelection(asset.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-400 text-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            #{selectedIndex + 1}
                          </span>
                        )}

                        <div className="min-w-0 truncate">
                          <p className="font-semibold text-slate-800 truncate">{asset.title}</p>
                          <p className="text-[10px] text-slate-400">{formatFileSize(asset.fileSize)} • video/mp4</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={selectedIndex === 0}
                            onClick={() => moveVideo(selectedIndex, 'up')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-emerald-100/50"
                            title="Move earlier in sequence"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={selectedIndex === videoAssetIds.length - 1}
                            onClick={() => moveVideo(selectedIndex, 'down')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-emerald-100/50"
                            title="Move later in sequence"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Delay & Caption */}
            {videoAssetIds.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-200/60">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Delay Between Videos (Seconds)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Quick:</span>
                      {[0, 3, 5, 10].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setVideoDelaySeconds(sec)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                            videoDelaySeconds === sec
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {sec === 0 ? '⚡ 0s (At Once)' : `${sec}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={videoDelaySeconds}
                    onChange={(e) => setVideoDelaySeconds(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {videoDelaySeconds === 0
                      ? '⚡ 0s delay: All selected videos will be queued and delivered back-to-back at once.'
                      : `⏳ ${videoDelaySeconds}s delay: Videos will be delivered one-by-one with a ${videoDelaySeconds}-second pause between each video.`}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Video Sequence Caption (Sent with Video #1)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pls find these sample we did for other brands"
                    value={videoCaption}
                    onChange={(e) => setVideoCaption(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 3: PDF Document / Pricing Brochure Follow-up */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Step 3: PDF Pricing Brochure Follow-up
              </span>
              <span className="text-[11px] text-slate-500">Sent automatically after videos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select PDF Asset</label>
                <select
                  value={documentAssetId}
                  onChange={(e) => setDocumentAssetId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No PDF Document (Skip Step)</option>
                  {documentAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.mimeType.includes('pdf') ? 'PDF' : 'Media'})
                    </option>
                  ))}
                  {mediaAssets.filter(a => !documentAssets.includes(a)).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delay After Videos (Seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={documentDelaySeconds}
                  onChange={(e) => setDocumentDelaySeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {documentAssetId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">PDF Message Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Please refer to the PDF above for video types and pricing packages 👆"
                  value={documentCaption}
                  onChange={(e) => setDocumentCaption(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Cooldown Settings */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Duplicate Suppression Cooldown (Hours)
            </label>
            <input
              type="number"
              min={1}
              max={720}
              value={cooldownHours}
              onChange={(e) => setCooldownHours(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Suppresses duplicate messages if the same phone number is submitted again within this window.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {campaignToEdit ? 'Save Changes' : 'Create & Activate Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

