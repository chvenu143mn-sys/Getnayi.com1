import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const faqs = [
  {
    question: "How does the upload limit work on the Free plan?",
    answer: "Free plan users can upload up to 3 videos every 12 hours once their accounts pass manual verification. This ensures a high quality feed while giving you a chance to share your content."
  },
  {
    question: "Do I need to wait for verification on the Pro plan?",
    answer: "No! Pro users receive instant auto-approval. You bypass the manual verification queue completely and can start uploading your videos immediately after subscribing."
  },
  {
    question: "What does 'Priority exposure' mean?",
    answer: "The algorithm pushes videos from Pro and Creator accounts to the Trending feed more frequently. This usually results in significantly higher initial views and engagement compared to standard posts."
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer: "Absolutely. You can manage and cancel your subscription directly from your settings. You'll retain access to your premium features until the end of your current billing cycle."
  },
];

export function SubscriptionFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4 text-white">Frequently Asked Questions</h2>
        <p className="text-zinc-400">Everything you need to know about the product and billing.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="border border-zinc-800 rounded-2xl overflow-hidden bg-[#121214] transition-all duration-200">
            <button
              onClick={() => toggleOpen(index)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="font-medium text-zinc-100">{faq.question}</span>
              <ChevronDown 
                className={cn(
                  "size-5 text-zinc-400 transition-transform duration-200", 
                  openIndex === index ? "rotate-180 text-white" : ""
                )} 
              />
            </button>
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out px-6",
                openIndex === index ? "max-h-48 pb-6 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <p className="text-zinc-400 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
