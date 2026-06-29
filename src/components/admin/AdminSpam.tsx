import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Trash2, Eye, Ban, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseVideoProduct } from '../../utils/videoUtils';

interface AdminSpamProps {
  spamItems: any[];
  handleDeleteVideo: (id: string) => Promise<void>;
  handleSuspendCreator: (id: string, isSuspended: boolean) => Promise<void>;
  handleViewVideo: (video: any) => void;
  handleDismissSpam: (id: string) => Promise<void>; // we can call handleDismissSpam or handleVerifyProduct to boost trust score
}

export default function AdminSpam({
  spamItems,
  handleDeleteVideo,
  handleSuspendCreator,
  handleViewVideo,
  handleDismissSpam,
}: AdminSpamProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = spamItems.filter(item => {
    const mainText = `${parseVideoProduct(item.video?.caption).captionText || ''} ${item.reasons.join(' ')} ${item.video?.profiles?.username || ''}`.toLowerCase();
    return mainText.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">AI & Risk Spam Detection</h1>
        <p className="text-text-secondary text-xs mt-1">Real-time content scoring scans capturing keyword payloads, safety discrepancies, and domain violations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141416] border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-text-secondary text-[10px] uppercase font-mono tracking-wider">Scanned Assets</span>
            <p className="text-2xl font-bold text-text-primary mt-1">{spamItems.length}</p>
          </div>
          <AlertTriangle className="size-5 text-zinc-650 mt-2" />
        </div>
        <div className="bg-[#141416] border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-text-secondary text-[10px] uppercase font-mono tracking-wider">Risk Flag Count</span>
            <p className="text-2xl font-bold text-[#EF4444] mt-1">{spamItems.filter(i => i.riskScore >= 70).length}</p>
          </div>
          <ShieldAlert className="size-5 text-red-500/20 mt-2" />
        </div>
        <div className="bg-[#141416] border border-border-subtle rounded-2xl p-5 flex flex-col justify-between max-w-full">
          <div>
            <span className="text-text-secondary text-[10px] uppercase font-mono tracking-wider">Average Compliance Rating</span>
            <p className="text-2xl font-bold text-green-500 mt-1">98.4%</p>
          </div>
          <div className="size-2.5 rounded-full bg-green-500 animate-pulse mt-2" />
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Keyword string match filter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-10 py-2.5 bg-[#141416]/90 border border-border-subtle focus:border-border-subtle focus:ring-1 focus:ring-white/10 rounded-xl text-sm text-text-primary placeholder-zinc-500 focus:outline-none transition-all"
        />
      </div>

      {/* Grid of cards instead of table to show reasons perfectly! */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-[#141416] border border-[#EF4444]/20 rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-[#EF4444]/10 text-[#EF4444] font-mono text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-[#EF4444]/15">
              RISK: {item.riskScore}%
            </div>

            <div>
              <div className="flex items-center gap-3">
                {item.video?.thumbnail_url ? (
                  <img src={item.video.thumbnail_url} className="w-12 h-16 rounded-lg object-cover bg-neutral-900 border border-border-subtle" referrerPolicy="no-referrer"  alt="" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-white/5 border border-border-subtle" />
                )}
                <div className="min-w-0">
                  <p className="text-text-primary font-semibold text-sm truncate max-w-[150px]">{parseVideoProduct(item.video?.caption).captionText || 'Untitled Video'}</p>
                  <p className="text-text-secondary text-[10px] font-mono mt-0.5">by @{item.video?.profiles?.username || 'uploader'}</p>
                  {item.video?.product_url && (
                    <p className="text-[#F97316] text-[10px] font-mono truncate max-w-[150px] mt-1 hover:underline">
                      {item.video.product_url}
                    </p>
                  )}
                </div>
              </div>

              {/* Reasons list */}
              <div className="mt-4 bg-bg-base border border-border-subtle rounded-xl p-3 gap-y-2">
                <span className="text-text-secondary text-[10px] font-mono uppercase tracking-wider">Classification analysis:</span>
                <ul className="gap-y-1.5 mt-1">
                  {item.reasons.map((reason: string, idx: number) => (
                    <li key={idx} className="text-text-secondary text-xs flex items-start gap-1.5 leading-relaxed font-serif">
                      <span className="size-1.5 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border-subtle">
              <button type="button" aria-label="button" 
                onClick={() => handleViewVideo(item.video)}
                className="px-3 py-1.5 bg-white/5 border border-border-subtle hover:border-border-subtle hover:bg-surface-1 text-xs text-text-primary rounded-lg flex items-center gap-1 font-semibold transition"
              >
                <Eye className="size-3.5" /> Inspect File
              </button>
              <button type="button" aria-label="button" 
                onClick={() => handleDismissSpam(item.video.id)}
                className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-xs font-semibold hover:bg-green-500/15 transition flex items-center gap-1"
                title="Mark safe / whitelist"
              >
                <CheckCircle className="size-3.5" /> Approve
              </button>
              <button type="button" aria-label="button" 
                onClick={() => handleDeleteVideo(item.video.id)}
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-500/15 transition flex items-center gap-1"
                title="Delete content instantly"
              >
                <Trash2 className="size-3.5" /> Purge
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 py-16 bg-[#141416]/50 border border-dashed border-border-subtle rounded-2xl text-center">
            <AlertTriangle className="size-10 text-zinc-650 mx-auto mb-3" />
            <p className="text-text-secondary font-semibold mb-1">Risk dashboard intact</p>
            <p className="text-zinc-6 text-xs max-w-[280px] mx-auto leading-relaxed">System scan returns zero flagged commercial spam or dangerous links in current queues.</p>
          </div>
        )}
      </div>
    </div>
  );
}
