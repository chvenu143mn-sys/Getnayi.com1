import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Likes', 'Comments', 'Follows', 'System'];

  const notifications = [
    {
      id: 1,
      type: 'like',
      user: { name: 'Sia', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop' },
      content: 'liked your comment.',
      time: '2m',
      targetImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 2,
      type: 'like',
      user: { name: 'Mike', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
      content: 'liked your comment.',
      time: '10m',
      targetImage: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 3,
      type: 'follow',
      user: { name: 'Alina', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      content: 'followed you',
      time: '20m',
      targetImage: 'https://images.unsplash.com/photo-1556228578-8d89f2142d76?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 4,
      type: 'system',
      icon: 'blue',
      content: 'Your post reached 10K views.',
      time: '1h',
      targetImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 5,
      type: 'system',
      icon: 'green',
      title: 'Verification update',
      content: 'Your verification is approved!',
      time: '2h',
      targetImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=200&q=80'
    }
  ];

  return (
    <div className="flex-1 w-full text-white font-sans flex flex-col h-full bg-black">
      {/* Header Tabs */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e] pt-6 border-b border-white/5">
        <div className="flex px-5 space-x-7 overflow-x-auto scrollbar-none pb-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-2 text-[15px] font-medium tracking-wide whitespace-nowrap transition-colors ${
                activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-white/80'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-[#ef2950] rounded-t-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-2 px-5">
        <div className="flex flex-col">
          {notifications.map((notif) => (
            <div key={notif.id} onClick={() => alert('Viewing notification')} className="flex items-start py-5 last:border-0 hover:bg-white/[0.02] transition-colors -mx-5 px-5 cursor-pointer">
              {/* Left Image / Icon */}
              <div className="mr-5 mt-0.5 relative shrink-0">
                {notif.type === 'system' ? (
                  <div className={`w-[52px] h-[52px] rounded-[16px] flex items-center justify-center shadow-md ${
                    notif.icon === 'blue' ? 'bg-[#3b82f6]' : 'bg-[#10b981]'
                  }`}>
                    {notif.icon === 'blue' ? (
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L6 8C6 11 9 12 12 14.5C15 12 18 11 18 8L12 2ZM12 22L18 16C18 13 15 12 12 9.5C9 12 6 13 6 16L12 22Z" fill="white"/>
                       </svg>
                    ) : (
                      <ShieldCheck className="w-[28px] h-[28px] text-white" strokeWidth={2} />
                    )}
                  </div>
                ) : (
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden shadow-md bg-zinc-800 border border-white/5">
                    <img src={notif.user?.image} alt={notif.user?.name} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              
              {/* Middle Content */}
              <div className="flex-1 pr-4 py-0.5">
                {notif.title && (
                  <h4 className="text-[14px] font-medium text-white/90 tracking-wide mb-1 opacity-90">{notif.title}</h4>
                )}
                <p className="text-[14px] text-white/80 leading-snug tracking-wide mb-1.5 opacity-90">
                  {notif.user && (
                    <span className="font-medium text-white mr-1.5">{notif.user.name}</span>
                  )}
                  {notif.content}
                </p>
                <span className="text-[13px] text-zinc-500 font-medium tracking-wide block">{notif.time}</span>
              </div>
              
              {/* Right Thumbnail */}
              {notif.targetImage && (
                <div className="w-[56px] h-[56px] rounded-xl overflow-hidden shrink-0 mt-0.5 shadow-sm bg-zinc-800 border border-white/5">
                  <img src={notif.targetImage} alt="Reference" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
