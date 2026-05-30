import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function ShortUrlRedirect() {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUrl() {
      if (!shortId) return;
      try {
        const { data, error } = await supabase
          .from('short_links')
          .select('long_url')
          .eq('id', shortId)
          .single();
          
        if (data && data.long_url) {
          // If it's a relative path starting with /video or /shared-collection
          if (data.long_url.startsWith('/')) {
            navigate(data.long_url, { replace: true });
          } else {
            window.location.replace(data.long_url);
          }
        } else {
          setError("Link not found or expired.");
        }
      } catch(err) {
        setError("Error loading link.");
      }
    }
    
    fetchUrl();
  }, [shortId, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
        <h1 className="text-2xl font-bold text-white mb-2">Link Unavailable</h1>
        <p className="text-gray-400">{error}</p>
        <button type="button" aria-label="button"  onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-white/10 rounded-full text-white">Go Home</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#0c0c0e] text-white">
      <Loader2 className="size-8 animate-spin text-white/50 mb-4" />
      <p className="text-white/60">Redirecting...</p>
    </div>
  );
}
