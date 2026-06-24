import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 font-sans pb-16 pt-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-x-2 text-zinc-400 hover:text-white mb-8 transition-colors group text-sm"
        >
          <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Title */}
        <div className="flex items-center gap-x-3 mb-6">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
            <Shield className="size-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
            <p className="text-zinc-500 text-xs mt-1">Last Updated: June 24, 2026</p>
          </div>
        </div>

        {/* Introduction Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4">
            <Lock className="size-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">Encryption</h3>
            <p className="text-zinc-400 text-xs mt-1">Secure transport layers and state-of-the-art bcrypt-12 hashing protect your credentials.</p>
          </div>
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4">
            <Eye className="size-5 text-blue-400 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">Transparency</h3>
            <p className="text-zinc-400 text-xs mt-1">We do not sell your personal behavior records or search entries to brokers.</p>
          </div>
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4">
            <FileText className="size-5 text-purple-400 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">Your Rights</h3>
            <p className="text-zinc-400 text-xs mt-1">Delete or download your stored video records and collection files at any time.</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">1.</span> Information We Collect
            </h2>
            <p className="mb-3">
              We collect information that you actively input when registering for an account or updating your public profile:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 pl-2">
              <li><strong>Account Credentials:</strong> Email addresses and securely hashed password records.</li>
              <li><strong>Profile Metrics:</strong> Custom display names, optional avatars, and user biography information.</li>
              <li><strong>Interactive Metadata:</strong> Saved bookmarks, dynamic collections, and creator statistics.</li>
            </ul>
          </section>

          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">2.</span> How We Protect Your Data
            </h2>
            <p className="mb-2">
              Security is built directly into our platform architecture. All web data transfers execute strictly over encrypted HTTPS protocols. Password credentials are converted using deterministic cryptography on the server-side, then layered with an enterprise bcrypt salt (cost factor 12) before being written to persistent storage.
            </p>
            <p className="text-zinc-400">
              This double-envelope hashing mechanism ensures that raw, plaintext credentials never reside in the datastore, fully mitigating raw credential leakage.
            </p>
          </section>

          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">3.</span> Cookies and Persistent Sessions
            </h2>
            <p className="mb-2">
              We utilize secure cookies and client storage configurations to maintain persistent sessions, remember custom configurations, and deliver custom content structures. You can review and personalize cookie preferences through our dedicated Cookie Banner settings menu.
            </p>
          </section>

          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">4.</span> Compliance and Legal Mandates
            </h2>
            <p className="mb-2">
              This policy is designed to comply with local internet privacy guidelines and general web accessibility requirements. If you have any inquiries regarding data deletion pipelines or account controls, please contact our support desk.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
