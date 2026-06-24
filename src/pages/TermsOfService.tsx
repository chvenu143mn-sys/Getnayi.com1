import React from 'react';
import { motion } from 'motion/react';
import { FileText, ShieldAlert, Scale, Info, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
            <Scale className="size-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
            <p className="text-zinc-500 text-xs mt-1">Last Updated: June 24, 2026</p>
          </div>
        </div>

        {/* General Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex gap-x-3 items-start">
            <Info className="size-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">User Conduct</h3>
              <p className="text-zinc-400 text-xs mt-1">All members must utilize standard media upload parameters and respect active copyrights.</p>
            </div>
          </div>
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex gap-x-3 items-start">
            <ShieldAlert className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Account Safety</h3>
              <p className="text-zinc-400 text-xs mt-1">You are responsible for keeping passwords private and sessions uncompromised.</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">1.</span> Agreement to Terms
            </h2>
            <p>
              By accessing and using this web application, you acknowledge and agree to be bound by these Terms of Service. If you do not consent to these rules, you must immediately terminate access to our services.
            </p>
          </section>

          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">2.</span> Account Registration & Credentials
            </h2>
            <p className="mb-2">
              To utilize certain features, you must complete registration and provide authentic credentials. You are solely responsible for protecting password keys.
            </p>
            <p className="text-zinc-400">
              We employ military-grade bcrypt-12 hashing on our server backend. However, you must refrain from sharing access details or reusing compromised third-party credentials.
            </p>
          </section>

          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">3.</span> Permitted Uses & Video Uploads
            </h2>
            <p className="mb-2">
              Users may upload media files, view creator content, and customize dashboard feeds provided that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 pl-2">
              <li>No uploads contain illegal, malicious, or abusive payloads.</li>
              <li>No crawlers or bots are used to harvest application assets in an abusive manner.</li>
              <li>All intellectual property and copyright rules are respected.</li>
            </ul>
          </section>

          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">4.</span> Limitation of Liability
            </h2>
            <p>
              Under no circumstances shall our team or platform be liable for indirect, incidental, or consequential damages resulting from user account breaches or unencrypted local data storage actions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
