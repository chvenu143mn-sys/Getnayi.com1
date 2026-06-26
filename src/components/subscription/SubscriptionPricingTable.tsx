import React from 'react';
import { Check, Zap, Star, ShieldCheck, Video, BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface SubscriptionPricingTableProps {
  currentPlan?: 'free' | 'pro' | 'creator';
  onSubscribePro?: (isYearly: boolean) => void;
  onSubscribeCreator?: (isYearly: boolean) => void;
  onSelectFree?: () => void;
  loading?: boolean;
  isFetching?: boolean;
}

export function SubscriptionPricingTable({
  currentPlan = 'free',
  onSubscribePro,
  onSubscribeCreator,
  onSelectFree,
  loading = false,
  isFetching = false,
}: SubscriptionPricingTableProps) {
  const [isYearly, setIsYearly] = React.useState(true);

  if (isFetching) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("rounded-3xl border border-zinc-800 bg-[#161618] p-8 shadow-sm flex flex-col h-full animate-pulse", i === 2 ? "lg:-translate-y-4 border-[#ff5a36]/30" : "")}>
              <div className="mb-6">
                <div className="h-6 w-24 bg-zinc-800 rounded-md mb-3"></div>
                <div className="h-4 w-full max-w-[200px] bg-zinc-800 rounded-md"></div>
                <div className="h-4 w-3/4 max-w-[150px] bg-zinc-800 rounded-md mt-1"></div>
              </div>
              <div className="mb-8">
                <div className="h-10 w-32 bg-zinc-800 rounded-md mb-2"></div>
                <div className="h-3 w-40 bg-zinc-800 rounded-md"></div>
              </div>
              <div className="flex-1 space-y-4 mb-8">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 mr-3 shrink-0"></div>
                    <div className="h-4 w-full bg-zinc-800 rounded-md"></div>
                  </div>
                ))}
              </div>
              <div className="h-14 w-full bg-zinc-800 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Billing Toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-[#1c1c1e] p-1.5 rounded-full border border-white/5 inline-flex relative shadow-lg">
          <button 
            type="button" 
            onClick={() => setIsYearly(false)}
            className={cn("relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300", !isYearly ? "text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            Monthly
          </button>
          <button 
            type="button" 
            onClick={() => setIsYearly(true)}
            className={cn("relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 flex items-center", isYearly ? "text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            Yearly
            <span className={cn("ml-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md", isYearly ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400")}>Save 20%</span>
          </button>
          <div className={cn("absolute inset-y-1.5 w-[calc(50%-6px)] bg-[#2c2c2e] rounded-full shadow-sm transition-all duration-300 ease-out", isYearly ? "left-[calc(50%+1px)]" : "left-1.5")} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Free Plan */}
        <div className="rounded-3xl border border-zinc-800 bg-[#161618] p-8 shadow-sm flex flex-col h-full relative">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">Free</h3>
            <p className="text-zinc-400 text-sm h-10">Perfect for discovering videos and simple curation.</p>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline">
              <span className="text-4xl font-extrabold text-white">₹0</span>
              <span className="text-zinc-400 ml-2 font-medium">/ forever</span>
            </div>
          </div>
          
          <div className="flex-1">
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm">Discover unlimited videos</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm">Save videos to collections</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm">Apply for manual verification to upload</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm">Upload limit: 3 videos / 12 hours (after verification)</span>
              </li>
            </ul>
          </div>
          
          <button
            onClick={onSelectFree}
            disabled={currentPlan === 'free'}
            className="w-full py-3.5 px-4 rounded-xl font-bold tracking-wide border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentPlan === 'free' ? 'Current Plan' : 'Get Started for Free'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="rounded-3xl bg-gradient-to-b from-[#1c1c1e] to-[#121214] border border-[#ff5a36]/50 p-8 relative shadow-[0_0_30px_rgba(239,41,80,0.15)] flex flex-col h-full transform lg:-translate-y-4">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ff5a36] to-transparent opacity-70"></div>
          <div className="absolute top-0 right-8 bg-[#ff5a36] text-white text-[11px] font-black px-4 py-1.5 rounded-b-lg uppercase tracking-widest shadow-lg shadow-[#ff5a36]/20">Most Popular</div>
          
          <div className="mb-6 mt-2">
            <h3 className="text-2xl font-bold flex items-center text-white mb-2">
              Pro <Zap className="h-5 w-5 ml-2 text-[#ff5a36]" fill="currentColor" />
            </h3>
            <p className="text-zinc-300 text-sm h-10">For serious creators who want to upload without limits.</p>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline mb-1">
              <span className="text-4xl font-extrabold text-white">{isYearly ? '₹499' : '₹599'}</span>
              <span className="text-zinc-400 ml-2 font-medium">/ month</span>
            </div>
            <p className="text-[13px] text-zinc-400 font-medium h-5">
              {isYearly ? 'Billed annually at ₹5,988' : 'Billed monthly'}
            </p>
          </div>
          
          <div className="flex-1">
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-[#ff5a36] shrink-0 mt-0.5" />
                <span className="text-white text-sm font-medium">Instant Auto-Approval for uploads</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-[#ff5a36] shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Unlimited video uploads</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-[#ff5a36] shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">No rate limits or cool-downs</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-[#ff5a36] shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Priority exposure in Trending feeds</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-[#ff5a36] shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Advanced profile badge</span>
              </li>
            </ul>
          </div>
          
          <button
            onClick={() => onSubscribePro?.(isYearly)}
            disabled={loading || currentPlan === 'pro' || currentPlan === 'creator'}
            className="w-full py-4 px-4 rounded-xl font-bold tracking-wide text-white bg-[#ff5a36] hover:bg-[#d61e40] transition shadow-lg shadow-[#ff5a36]/25 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (currentPlan === 'pro' ? 'Active Plan' : 'Upgrade to Pro')}
          </button>
        </div>

        {/* Creator Plan */}
        <div className="rounded-3xl border border-zinc-700 bg-zinc-900/50 p-8 shadow-sm flex flex-col h-full relative overflow-hidden backdrop-blur-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              Creator <Star className="h-4 w-4 ml-2 text-yellow-500" fill="currentColor" />
            </h3>
            <p className="text-zinc-400 text-sm h-10">For agencies and serious professionals launching mass campaigns.</p>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline mb-1">
              <span className="text-4xl font-extrabold text-white">{isYearly ? '₹1499' : '₹1699'}</span>
              <span className="text-zinc-400 ml-2 font-medium">/ month</span>
            </div>
            <p className="text-[13px] text-zinc-400 font-medium h-5">
              {isYearly ? 'Billed annually at ₹17,988' : 'Billed monthly'}
            </p>
          </div>
          
          <div className="flex-1">
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-300 shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Everything in Pro plan</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-300 shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Dedicated account manager</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-300 shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Advanced engagement analytics</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-3 text-zinc-300 shrink-0 mt-0.5" />
                <span className="text-zinc-200 text-sm">Verified Creator Checkmark</span>
              </li>
            </ul>
          </div>
          
          <button
            onClick={() => onSubscribeCreator?.(isYearly)}
            disabled={loading || currentPlan === 'creator'}
            className="w-full py-3.5 px-4 rounded-xl font-bold tracking-wide border-2 border-zinc-600 text-white hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : currentPlan === 'creator' ? 'Active Plan' : 'Upgrade to Creator'}
          </button>
        </div>
      </div>
    </div>
  );
}
