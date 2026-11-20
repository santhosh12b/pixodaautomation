import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Campaign, MediaAsset } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TemplateEditor } from './TemplateEditor';
import { X, Video, ShieldAlert, Sparkles, FileText } from 'lucide-react';

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
  const [messageTemplate, setMessageTemplate] = useState('Hi {{name}},\nThank you for enquiring with us regarding AI videos');
  const [videoAssetId, setVideoAssetId] = useState('');
  const [videoCaption, setVideoCaption] = useState('Pls find these sample we did for other brands');
  const [videoDelaySeconds, setVideoDelaySeconds] = useState(5);
  const [documentAssetId, setDocumentAssetId] = useState('');
  const [documentCaption, setDocumentCaption] = useState('Please refer to the PDF above for video types and pricing packages 👆');
  const [documentDelaySeconds, setDocumentDelaySeconds] = useState(5);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [status, setStatus] = useState<'active' | 'draft' | 'paused'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available videos
  const { data: mediaData } = useQuery({
    queryKey: ['media-assets-modal'],
    queryFn: api.getMedia,
    enabled: isOpen,
  });

  const mediaAssets = mediaData?.assets || [];

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name);
      setDescription(campaignToEdit.description || '');
      setSheetUrl(campaignToEdit.sheetUrl || '');
      setSheetTab(campaignToEdit.sheetTab || 'Sheet1');
      setMessageTemplate(campaignToEdit.messageTemplate);
      setVideoAssetId(campaignToEdit.videoAssetId || '');
      setVideoCaption(campaignToEdit.videoCaption || 'Pls find these sample we did for other brands');
      setVideoDelaySeconds(campaignToEdit.videoDelaySeconds ?? 5);
      setDocumentAssetId(campaignToEdit.documentAssetId || '');
      setDocumentCaption(campaignToEdit.documentCaption || 'Please refer to the PDF above for video types and pricing packages 👆');
      setDocumentDelaySeconds(campaignToEdit.documentDelaySeconds ?? 5);
      setCooldownHours(campaignToEdit.cooldownHours ?? 24);
      setStatus(campaignToEdit.status as 'active' | 'draft' | 'paused');
    } else {
      setName('');
      setDescription('');
      setSheetUrl('');
      setSheetTab('Sheet1');
      setMessageTemplate('Hi {{name}},\nThank you for enquiring with us regarding AI videos');
      setVideoAssetId('');
      setVideoCaption('Pls find these sample we did for other brands');
      setVideoDelaySeconds(5);
      setDocumentAssetId('');
      setDocumentCaption('Please refer to the PDF above for video types and pricing packages 👆');
      setDocumentDelaySeconds(5);
      setCooldownHours(24);
      setStatus('active');
    }
    setError(null);
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

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
      if (campaignToEdit) {
        await api.updateCampaign(campaignToEdit.id, {
          name,
          description,
          sheetUrl,
          sheetTab,
          messageTemplate,
          videoAssetId: videoAssetId || undefined,
          videoCaption: videoCaption || undefined,
          videoDelaySeconds,
          documentAssetId: documentAssetId || undefined,
          documentCaption: documentCaption || undefined,
          documentDelaySeconds,
          cooldownHours,
          status,
        });
      } else {
        await api.createCampaign({
          name,
          description,
          sheetUrl,
          sheetTab,
          messageTemplate,
          videoAssetId: videoAssetId || undefined,
          videoCaption: videoCaption || undefined,
          videoDelaySeconds,
          documentAssetId: documentAssetId || undefined,
          documentCaption: documentCaption || undefined,
          documentDelaySeconds,
          cooldownHours,
          status,
        });
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

          {/* Step 2: Promotional Video Selection */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-600" />
                Step 2: Sample Video Follow-up
              </span>
              <span className="text-[11px] text-slate-500">Sent automatically after text</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Video Asset</label>
                <select
                  value={videoAssetId}
                  onChange={(e) => setVideoAssetId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">No Promotional Video (Skip Step)</option>
                  {mediaAssets.filter(a => a.mimeType.startsWith('video/')).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({(asset.fileSize / (1024 * 1024)).toFixed(1)} MB)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delay After Text (Seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={videoDelaySeconds}
                  onChange={(e) => setVideoDelaySeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {videoAssetId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Video Message Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Pls find these sample we did for other brands"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Step 3: PDF Document / Pricing Brochure Follow-up */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Step 3: PDF Document / Pricing Brochure Follow-up
              </span>
              <span className="text-[11px] text-slate-500">Sent automatically after video</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select PDF / Document Asset</label>
                <select
                  value={documentAssetId}
                  onChange={(e) => setDocumentAssetId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">No PDF Document (Skip Step)</option>
                  {mediaAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.mimeType.includes('pdf') ? 'PDF' : 'Media'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delay After Video (Seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={documentDelaySeconds}
                  onChange={(e) => setDocumentDelaySeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

