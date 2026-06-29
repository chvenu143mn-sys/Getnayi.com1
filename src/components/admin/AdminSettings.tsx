import React, { useState } from 'react';
import { Save, AlertTriangle, ShieldCheck, Mail, Globe, Settings2, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminSettingsProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  handleSaveSettings: (e: React.FormEvent) => Promise<void>;
}

export default function AdminSettings({
  settings,
  setSettings,
  handleSaveSettings,
}: AdminSettingsProps) {

  const [allowedInput, setAllowedInput] = useState('');
  const [blacklistInput, setBlacklistInput] = useState('');

  const handleAddAllowed = () => {
    const val = allowedInput.trim().toLowerCase();
    if (!val) return;
    const list = settings.allowed_product_domains || [];
    if (!list.includes(val)) {
      setSettings((prev: any) => ({
        ...prev,
        allowed_product_domains: [...list, val]
      }));
    }
    setAllowedInput('');
  };

  const handleRemoveAllowed = (tag: string) => {
    setSettings((prev: any) => ({
      ...prev,
      allowed_product_domains: (prev.allowed_product_domains || []).filter((t: string) => t !== tag)
    }));
  };

  const handleAddBlacklist = () => {
    const val = blacklistInput.trim().toLowerCase();
    if (!val) return;
    const list = settings.blacklisted_product_domains || [];
    if (!list.includes(val)) {
      setSettings((prev: any) => ({
        ...prev,
        blacklisted_product_domains: [...list, val]
      }));
    }
    setBlacklistInput('');
  };

  const handleRemoveBlacklist = (tag: string) => {
    setSettings((prev: any) => ({
      ...prev,
      blacklisted_product_domains: (prev.blacklisted_product_domains || []).filter((t: string) => t !== tag)
    }));
  };

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">System Controls & Parameters</h1>
        <p className="text-text-secondary text-xs mt-1">Configure global variables, filter algorithms, domain blacklists, and platform configurations.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="gap-y-6">
        
        {/* Basic Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#141416] border border-border-subtle rounded-2xl p-5 gap-y-4">
            <h3 className="text-text-primary text-sm font-semibold flex items-center gap-2">
              <Settings2 className="size-4 text-text-secondary" />
              Upload Enforcement Controls
            </h3>

            {/* Requires verification control toggle */}
            <div className="flex items-center justify-between py-1 border-b border-border-subtle">
              <div>
                <p className="text-text-primary text-xs font-semibold">Verification Mandatory to Upload</p>
                <p className="text-text-secondary text-[10.5px] mt-0.5">Allow only approved credentials to share clip content.</p>
              </div>
              <button aria-label="button" 
                type="button"
                onClick={() => setSettings((prev: any) => ({ ...prev, require_verification_to_upload: !prev.require_verification_to_upload }))}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative flex items-center px-1 border",
                  settings.require_verification_to_upload 
                    ? "bg-[#10B981] border-green-500/20 justify-end" 
                    : "bg-surface-2 border-border-subtle justify-start"
                )}
              >
                <span className="size-4 rounded-full bg-white shadow-md block" />
              </button>
            </div>

            {/* Automatic Spam Scoring toggle */}
            <div className="flex items-center justify-between py-1 border-b border-border-subtle">
              <div>
                <p className="text-text-primary text-xs font-semibold">Pre-Upload Trust Grading</p>
                <p className="text-text-secondary text-[10.5px] mt-0.5">Analyze URL destinations automatically during video upload.</p>
              </div>
              <button aria-label="button" 
                type="button"
                onClick={() => setSettings((prev: any) => ({ ...prev, automatic_spam_filtering: !prev.automatic_spam_filtering }))}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative flex items-center px-1 border",
                  settings.automatic_spam_filtering 
                    ? "bg-[#10B981] border-green-500/20 justify-end" 
                    : "bg-surface-2 border-border-subtle justify-start"
                )}
              >
                <span className="size-4 rounded-full bg-white shadow-md block" />
              </button>
            </div>

            {/* Maintenance Mode toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-text-primary text-xs font-semibold text-[#EF4444] flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0 animate-pulse" /> Maintenance Access Restrictions
                </p>
                <p className="text-text-secondary text-[10.5px] mt-0.5">Pause public access instantly, only allowing logged in admins.</p>
              </div>
              <button aria-label="button" 
                type="button"
                onClick={() => setSettings((prev: any) => ({ ...prev, maintenance_mode: !prev.maintenance_mode }))}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative flex items-center px-1 border",
                  settings.maintenance_mode 
                    ? "bg-[#EF4444] border-red-500/20 justify-end" 
                    : "bg-surface-2 border-border-subtle justify-start"
                )}
              >
                <span className="size-4 rounded-full bg-white shadow-md block" />
              </button>
            </div>
          </div>

          <div className="bg-[#141416] border border-border-subtle rounded-2xl p-5 gap-y-4">
            <h3 className="text-text-primary text-sm font-semibold flex items-center gap-2">
              <Mail className="size-4 text-text-secondary" /> System Contact Parameters
            </h3>

            {/* Support contact info */}
            <div className="gap-y-1.5">
              <label className="text-text-secondary text-[10.5px] font-mono uppercase tracking-wider block">Administrator Support Mail</label>
              <input
                type="email"
                required
                value={settings.support_email || ''}
                onChange={(e) => setSettings((prev: any) => ({ ...prev, support_email: e.target.value }))}
                className="w-full bg-bg-base/45 border border-border-subtle focus:border-border-subtle p-2.5 rounded-xl text-xs text-text-primary placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                placeholder="chvenu143mn@gmail.com"
              />
            </div>

            {/* Max Upload payload MB size */}
            <div className="gap-y-1.5">
              <label className="text-text-secondary text-[10.5px] font-mono uppercase tracking-wider block">Max Allocation Upload limit (MB)</label>
              <input
                type="number"
                required
                value={settings.max_upload_size_mb || 100}
                onChange={(e) => setSettings((prev: any) => ({ ...prev, max_upload_size_mb: Number(e.target.value) }))}
                className="w-full bg-bg-base/45 border border-border-subtle focus:border-border-subtle p-2.5 rounded-xl text-xs text-text-primary placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* Tags lists Whitelist and Blacklists */}
        <div className="bg-[#141416] border border-border-subtle rounded-2xl p-5 gap-y-6">
          <h3 className="text-text-primary text-sm font-semibold flex items-center gap-2">
            <Globe className="size-4 text-text-secondary" /> Whitelist & Blocklist Domains Filter Control
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Allowed list */}
            <div className="gap-y-3">
              <label className="text-text-secondary text-xs font-semibold block">Trusted Outbound Store Roots (Whitelist)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. amazon.co.uk"
                  value={allowedInput}
                  onChange={(e) => setAllowedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllowed())}
                  className="flex-1 bg-bg-base/45 border border-border-subtle focus:border-border-subtle px-3 py-2 rounded-xl text-xs text-text-primary"
                />
                <button aria-label="button" 
                  type="button"
                  onClick={handleAddAllowed}
                  className="p-2 bg-white/5 hover:bg-surface-1 text-text-primary rounded-xl border border-border-subtle"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Badges container */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-bg-base/20 border border-border-subtle rounded-xl min-h-[85px] align-content-start">
                {(settings.allowed_product_domains || []).map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-500 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg">
                    {tag}
                    <button aria-label="button"  type="button" onClick={() => handleRemoveAllowed(tag)} className="text-green-500 hover:text-text-primary">&times;</button>
                  </span>
                ))}
                {(!settings.allowed_product_domains || settings.allowed_product_domains.length === 0) && (
                  <span className="text-zinc-650 text-xs italic">No domains whitelisted.</span>
                )}
              </div>
            </div>

            {/* Blacklist list */}
            <div className="gap-y-3">
              <label className="text-text-secondary text-xs font-semibold block">Suspicious Outbound Store Roots (Blocklist)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. shady-offers.xyz"
                  value={blacklistInput}
                  onChange={(e) => setBlacklistInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBlacklist())}
                  className="flex-1 bg-bg-base/45 border border-border-subtle focus:border-border-subtle px-3 py-2 rounded-xl text-xs text-text-primary"
                />
                <button aria-label="button" 
                  type="button"
                  onClick={handleAddBlacklist}
                  className="p-2 bg-white/5 hover:bg-surface-1 text-text-primary rounded-xl border border-border-subtle"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Badges container */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-bg-base/20 border border-border-subtle rounded-xl min-h-[85px] align-content-start">
                {(settings.blacklisted_product_domains || []).map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg">
                    {tag}
                    <button aria-label="button"  type="button" onClick={() => handleRemoveBlacklist(tag)} className="text-red-500 hover:text-text-primary">&times;</button>
                  </span>
                ))}
                {(!settings.blacklisted_product_domains || settings.blacklisted_product_domains.length === 0) && (
                  <span className="text-zinc-650 text-xs italic">No domains blacklisted.</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button aria-label="button" 
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-[#F97316] hover:bg-orange-600 active:scale-95 text-text-primary text-sm font-bold rounded-xl shadow-lg transition"
          >
            <Save className="size-5" /> Enforce Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
