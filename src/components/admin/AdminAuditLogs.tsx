import React, { useState } from 'react';
import { Search, ShieldAlert, Database, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminAuditLogsProps {
  auditLogs: any[];
}

export default function AdminAuditLogs({ auditLogs }: AdminAuditLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = auditLogs.filter(log => {
    const stringData = `${log.action || ''} ${log.target_type || ''} ${log.target_id || ''} ${log.profiles?.username || ''} ${JSON.stringify(log.details || {})}`.toLowerCase();
    return stringData.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Operator Audit Trails & Logs</h1>
        <p className="text-zinc-500 text-xs mt-1">Immutable security ledger capturing administrative modifications, status adjustments, and domains synchronization events.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Filtering ledger fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#141416]/90 border border-white/5 focus:border-white/15 focus:ring-1 focus:ring-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
        />
      </div>

      {/* Main ledger table */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181a] border-b border-white/5 text-zinc-500 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-5 font-semibold">Event Timestamp</th>
                <th className="py-4 px-5 font-semibold">Moderator / Admin</th>
                <th className="py-4 px-5 font-semibold">Action Descriptor</th>
                <th className="py-4 px-5 font-semibold">Target Object</th>
                <th className="py-4 px-5 font-semibold">Delta Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.01] transition-all text-zinc-400">
                  <td className="py-4 px-5 text-white font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="size-3.5 text-zinc-600" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-semibold text-zinc-300">
                    <span>@{log.profiles?.username || 'admin_operator'}</span>
                  </td>
                  <td className="py-4 px-5 text-white">
                    <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono text-[11px] uppercase tracking-wider text-[#F97316]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-mono text-[11px]">
                    <span>{log.target_type} ({log.target_id?.substring(0,8)})</span>
                  </td>
                  <td className="py-4 px-5">
                    <pre className="text-[10px] font-mono p-2 bg-[#0c0c0e]/45 border border-white/5 rounded-xl text-zinc-550 max-w-[250px] overflow-x-auto leading-relaxed">
                      {JSON.stringify(log.details || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 bg-[#121214]">
                    No diagnostic audit entries located.
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
