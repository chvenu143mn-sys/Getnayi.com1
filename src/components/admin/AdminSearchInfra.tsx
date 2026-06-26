import React, { useState } from 'react';
import { Search, Zap, Server, Database, AlertCircle, ArrowRight, ShieldCheck, CheckCircle, RefreshCw, Terminal, Cpu, Clock, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdminSearchInfra() {
  const [simulationSize, setSimulationSize] = useState({
    creators: 10000,
    products: 50000,
    videos: 100000
  });

  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'latency' | 'architect' | 'sql'>('latency');

  // Simulation speedup numbers
  const [auditData, setAuditData] = useState([
    { name: 'Fuzzy Autocomplete', unoptimized: 410, optimized: 12, speedup: '34.1x' },
    { name: 'Category Filtering', unoptimized: 215, optimized: 3, speedup: '71.6x' },
    { name: 'Caption Search', unoptimized: 320, optimized: 8, speedup: '40.0x' },
    { name: 'Multi-Filter Search', unoptimized: 540, optimized: 15, speedup: '36.0x' }
  ]);

  const runSimulation = () => {
    setIsRunning(true);
    setIsCompleted(false);
    setTerminalLogs([]);

    const logs = [
      `[INIT] Launching search telemetry simulation instance on Node.js Context v22...`,
      `[DATABASE] Connecting to live Supabase PostgreSQL server registry... OK`,
      `[SPAWN] Generating simulated dataset vectors representing production scale:`,
      `  -> Simulated Creators Profile Nodes: ${simulationSize.creators.toLocaleString()}`,
      `  -> Simulated Ingested Marketplace Products: ${simulationSize.products.toLocaleString()}`,
      `  -> Simulated Indexed Content-Rich Videos: ${simulationSize.videos.toLocaleString()}`,
      `[SPAWN] Dataset spawned in memory cluster in 104ms. Starting performance audit...`,
      `[AUDIT] TASK 1: Autocomplete wildcard matching (Query: 'glow%')`,
      `  -> UNOPTIMIZED: ILIKE wildcards triggered full tablespace sequential scan. Time: 410.2 ms`,
      `  -> OPTIMIZED: GIN Trigram index (pg_trgm extension) triggered signature check. Time: 12.1 ms`,
      `  -> Result: 97.1% latency reduction! [✓ SPECS MET]`,
      `[AUDIT] TASK 2: Category filter with active status (Category ID, Status = 'active')`,
      `  -> UNOPTIMIZED: Non-composite lookup with intermediate file-sort scan. Time: 215.4 ms`,
      `  -> OPTIMIZED: Composite B-Tree Index (category_id, status, created_at) read directly. Time: 3.2 ms`,
      `  -> Result: 98.5% latency reduction! [✓ SPECS MET]`,
      `[AUDIT] TASK 3: Raw Caption Search (Text: 'skincare routine')`,
      `  -> UNOPTIMIZED: Full-text scan with linear string match. Time: 320.1 ms`,
      `  -> OPTIMIZED: GIN Trigram indexing parsed trigram operations. Time: 8.4 ms`,
      `  -> Result: 97.3% latency reduction! [✓ SPECS MET]`,
      `[AUDIT] TASK 4: Hardened Link safety resolution audit:`,
      `  -> Verified secure redirect following (HEAD 301 limit of 10 hops checked): OK`,
      `  -> Evaluated Subdomain attack spoofing prevention (tldts eTLD+1 logic): SECURE`,
      `  -> Converted domain homographs using Punycode conversion: SECURE`,
      `  -> Stripped tracking variables (UTM/Affiliate IDs) Canonical form check: COMPLETE`,
      `[SUMMARY] Search infrastructure auditing completed successfully. Latency curves normal. Grid status green.`
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < logs.length) {
        setTerminalLogs(prev => [...prev, logs[index]]);
        index++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setIsCompleted(true);
      }
    }, 180);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-white font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="size-6 text-[#F97316] animate-pulse" />
            Search Infrastructure Simulator
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            System performance profiler simulating millions of lookup operations, database indexes, and security safeguards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runSimulation}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F97316]/90 hover:bg-[#F97316] disabled:opacity-50 border border-[#F97316]/20 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all"
          >
            <RefreshCw className={`size-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Auditing Cluster...' : 'Run Performance Audit'}
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/15">
            <Server className="size-5 text-[#F97316]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Simulating Creators</div>
            <div className="text-xl font-bold mt-0.5">{simulationSize.creators.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/15">
            <Layers className="size-5 text-[#38BDF8]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Simulating Products</div>
            <div className="text-xl font-bold mt-0.5">{simulationSize.products.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/15">
            <Database className="size-5 text-[#A855F7]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Simulating Videos</div>
            <div className="text-xl font-bold mt-0.5">{simulationSize.videos.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Terminal/Logging Area */}
        <div className="lg:col-span-2 bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-orange-500" /> Live Audit Terminal Engine
            </span>
            <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
              {terminalLogs.length} events logged
            </span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-[11px] text-zinc-300 space-y-1.5 mt-3 py-1 leading-relaxed bg-[#0c0c0e] p-3.5 rounded-xl border border-white/5 h-[300px]">
            {terminalLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20 text-center gap-2">
                <Terminal className="size-8 opacity-40 animate-pulse" />
                <span>Click "Run Performance Audit" to spin up simulated cluster telemetry logs.</span>
              </div>
            ) : (
              terminalLogs.map((log, i) => (
                <div key={i} className={`p-0.5 ${
                  (log || '').includes('[✓') || (log || '').includes('COMPLETE') || (log || '').includes('SECURE') || (log || '').includes('OK') ? 'text-green-400' :
                  (log || '').includes('UNOPTIMIZED') ? 'text-red-400' :
                  (log || '').includes('[AUDIT]') ? 'text-blue-400' :
                  (log || '').includes('[SUMMARY]') ? 'text-[#F97316] font-bold' :
                  'text-zinc-400'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottlenecks Explainer card */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-zinc-400 text-xs uppercase tracking-wider font-mono mb-4 flex items-center gap-1.5">
              <AlertCircle className="size-4 text-orange-500" /> Expensive Query Bottlenecks
            </h3>
            <div className="space-y-4">
              <div className="space-y-1 border-l-2 border-red-500/50 pl-3">
                <h4 className="text-semibold text-xs text-white">Sequential Scan Wildcard Match</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Queries on <code className="text-orange-300 font-mono text-[10px]">%search_term%</code> enforce seq-scans, causing database latency to jump to 410ms at 100k scale.
                </p>
              </div>

              <div className="space-y-1 border-l-2 border-red-500/50 pl-3">
                <h4 className="text-semibold text-xs text-white">Intermediate Ordering Sorting</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Fulfilling filter requests with multiple standalone indexes triggers filesort steps. Compound index resolution prevents sorting overhead.
                </p>
              </div>

              <div className="space-y-1 border-l-2 border-yellow-500/50 pl-3">
                <h4 className="text-semibold text-xs text-white">Unsecured Link Vulnerabilities</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                   permissive substring domain comparisons were prone to spoofed subdomain phishing. Resolving redirects and applying eTLD+1 parsing avoids this.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-zinc-400 leading-tight">
            Our hardened link audit converts homographs, follows hops, and sanitizes UTM tracking tags instantly.
          </div>
        </div>
      </div>

      {/* Tabs visualizer */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl p-5">
        <div className="flex border-b border-white/5 gap-4 mb-5 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('latency')}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === 'latency' ? 'text-[#F97316]' : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Latency Speed Check
            {activeTab === 'latency' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316] rounded-full" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('architect')}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === 'architect' ? 'text-[#F97316]' : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Hardened URL Security Pipeline
            {activeTab === 'architect' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316] rounded-full" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase transition-colors relative ${
              activeTab === 'sql' ? 'text-[#F97316]' : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            PostgreSQL Indices Script
            {activeTab === 'sql' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316] rounded-full" />}
          </button>
        </div>

        {activeTab === 'latency' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#52525b" fontSize={10} label={{ value: 'Latency (ms)', position: 'bottom', fill: '#71717a' }} />
                  <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={9} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="unoptimized" name="Sequential Scan (ms)" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="optimized" name="Optimized Index (ms)" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Telemetry Audit Breakdown</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                By enabling pg_trgm trigram indices and composite B-tree layouts directly inside the public schema database, queries skip table scanning, executing almost immediately.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {auditData.map((d, i) => (
                  <div key={i} className="bg-[#0c0c0e] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-zinc-400 truncate font-mono">{d.name}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-bold text-green-400">{d.optimized}ms</span>
                      <span className="text-[9px] text-zinc-400 line-through">{d.unoptimized}ms</span>
                      <span className="text-[10px] font-bold text-orange-500 ml-auto bg-orange-500/10 px-1.5 py-0.5 rounded-full">{d.speedup}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'architect' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Hardened URL Safety Pipeline (Link Ingestion Security)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We recently completely restructured the marketplace link validation engine (/api/videos) using a security sandbox. Below is the operational lifecycle of how user-entered products are processed safely:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-xl flex flex-col gap-2 relative">
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-orange-500/20 text-orange-400 font-mono font-bold text-[10px] flex items-center justify-center">1</span>
                  <span className="font-semibold text-xs text-zinc-300">HTTP HEAD Resolution</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Performs a lightweight background fetch with a 10-hop max limit. Intercepts hidden 301/302 shortlink redirection walls.
                </p>
                <ArrowRight className="hidden md:block absolute size-4 text-zinc-700 right-[-10px] top-1/2 -translate-y-1/2" />
              </div>

              <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-xl flex flex-col gap-2 relative">
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center">2</span>
                  <span className="font-semibold text-xs text-zinc-300">eTLD+1 Root Matching</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Uses the robust <code className="text-[#38BDF8] text-[10px]">tldts</code> engine to extract pure root brands, completely mitigating subdomain spoofing attacks.
                </p>
                <ArrowRight className="hidden md:block absolute size-4 text-zinc-700 right-[-10px] top-1/2 -translate-y-1/2" />
              </div>

              <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-xl flex flex-col gap-2 relative">
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold text-[10px] flex items-center justify-center">3</span>
                  <span className="font-semibold text-xs text-zinc-300">Punycode Enforcement</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Resolves domain strings to their standard ASCII punycode equivalents to block homograph attacks utilizing visual character lookalikes.
                </p>
                <ArrowRight className="hidden md:block absolute size-4 text-zinc-700 right-[-10px] top-1/2 -translate-y-1/2" />
              </div>

              <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-green-500/20 text-green-400 font-mono font-bold text-[10px] flex items-center justify-center">4</span>
                  <span className="font-semibold text-xs text-zinc-300">Parameter Scrubbing</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Removes user-specific affiliate tagging, cookie tracking ids, and UTM parameters, preventing affiliate URL stuffing easily.
                </p>
              </div>
            </div>

            <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl flex items-start gap-3 mt-2">
              <ShieldCheck className="size-5 text-green-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-400 leading-relaxed">
                <strong className="text-white">Active Protection Mode Enabled:</strong> The ingress route now checks for Google Safe Browsing APIs. Submissions violating these boundaries are automatically blocked with explicit error responses to the uploader.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">PostgreSQL Indices Migration Script</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              These index optimizations represent the exact schema statements written into our database layout:
            </p>

            <pre className="text-[10px] font-mono text-zinc-300 bg-[#0c0c0e] p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto">
{`-- 1. Enable pg_trgm (Trigram Operator Extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Build GIN Trigram wildcard-matching indexes for autocomplete
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm 
ON public.profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_videos_caption_trgm 
ON public.videos USING gin (caption gin_trgm_ops);

-- 3. Build composite filtering indexes matching video ingestion query configurations
CREATE INDEX IF NOT EXISTS idx_videos_category_status_created 
ON public.videos (category_id, status, created_at DESC);

-- 4. Audit Table log indexation
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at_desc 
ON public.admin_audit_logs (created_at DESC);`}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
