import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0c0c0e] min-h-full text-white pb-20">
      <div className="sticky top-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Terms of Service</h1>
      </div>

      <div className="px-5 py-8 max-w-3xl mx-auto space-y-8 font-sans">
        <section>
          <h2 className="text-xl font-bold mb-3">1. Agreement to Terms</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            These Terms of Service ("Terms") constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and GetNayi ("we," "us," or "our"), concerning your access to and use of the getnayi.com website as well as any other media form, media channel, mobile website, or mobile application related, linked, or otherwise connected thereto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Acceptable Use</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            You may not access or use the application for any purpose other than that for which we make the application available. As a user, you agree not to:
          </p>
          <ul className="list-disc pl-5 text-zinc-400 text-sm leading-relaxed space-y-2">
            <li>Systematically retrieve data or other content from the application to create or compile a collection, compilation, database, or directory without written permission from us.</li>
            <li>Trick, defraud, or mislead us and other users.</li>
            <li>Circumvent, disable, or otherwise interfere with security-related features of the application.</li>
            <li>Upload or transmit viruses, Trojan horses, or other material that interferes with any party’s uninterrupted use and enjoyment of the application.</li>
            <li>Use the application to advertise or offer to sell unauthorized goods and services.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Intellectual Property Rights</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Unless otherwise indicated, the application is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the application (collectively, the "Content") and the trademarks, service marks, and logos contained therein are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights. You retain ownership of the content you upload to the platform, but you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, display, and distribute your content in connection with operating and providing the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Payments and Refunds</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We use Razorpay to process payments. If you purchase a subscription or any premium features, you agree to provide current, complete, and accurate purchase and account information. You agree to pay all charges at the prices then in effect for your purchases, and you authorize us to charge your chosen payment provider. Subscriptions automatically renew unless canceled. Refunds are issued solely at our discretion or as required by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Limitations of Liability</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the application, even if we have been advised of the possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Governing Law</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            These Terms shall be governed by and defined following the laws of India. GetNayi and yourself irrevocably consent that the courts of India shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Contact Information</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            For questions or concerns regarding these Terms, please contact us at:<br/><br/>
            <strong>GetNayi</strong><br/>
            Email: legal@getnayi.com
          </p>
        </section>
      </div>
    </div>
  );
}
