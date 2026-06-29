import React from 'react';
import { Shield, Lock, Eye, FileText, ChevronLeft, Trash2, Key, Database, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans pb-16 pt-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-x-2 text-text-secondary hover:text-text-primary mb-8 transition-colors group text-sm"
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
            <h1 className="text-brand-primaryxl font-bold tracking-tight text-text-primary">Privacy Policy</h1>
            <p className="text-text-secondary text-xs mt-1">Last Updated: June 24, 2026</p>
          </div>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#121214] border border-border-subtle rounded-2xl p-4">
            <Lock className="size-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-text-primary">Bcrypt-12 Salted</h3>
            <p className="text-text-secondary text-xs mt-1">Your password credentials are hashed on our server backend using deterministic salt parameters.</p>
          </div>
          <div className="bg-[#121214] border border-border-subtle rounded-2xl p-4">
            <Eye className="size-5 text-blue-400 mb-2" />
            <h3 className="text-sm font-semibold text-text-primary">No Broker Selling</h3>
            <p className="text-text-secondary text-xs mt-1">We do not sell personal profile data, watch metrics, or search records to advertisement networks.</p>
          </div>
          <div className="bg-[#121214] border border-border-subtle rounded-2xl p-4">
            <FileText className="size-5 text-purple-400 mb-2" />
            <h3 className="text-sm font-semibold text-text-primary">Data Control</h3>
            <p className="text-text-secondary text-xs mt-1">Request a complete JSON schema dump of your profile content or request account deletion instantly.</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-text-primary text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="bg-[#121214] border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">1.</span> Personal Data We Collect
            </h2>
            <p className="mb-3">
              GetNayi (owned and operated by Getnayi, based in the United States) values your trust. When you use our application to discover and browse creator items, we gather specific categories of information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary pl-2 mb-4">
              <li><strong>Account Credentials:</strong> Email addresses and securely hashed password records collected during signup.</li>
              <li><strong>Profile Metrics:</strong> Custom display names, bio descriptions, social links, and optional profile avatars.</li>
              <li><strong>Device & Interaction Logs:</strong> IP addresses, browser user-agent profiles, operating system indicators, page navigation behaviors, and video playback engagement metrics.</li>
              <li><strong>Dynamic Settings:</strong> Bookmarked videos, curated shopping collections, and dark/light mode preference states.</li>
            </ul>
            <p className="text-text-secondary text-xs">
              Note: We do not collect or view your raw password keys; these are processed securely before persistent storage.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-[#121214] border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">2.</span> Why We Collect Your Information
            </h2>
            <p className="mb-3">
              Getnayi utilizes your gathered information to power, protect, and optimize GetNayi services under the following lawful bases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary pl-2">
              <li><strong>Service Execution:</strong> Registering your account, authenticating sessions, loading custom video feeds, and managing your bookmark collections.</li>
              <li><strong>Product Optimization:</strong> Evaluating user retention, identifying system bottlenecks, enhancing video player latency, and troubleshooting responsive features.</li>
              <li><strong>Fraud Protection & Security:</strong> Thwarting malicious bot crawls, monitoring secure login attempts, and implementing security rate-limiting.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-[#121214] border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">3.</span> Who We Share Your Data With
            </h2>
            <p className="mb-3">
              We never sell your behavioral analytics or profile data to brokers or third-party advertisers. We only share specific data structures with highly secure, industry-standard service providers who operate strictly as processors:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary pl-2">
              <li><strong>Razorpay:</strong> Payment credentials and subscription billing data are processed directly through Razorpay's certified PCI-compliant gateway. GetNayi never holds or stores raw credit card details on our servers.</li>
              <li><strong>Google Cloud & Firebase / Database:</strong> Secure cloud storage facilities host our user-generated metadata, video collections, and system log systems securely.</li>
              <li><strong>Google Analytics / Tag Manager:</strong> Tracks anonymized viewport interactions, screen usage lengths, and performance errors. All user IP addresses passed to Google Analytics are heavily anonymized to shield your identity.</li>
              <li><strong>Google OAuth Services:</strong> Facilitates standard single sign-on access parameters without storing external profile passwords.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#121214] border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">4.</span> Hashing & In-Depth Protection
            </h2>
            <p className="mb-2">
              To defend your accounts, GetNayi employs solid, server-side cryptographic conversion. Raw text passwords undergo a salt layering process on the backend utilizing the standard bcrypt-12 formula.
            </p>
            <p className="text-text-secondary">
              This completely eliminates plaintext password occurrences in our relational storage systems. In the event of a raw database breach, your actual passphrase remains secure against standard lookup-table exploits. Furthermore, all active connections enforce standard TLS/HTTPS encryption to secure information during transport.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#121214] border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">5.</span> Data Retention Durations
            </h2>
            <p className="mb-3">
              We retain information only as long as necessary to fulfill the specific purposes outlined in this policy:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary pl-2">
              <li><strong>Account Metadata:</strong> Stored permanently while your account remains active.</li>
              <li><strong>Interaction & Device Metrics:</strong> Auto-purged from Google Analytics records after 14 months of storage.</li>
              <li><strong>Accounting and Payment Records:</strong> Stored for up to 7 years to meet strict local tax and auditing mandates.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="bg-[#121214] border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-x-2">
              <span className="text-blue-500">6.</span> Your Rights, Deletion, and Data Export
            </h2>
            <p className="mb-4">
              Regardless of your physical location, GetNayi supports complete transparency and individual control under GDPR and CCPA rules:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-surface-1/50 rounded-xl border border-border-subtle">
                <h4 className="text-text-primary font-semibold text-xs mb-1 flex items-center gap-x-1.5">
                  <Database className="size-3.5 text-blue-400" /> Export Personal Records
                </h4>
                <p className="text-text-secondary text-[11px] leading-normal">
                  You can request a comprehensive copy of all your profile content, saved collections, and registered statistics.
                </p>
              </div>
              <div className="p-4 bg-surface-1/50 rounded-xl border border-border-subtle">
                <h4 className="text-text-primary font-semibold text-xs mb-1 flex items-center gap-x-1.5">
                  <Trash2 className="size-3.5 text-red-400" /> Complete Account Deletion
                </h4>
                <p className="text-text-secondary text-[11px] leading-normal">
                  You have the absolute right to purge your entire account, social links, custom bio, and video bookmarks.
                </p>
              </div>
            </div>

            <p className="mb-2">
              To trigger an export of your information or request a complete, irreversible account purge from our active servers, send a direct email request to our support desk:
            </p>
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl font-mono text-center font-bold text-xs">
              chvenu143mn@gmail.com
            </div>
            <p className="mt-2 text-text-secondary text-xs">
              We process all verified GDPR and CCPA data removal requests within 30 days of reception.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
