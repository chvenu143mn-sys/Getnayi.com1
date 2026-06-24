import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0c0c0e] min-h-full text-white pb-20">
      <div className="sticky top-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </div>

      <div className="px-5 py-8 max-w-3xl mx-auto space-y-8 font-sans">
        <section>
          <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Welcome to GetNayi ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at getnayi.com or use our mobile applications.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            We may collect personal information that you voluntarily provide to us when you register on the App, including:
          </p>
          <ul className="list-disc pl-5 text-zinc-400 text-sm leading-relaxed space-y-2">
            <li><strong>Personal Data:</strong> Email address, username, and profile data you choose to provide.</li>
            <li><strong>Usage Data:</strong> Information on how you interact with our service, including IP address, browser type, device identifiers, and analytics events (such as views, clicks, and session lengths).</li>
            <li><strong>Content:</strong> Videos, images, and text you upload or submit through our platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-zinc-400 text-sm leading-relaxed space-y-2">
            <li>To provide, operate, and maintain our application.</li>
            <li>To process your transactions and manage your account.</li>
            <li>To improve, personalize, and expand our application.</li>
            <li>To communicate with you, including for customer service, updates, and other information relating to the app.</li>
            <li>To monitor and analyze usage and trends to improve your experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. How We Share Your Information</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            We do not sell your personal data. We may share your information with third-party vendors, service providers, contractors, or agents who perform services for us:
          </p>
          <ul className="list-disc pl-5 text-zinc-400 text-sm leading-relaxed space-y-2">
            <li><strong>Payment Processors:</strong> We use Razorpay to securely process payments. We do not store your full payment card details.</li>
            <li><strong>Hosting and Infrastructure:</strong> Our services are hosted on reliable cloud providers (e.g., Google Cloud, Supabase, Bunny.net) to store data securely.</li>
            <li><strong>Analytics:</strong> We use analytics providers to help us understand app usage and improve performance.</li>
            <li><strong>Legal Requirements:</strong> We may disclose your information where legally required to do so in order to comply with applicable law or legal requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Data Retention</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We will only retain your personal information for as long as necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies. You can request deletion of your data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Your Data Rights</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Depending on your location (e.g., under GDPR for EU residents, or CCPA for California residents), you have certain rights regarding your personal data:
          </p>
          <ul className="list-disc pl-5 text-zinc-400 text-sm leading-relaxed space-y-2 mt-3">
            <li><strong>Right to Access:</strong> You can request copies of your personal data.</li>
            <li><strong>Right to Rectification:</strong> You can request that we correct inaccurate information.</li>
            <li><strong>Right to Erasure/Deletion:</strong> You can request that we erase your personal data under certain conditions.</li>
            <li><strong>Right to Data Portability:</strong> You can request an export of your data in a structured, machine-readable format.</li>
          </ul>
          <p className="text-zinc-400 text-sm leading-relaxed mt-3">
            To exercise these rights, please contact us at privacy@getnayi.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Contact Us</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            If you have questions or comments about this Privacy Policy, please contact us at:<br/><br/>
            <strong>GetNayi</strong><br/>
            Email: privacy@getnayi.com
          </p>
        </section>
      </div>
    </div>
  );
}
