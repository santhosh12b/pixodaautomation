import React, { useRef } from 'react';
import { Card } from '../ui/Card';
import { Sparkles, MessageCircle } from 'lucide-react';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const sampleVariables = ['name', 'phone', 'Company', 'Interest', 'City'];

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    const token = `{{${varName}}}`;
    if (!textarea) {
      onChange(value + ' ' + token);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = `${before}${token}${after}`;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Generate live preview with sample data split into distinct messages by newline
  const renderPreviewMessages = (template: string): string[] => {
    if (!template.trim()) return ['Start typing your template above to preview...'];
    let preview = template;
    preview = preview.replace(/\{\{\s*name\s*\}\}/gi, 'Alex Morgan');
    preview = preview.replace(/\{\{\s*phone\s*\}\}/gi, '+1 (555) 019-2834');
    preview = preview.replace(/\{\{\s*Company\s*\}\}/gi, 'Acme Corp');
    preview = preview.replace(/\{\{\s*Interest\s*\}\}/gi, 'Enterprise Automation');
    preview = preview.replace(/\{\{\s*City\s*\}\}/gi, 'Austin');
    const lines = preview.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [preview];
  };

  const previewMessages = renderPreviewMessages(value);

  return (
    <div className="space-y-4">
      {/* Editor & Variable Insertion */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700">WhatsApp Message Template</label>
          <span className="text-[11px] text-slate-400">Click a variable to insert</span>
        </div>

        {/* Variable Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {sampleVariables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-700 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              {`{{${v}}}`}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Hi {{name}}&#10;Thank you for enquiring with us regarding AI videos"
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          💡 Each line will be delivered as its own separate WhatsApp message bubble.
        </p>
      </div>

      {/* Live Preview Box */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            Live WhatsApp Message Preview (Alex Morgan)
          </span>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {previewMessages.length} {previewMessages.length === 1 ? 'Message' : 'Messages'}
          </span>
        </div>
        <div className="bg-[#EFEAE2] p-4 rounded-xl border border-slate-200 shadow-inner space-y-2">
          {previewMessages.map((msg, idx) => (
            <div key={idx} className="max-w-[85%] bg-white rounded-lg p-3 text-sm text-slate-900 shadow-xs relative rounded-tl-none">
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider mb-1 inline-block">
                Message #{idx + 1}
              </span>
              <p className="whitespace-pre-wrap leading-relaxed">{msg}</p>
              <div className="text-[10px] text-slate-400 text-right mt-1 font-mono flex items-center justify-end gap-1">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

