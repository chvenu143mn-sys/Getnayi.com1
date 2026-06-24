import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-8 mt-12 border-t border-white/10 bg-[#0c0c0e] text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
      <div className="flex gap-4">
        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
      </div>
      <p>&copy; {new Date().getFullYear()} GetNayi. All rights reserved.</p>
    </footer>
  );
}
