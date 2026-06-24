import React from 'react';
import { FileText, ShieldAlert, Scale, Info, ChevronLeft, CreditCard, AlertCircle } from 'lucide-react';
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex flex-col gap-y-2">
            <Info className="size-5 text-purple-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">User Conduct</h3>
              <p className="text-zinc-400 text-xs mt-1">All members must respect copyright standards and refrain from abusive crawling behaviors.</p>
            </div>
          </div>
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex flex-col gap-y-2">
            <ShieldAlert className="size-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Account Security</h3>
              <p className="text-zinc-400 text-xs mt-1">You are solely responsible for guarding your login credentials and salted password records.</p>
            </div>
          </div>
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex flex-col gap-y-2">
            <CreditCard className="size-5 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Stripe Billing</h3>
              <p className="text-zinc-400 text-xs mt-1">All payments, pricing adjustments, and cancelations are managed securely by Stripe.</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">1.</span> Agreement to Terms
            </h2>
            <p className="mb-2">
              Welcome to GetNayi ("the App", "the Service"). GetNayi is owned and operated by Aisles Platform, a registered business in the United States. By registering an account, purchasing premium collection tiers, or simply accessing any services within GetNayi, you explicitly agree to comply with and be bound by these Terms of Service.
            </p>
            <p>
              If you do not accept these provisions, you must immediately terminate your access to the App and stop using our services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">2.</span> Account Credentials & Safety
            </h2>
            <p className="mb-2">
              When registering for an account, you must provide accurate, active, and complete credential information. You represent and warrant that your profile is not registered using automated bots, crawlers, or spoofed email records.
            </p>
            <p className="mb-2 text-zinc-400">
              We employ military-grade server-side encryption and standard bcrypt-12 hashing to safeguard authentication tokens. However, you are solely responsible for protecting your password and preventing unauthorized local or device level breaches.
            </p>
            <p className="text-zinc-400">
              Aisles Platform will not be liable for any losses caused by credentials shared with or compromised by external actors.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">3.</span> Permitted Uses & Asset Protection
            </h2>
            <p className="mb-2">
              GetNayi is designed to allow members to discover real products through content creators. You are permitted to explore public catalogs, manage video libraries, and maintain custom item collections provided that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 pl-2">
              <li>No uploads, profile edits, or bookmarks contain malicious payloads, script tags, or virus files.</li>
              <li>No automated scrapers, web spiders, or data extraction utilities are deployed to harvest media assets in bulk.</li>
              <li>No intellectual property of other creators, developers, or Aisles Platform is cloned or published without clear written authorization.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">4.</span> Premium Tiers & Payments
            </h2>
            <p className="mb-2">
              Specific, highly curated collection tools and dashboard customizers inside GetNayi may require standard subscription payments. All transactional logic, invoices, and credit card processing are handled entirely by Stripe.
            </p>
            <p className="text-zinc-400">
              By initiating a premium tier purchase, you authorize Stripe to charge your nominated bank card. All pricing scales and refund thresholds are detailed in your checkout view. You can manage, update, or cancel active subscription tiers inside the settings menu.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">5.</span> Disclaimer of Warranties
            </h2>
            <p className="flex items-start gap-x-3 bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl text-zinc-400 text-xs">
              <AlertCircle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                THE SERVICES AND ALL PRODUCT DISCOVERY MEDIA ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. AISLES PLATFORM DISCLAIMS ALL WARRANTIES, BOTH EXPRESS AND IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, SECURITY CORRECTION, ACCURACY, AND PERFORMANCE STABILITY.
              </span>
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">6.</span> Limitation of Liability
            </h2>
            <p className="mb-2 text-zinc-400">
              IN NO EVENT SHALL AISLES PLATFORM, ITS DIRECTORS, OR ITS OUTSOURCED ASSOCIATES BE LIABLE FOR DIRECT, INDIRECT, CONSEQUENTIAL, OR SPECIAL DAMAGES (INCLUDING DATA CORRUPTION, PAYMENT CONTRADICTIONS, OR PROFIT LOSSES) ARISING FROM OR RELATED TO YOUR DEPENDENCY ON GETNAYI VIDEOS, UNENCRYPTED MOBILE STORAGE, OR SERVICE DOWNTIME.
            </p>
          </section>

          {/* Section 7 */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-x-2">
              <span className="text-purple-500">7.</span> Governance & Contact Info
            </h2>
            <p className="mb-3">
              These Terms of Service are governed and interpreted under the legislation of the United States. Any disputes arising here shall fall under the jurisdiction of those state courts.
            </p>
            <p className="mb-3">
              If you have any feedback or clarification requests regarding user code of conduct, Stripe transactions, or asset licenses, reach out directly to:
            </p>
            <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl font-mono text-center font-bold text-xs">
              chvenu143mn@gmail.com
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
