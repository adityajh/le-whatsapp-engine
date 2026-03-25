'use client';

import { useState, useTransition } from 'react';
import { saveKeywords } from '@/app/admin/classification/actions';

const COLOR_MAP: Record<string, { border: string; badge: string; btn: string }> = {
  green:  { border: 'border-green-200',  badge: 'bg-green-100 text-green-800',  btn: 'bg-green-600 hover:bg-green-700'  },
  blue:   { border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800',    btn: 'bg-blue-600 hover:bg-blue-700'    },
  yellow: { border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800',btn: 'bg-yellow-500 hover:bg-yellow-600'},
  gray:   { border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700',    btn: 'bg-gray-600 hover:bg-gray-700'    },
  red:    { border: 'border-red-200',    badge: 'bg-red-100 text-red-800',      btn: 'bg-red-600 hover:bg-red-700'      },
  orange: { border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800',btn: 'bg-orange-500 hover:bg-orange-600'},
};

type Props = {
  cls: string;
  label: string;
  description: string;
  color: string;
  hotness: string;
  optOut: boolean;
  initialKeywords: string[];
};

export default function ClassificationEditor({ cls, label, description, color, hotness, optOut, initialKeywords }: Props) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const c = COLOR_MAP[color] ?? COLOR_MAP.gray;

  const addKeyword = () => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) return;
    setKeywords((prev) => [...prev, trimmed]);
    setInput('');
    setSaved(false);
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveKeywords(cls, keywords);
      setSaved(true);
    });
  };

  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm ${c.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{label}</span>
            {optOut && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">Opts Out</span>}
            <span className="text-xs text-gray-400">→ {hotness}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{description}</p>
        </div>
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-2 min-h-[36px] mb-3">
        {keywords.length === 0 && cls === 'other' && (
          <span className="text-xs text-gray-400 italic">Catch-all — no keywords needed</span>
        )}
        {keywords.map((kw) => (
          <span key={kw} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.badge}`}>
            {kw}
            <button
              onClick={() => removeKeyword(kw)}
              className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Add input */}
      {cls !== 'other' && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Add keyword..."
            className="flex-1 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-400"
          />
          <button
            onClick={addKeyword}
            className="text-sm px-3 py-1.5 border rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-xs text-gray-400">{keywords.length} keyword{keywords.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Saved ✓</span>}
          <button
            onClick={handleSave}
            disabled={isPending}
            className={`text-sm text-white px-4 py-1.5 rounded-md transition-colors disabled:opacity-50 ${c.btn}`}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
