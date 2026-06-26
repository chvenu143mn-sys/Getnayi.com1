import React, { useState } from 'react';
import { Link2, Search, Filter, ShieldCheck, Trash2, Eye, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseVideoProduct } from '../../utils/videoUtils';

interface AdminProductLinksProps {
  products: any[];
  handleVerifyProduct_direct: (videoId: string, isVerified: boolean) => Promise<void>;
  handleViewVideo: (video: any) => void;
}

export default function AdminProductLinks({
  products,
  handleVerifyProduct_direct,
  handleViewVideo,
}: AdminProductLinksProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');

  const matchesFilter = (p: any) => {
    const matchesSearch = 
      (parseVideoProduct(p.caption).captionText || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.product_url || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.username || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesDomain = domainFilter === 'all' || p.domain === domainFilter;
    return matchesSearch && matchesDomain;
  };

  const filtered = products.filter(matchesFilter);

  // Extract unique domains for dropdown
  const uniqueDomains = Array.from(new Set(products.map(p => p.domain))).filter(Boolean);

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Affiliate Product Links</h1>
        <p className="text-zinc-400 text-xs mt-1">Audit out-bound store domains, check trust parameters, and issue verified badges.</p>
      </div>

      {/* Domain stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-[10px] font-mono tracking-wider uppercase">Active Product Links</p>
            <p className="text-xl font-bold text-white mt-1">{products.length}</p>
          </div>
          <Link2 className="size-8 text-zinc-650" />
        </div>
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-[10px] font-mono tracking-wider uppercase">Verified Listings</p>
            <p className="text-xl font-bold text-white mt-1">
              {products.filter(p => p.is_verified).length}
            </p>
          </div>
          <ShieldCheck className="size-8 text-green-500/20" />
        </div>
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-[10px] font-mono tracking-wider uppercase">Unverified Listings</p>
            <p className="text-xl font-bold text-white mt-1">
              {products.filter(p => !p.is_verified).length}
            </p>
          </div>
          <div className="size-2 rounded-full bg-yellow-500 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products by brand, tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141416]/90 border border-white/5 focus:border-white/15 focus:ring-1 focus:ring-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-zinc-400" />
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#141416]/90 border border-white/5 focus:border-white/15 rounded-xl text-sm text-zinc-300 focus:outline-none"
          >
            <option value="all">All Domains Whitelist</option>
            {uniqueDomains.map(dom => (
              <option key={dom} value={dom}>{dom}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end">
          <span className="text-zinc-400 text-xs font-mono">
            {filtered.length} listings identified
          </span>
        </div>
      </div>

      {/* Main Grid table */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181a] border-b border-white/5 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-5 font-semibold">Store Destination / Domain</th>
                <th className="py-4 px-5 font-semibold">Creator Account</th>
                <th className="py-4 px-5 font-semibold">Classification Domain</th>
                <th className="py-4 px-5 font-semibold">Trust Index</th>
                <th className="py-4 px-5 font-semibold text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-4 px-5">
                    <div className="flex flex-col justify-start">
                      <a
                        href={prod.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-[#F97316] font-semibold text-[13px] flex items-center gap-1.5 hover:underline"
                      >
                        <span className="truncate max-w-[250px]">{prod.product_url}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                      </a>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate max-w-[250px]">{parseVideoProduct(prod.caption).captionText || 'Product listing'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-zinc-33">@{prod.username}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-mono text-[11px] text-zinc-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                      {prod.domain}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={cn(
                      "font-mono px-2 py-0.5 border text-[11px] font-semibold rounded-full",
                      prod.trust_score < 75 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
                    )}>
                      {prod.trust_score}%
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono flex justify-end gap-2 pr-5 mt-2">
                    <button type="button" aria-label="button" 
                      onClick={() => handleViewVideo({ id: prod.video_id, caption: prod.caption })}
                      className="px-2.5 py-1.5 bg-[#0c0c0e]/45 border border-white/5 text-zinc-400 hover:text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold hover:border-white/10"
                    >
                      <Eye className="size-3.5" /> Inspect
                    </button>
                    <button type="button" aria-label="button" 
                      onClick={() => handleVerifyProduct_direct(prod.video_id, !prod.is_verified)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1",
                        prod.is_verified
                          ? "bg-green-500/15 text-green-500 border border-green-500/20 hover:bg-green-500/25"
                          : "bg-white/5 text-zinc-300 border border-white/5 hover:bg-white/10"
                      )}
                    >
                      {prod.is_verified ? '✓ Verified' : 'Grant Verification'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 bg-[#121214]">
                    No associated affiliate links match selection parameters.
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
