import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UploadSuccessStateProps {
  uploadedVideoStatus: string | null;
}

export function UploadSuccessState({ uploadedVideoStatus }: UploadSuccessStateProps) {
  const navigate = useNavigate();

  if (uploadedVideoStatus === 'pending_review') {
    return (
      <div className="flex-1 w-full bg-bg-base text-text-primary flex flex-col h-full items-center justify-center p-6 text-center">
        <div className="size-20 bg-yellow-500/20 text-yellow-500 rounded-full flex flex-col items-center justify-center mb-6">
          <AlertCircle className="size-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Under Review</h2>
        <p className="text-text-secondary text-center max-w-sm mb-6">
          Since this store is new to us, we’ll quickly review your post to keep the community safe.
        </p>
        <button type="button" aria-label="button"  
          onClick={() => navigate('/profile')}
          className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-bg-base text-text-primary flex flex-col h-full items-center justify-center p-6">
      <div className="size-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <CheckCircle className="size-10" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Post is live!</h2>
      <p className="text-text-secondary text-center max-w-xs">
        Your video is out there. Heading to your profile...
      </p>
    </div>
  );
}
