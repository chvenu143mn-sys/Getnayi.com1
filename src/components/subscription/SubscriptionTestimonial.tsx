import React from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: "Priya Sharma",
    handle: "@priyastyles",
    role: "Fashion Creator",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
    quote: "Upgrading to Pro completely changed my reach. The auto-approval means my hauls go live while the trends are still hot. My views have tripled.",
  },
  {
    name: "Rahul Verma",
    handle: "@techrahul",
    role: "Tech Reviewer",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80",
    quote: "The priority exposure on the trending feed is legit. I easily made back the subscription cost in my first week just from affiliate link taps.",
  },
  {
    name: "Ananya Desai",
    handle: "@ananyafitness",
    role: "Fitness Coach",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80",
    quote: "Jumping the manual queue was the main reason I got Pro, but the extra audience metrics have really helped me figure out what content hits.",
  }
];

export function SubscriptionTestimonial() {
  return (
    <div className="py-20 border-y border-zinc-800/50 bg-[#0f0f12] my-24 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#ff5a36]/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-white">Join successful creators</h2>
          <p className="text-zinc-400">See what others are saying about our premium plans.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-8 relative shadow-lg">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="size-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              
              <p className="text-zinc-300 text-sm leading-relaxed mb-8">"{testimonial.quote}"</p>
              
              <div className="flex items-center gap-4 mt-auto">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="size-12 rounded-full object-cover ring-2 ring-zinc-800"
                loading="lazy" decoding="async" />
                <div>
                  <h4 className="font-bold text-white text-sm">{testimonial.name}</h4>
                  <p className="text-xs text-zinc-400">{testimonial.handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
