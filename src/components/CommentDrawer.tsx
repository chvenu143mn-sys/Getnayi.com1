import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Trash2, Loader2, CornerDownRight, MessageSquare, AlertCircle, Smile } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
    is_brand?: boolean;
  };
  is_reply?: boolean;
  parent_id?: string;
  reply_to_username?: string;
}

interface CommentDrawerProps {
  videoId: string;
  videoOwnerId: string;
  onClose: () => void;
  onCommentsCountChange: (count: number) => void;
  onAuthRequired: (reason: string) => void;
}

export function CommentDrawer({
  videoId,
  videoOwnerId,
  onClose,
  onCommentsCountChange,
  onAuthRequired,
}: CommentDrawerProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for Instagram-style custom reply
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyParent, setReplyParent] = useState<Comment | null>(null); // Always the root parent comment

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse raw DB content into structured comment
  const parseComment = (raw: any): Comment => {
    let text = raw.content;
    let isReply = false;
    let parentId: string | undefined = undefined;
    let replyToUsername: string | undefined = undefined;

    try {
      if (raw.content && (raw.content.startsWith('{') || raw.content.startsWith('['))) {
        const parsed = JSON.parse(raw.content);
        if (parsed.parent_id) {
          isReply = true;
          parentId = parsed.parent_id;
          replyToUsername = parsed.reply_to_username;
          text = parsed.text || '';
        }
      }
    } catch (e) {
      // Content is plain text
    }

    return {
      ...raw,
      content: text,
      is_reply: isReply,
      parent_id: parentId,
      reply_to_username: replyToUsername,
    };
  };

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments?video_id=${videoId}&limit=100`);
      if (!response.ok) throw new Error('Failed to load comments');
      const json = await response.json();
      
      const parsed = (json.data || []).map((item: any) => parseComment(item));
      setComments(parsed);
      onCommentsCountChange(parsed.length);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!user) {
      onAuthRequired('post a comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;

      let finalContent = inputText.trim();

      // If we are replying, stringify with parent details
      if (replyingTo && replyParent) {
        finalContent = JSON.stringify({
          parent_id: replyParent.id,
          reply_to_username: replyingTo.profiles?.username || 'user',
          text: inputText.trim(),
        });
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          video_id: videoId,
          content: finalContent,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || 'Failed to post comment');
      }

      const json = await response.json();
      const newComment = parseComment(json.comment);

      setComments((prev) => [newComment, ...prev]);
      onCommentsCountChange(comments.length + 1);

      setInputText('');
      setReplyingTo(null);
      setReplyParent(null);
      
      // Auto scroll to top where new comments are loaded
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      setError(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const resJson = await response.json();
        throw new Error(resJson.error || 'Failed to delete comment');
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentsCountChange(Math.max(0, comments.length - 1));
    } catch (err: any) {
      alert(err.message || 'Could not delete comment');
    }
  };

  // Helper to initialize replying state
  const handleReplyClick = (targetComment: Comment) => {
    if (!user) {
      onAuthRequired('reply to comments');
      return;
    }

    // Find original root parent (if clicking reply on a reply)
    let parent = targetComment;
    if (targetComment.is_reply && targetComment.parent_id) {
      const found = comments.find((c) => c.id === targetComment.parent_id);
      if (found) {
        parent = found;
      }
    }

    setReplyingTo(targetComment);
    setReplyParent(parent);
    
    // Add mention prefix like Instagram
    setInputText(`@${targetComment.profiles?.username || ''} `);
    inputRef.current?.focus();
  };

  // Organize components hierarchically
  const rootComments = comments.filter((c) => !c.is_reply);
  const replies = comments.filter((c) => c.is_reply);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 pointer-events-auto flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-[#121212] w-full max-w-md h-[75vh] sm:h-[70vh] rounded-t-[24px] border-t border-white/10 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull Drawer Bar Accent */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

        {/* Header */}
        <div className="px-5 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="w-6" /> {/* Spacer for centering */}
          <h3 className="text-white font-sans font-bold text-[15px] tracking-wide">
            {comments.length} comments
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Comments Center List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5 no-scrollbar">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs mt-2 mx-1">
              <AlertCircle className="size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
              <Loader2 className="size-6 animate-spin text-[#ef2950]" />
            </div>
          ) : rootComments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
              <p className="text-sm font-sans font-medium text-white/80">No comments yet.</p>
              <p className="text-xs text-zinc-500">Start the conversation.</p>
            </div>
          ) : (
            <div className="space-y-5 pt-2 pb-6">
              {rootComments.map((comment) => {
                const commentReplies = replies.filter((r) => r.parent_id === comment.id);
                const isUploaderOrOwner = user?.id === comment.user_id || user?.id === videoOwnerId;

                return (
                  <div key={comment.id} className="space-y-3">
                    {/* Root Comment Container */}
                    <div className="flex items-start gap-2.5 group">
                      {/* Avatar */}
                      <div className="size-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 mt-0.5">
                        {comment.profiles?.avatar_url ? (
                          <img
                            src={comment.profiles.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-zinc-700 text-white font-semibold text-[10px] italic">
                            {comment.profiles?.username?.charAt(0).toLowerCase() || 'u'}
                          </div>
                        )}
                      </div>

                      {/* Info & Text */}
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-white/60 text-xs font-semibold tracking-wide">
                            {comment.profiles?.username || 'user'}
                          </span>
                          {comment.profiles?.is_brand && (
                            <span className="px-1 text-[8px] bg-sky-500/20 text-sky-400 font-bold uppercase tracking-wider rounded">
                              Brand
                            </span>
                          )}
                          {comment.user_id === videoOwnerId && (
                            <span className="px-1 text-[8px] bg-[#ef2950]/20 text-[#ef2950] font-bold uppercase tracking-wider rounded">
                              Creator
                            </span>
                          )}
                          <span className="text-[10px] text-white/40 font-medium">
                            {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-white/90 text-[14px] leading-snug whitespace-pre-wrap font-sans">
                          {comment.content}
                        </p>

                        {/* Action buttons */}
                        <div className="flex items-center gap-4 text-[11px] font-bold text-white/40 pt-1">
                          <button
                            type="button"
                            onClick={() => handleReplyClick(comment)}
                            className="hover:text-white/80 transition-colors cursor-pointer"
                          >
                            Reply
                          </button>
                          
                          {isUploaderOrOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-white/40 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies Container (Instagram style) */}
                    {commentReplies.length > 0 && (
                      <div className="pl-10 space-y-3 mt-1">
                        {commentReplies.map((reply) => {
                          const isReplyOwnerOrVideoOwner = user?.id === reply.user_id || user?.id === videoOwnerId;

                          return (
                            <div key={reply.id} className="flex items-start gap-2.5 group">
                              {/* Avatar */}
                              <div className="size-6 rounded-full bg-zinc-800 overflow-hidden shrink-0 mt-0.5">
                                {reply.profiles?.avatar_url ? (
                                  <img
                                    src={reply.profiles.avatar_url}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <div className="size-full flex items-center justify-center bg-zinc-700 text-white font-semibold text-[9px] italic">
                                    {reply.profiles?.username?.charAt(0).toLowerCase() || 'u'}
                                  </div>
                                )}
                              </div>

                              {/* Replica content */}
                              <div className="flex-1 space-y-0.5">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-white/60 text-xs font-semibold tracking-wide">
                                    {reply.profiles?.username || 'user'}
                                  </span>
                                  {reply.profiles?.is_brand && (
                                    <span className="px-1 text-[8px] bg-sky-500/20 text-sky-400 font-bold uppercase tracking-wider rounded">
                                      Brand
                                    </span>
                                  )}
                                  {reply.user_id === videoOwnerId && (
                                    <span className="px-1 text-[8px] bg-[#ef2950]/20 text-[#ef2950] font-bold uppercase tracking-wider rounded">
                                      Creator
                                    </span>
                                  )}
                                  <span className="text-[10px] text-white/40 font-medium">
                                    {new Date(reply.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-white/90 text-[14px] leading-snug whitespace-pre-wrap font-sans">
                                  {reply.reply_to_username && (
                                    <span className="text-sky-400 font-medium mr-1">
                                      @{reply.reply_to_username}
                                    </span>
                                  )}
                                  {reply.content}
                                </p>

                                {/* Delete / Reply actions for nested reply */}
                                <div className="flex items-center gap-4 text-[11px] font-bold text-white/40 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleReplyClick(reply)}
                                    className="hover:text-white/80 transition-colors cursor-pointer"
                                  >
                                    Reply
                                  </button>

                                  {isReplyOwnerOrVideoOwner && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-white/40 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div ref={commentsEndRef} />
        </div>

        {/* Replying Indicator banner (above input) */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                <span>
                  Replying to <span className="text-white font-semibold">@{replyingTo.profiles?.username}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyParent(null);
                  setInputText('');
                }}
                className="text-white/60 hover:text-white size-5 flex items-center justify-center rounded-full bg-white/5"
              >
                <X className="size-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Footer Area */}
        <div className="p-3 bg-[#121212] border-t border-white/10 shrink-0 pb-safe">
          <form onSubmit={handlePostComment} className="flex items-center gap-3">
            {/* My Avatar */}
            <div className="size-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="My Profile"
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full bg-zinc-700 flex items-center justify-center text-white italic font-bold text-xs">
                  {user?.user_metadata?.username?.charAt(0).toLowerCase() || 'u'}
                </div>
              )}
            </div>

            {/* Input wrap */}
            <div className="flex-1 bg-[#1a1a1a] rounded-full flex items-center px-4 py-1.5 transition-all relative border border-transparent focus-within:border-white/20">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={replyingTo ? "Add reply..." : "Add comment..."}
                disabled={isSubmitting}
                className="bg-transparent border-none text-white placeholder-white/40 text-[14px] focus:outline-none w-full pr-8 h-7 leading-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || !inputText.trim()}
                className="absolute right-2.5 p-1 text-[#ef2950] hover:text-[#ff3b61] disabled:text-white/20 transition-colors disabled:scale-100 active:scale-90"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-[18px]" />
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
