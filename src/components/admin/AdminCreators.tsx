import React, { useState } from 'react';
import { Search, Filter, Shield, Award, Ban, CheckCircle, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminCreatorsProps {
  creators: any[];
  handleToggleUploadPrivilege: (id: string, canUpload: boolean) => Promise<void>;
  handleToggleCreatorRole: (id: string, field: string, value: boolean) => Promise<void>;
  handleSuspendCreator: (id: string, isSuspended: boolean) => Promise<void>;
}

export default function AdminCreators({
  creators,
  handleToggleUploadPrivilege,
  handleToggleCreatorRole,
  handleSuspendCreator,
}: AdminCreatorsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'creators' | 'brands' | 'admins' | 'suspended'>('all');

  const filtered = creators.filter(p => {
    const matchesSearch = 
      (p.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    if (roleFilter === 'creators') return matchesSearch && p.can_upload && !p.is_brand;
    if (roleFilter === 'brands') return matchesSearch && p.is_brand;
    if (roleFilter === 'admins') return matchesSearch && p.is_admin;
    if (roleFilter === 'suspended') return matchesSearch && p.is_suspended;
    return matchesSearch;
  });

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">User Directory & Roles</h1>
        <p className="text-text-secondary text-xs mt-1">Configure user-level permissions, verify brand upload configurations, or issue suspensions.</p>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search creators by username, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141416]/90 border border-border-subtle focus:border-border-subtle focus:ring-1 focus:ring-white/10 rounded-xl text-sm text-text-primary placeholder-zinc-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-text-secondary" />
          <select
            value={roleFilter}
            onChange={(e: any) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#141416]/90 border border-border-subtle focus:border-border-subtle rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value="all">All Registered Accounts</option>
            <option value="creators">Creators (With Upload Privileges)</option>
            <option value="brands">Branded Accounts</option>
            <option value="admins">Administrators</option>
            <option value="suspended">Suspended Accounts</option>
          </select>
        </div>

        <div className="flex items-center justify-end">
          <span className="text-text-secondary text-xs font-mono">
            Directing {filtered.length} profiles
          </span>
        </div>
      </div>

      {/* Desktop user list card */}
      <div className="bg-[#141416] border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181a] border-b border-border-subtle text-text-secondary uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-5 font-semibold">User details</th>
                <th className="py-4 px-5 font-semibold">Active Permissions</th>
                <th className="py-4 px-5 font-semibold">Brand Flag</th>
                <th className="py-4 px-5 font-semibold">Admin Account</th>
                <th className="py-4 px-5 font-semibold">Status Code</th>
                <th className="py-4 px-5 font-semibold text-right">Moderator action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filtered.map((creator) => (
                <tr key={creator.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} className="size-10 rounded-full object-cover border border-border-subtle" referrerPolicy="no-referrer"  alt="" loading="lazy" decoding="async" />
                      ) : (
                        <div className="size-10 rounded-full bg-orange-500/10 text-[#F97316] font-bold text-sm flex items-center justify-center border border-border-subtle">
                          {(creator.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-text-primary text-[13px]">{creator.username || 'user_identity'}</p>
                        <p className="text-text-secondary text-[10px] mt-0.5">{creator.email || 'no-email@id'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <button type="button" aria-label="button" 
                      onClick={() => handleToggleUploadPrivilege(creator.id, !creator.can_upload)}
                      className="flex items-center gap-2 text-text-primary hover:text-text-primary transition"
                    >
                      {creator.can_upload ? (
                        <span className="text-[#10B981] flex items-center gap-1 font-mono text-[11px] font-semibold">
                          <CheckCircle className="size-4" /> Granted
                        </span>
                      ) : (
                        <span className="text-text-secondary flex items-center gap-1 font-mono text-[11px]">
                          <XCircle className="size-4" /> Banned
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-5">
                    <button type="button" aria-label="button" 
                      onClick={() => handleToggleCreatorRole(creator.id, 'is_brand', !creator.is_brand)}
                      className="text-text-secondary hover:text-text-primary group flex items-center gap-1"
                    >
                      {creator.is_brand ? (
                        <span className="text-[#3B82F6] flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <Award className="size-3.5" /> BRAND
                        </span>
                      ) : (
                        <span className="text-zinc-650 font-mono text-[11px] hover:underline">Toggle Brand</span>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-5">
                    <button type="button" aria-label="button" 
                      onClick={() => handleToggleCreatorRole(creator.id, 'is_admin', !creator.is_admin)}
                      className="text-text-secondary hover:text-text-primary flex items-center gap-1"
                    >
                      {creator.is_admin ? (
                        <span className="text-[#F97316] flex items-center gap-1 bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <Shield className="size-3.5" /> ADMIN
                        </span>
                      ) : (
                        <span className="text-zinc-650 font-mono text-[11px] hover:underline">Assign Admin</span>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono",
                      creator.is_suspended 
                        ? "bg-red-500/10 border-red-500/20 text-red-500" 
                        : "bg-green-500/10 border-green-500/20 text-green-500"
                    )}>
                      {creator.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono">
                    <button type="button" aria-label="button" 
                      onClick={() => handleSuspendCreator(creator.id, !creator.is_suspended)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ml-auto",
                        creator.is_suspended 
                          ? "bg-green-500/15 text-green-500 border border-green-500/20 hover:bg-green-500/25"
                          : "bg-red-500/15 text-red-500 border border-red-500/20 hover:bg-red-500/25"
                      )}
                    >
                      <Ban className="size-3.5" />
                      {creator.is_suspended ? 'Unsuspend' : 'Suspend User'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary bg-[#121214]">
                    No profiles loaded matching selection parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
