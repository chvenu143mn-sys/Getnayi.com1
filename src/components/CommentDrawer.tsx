import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Trash2, Loader2, CornerDownRight, MessageSquare, AlertCircle, Smile, Pin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { safeFetch } from '../utils/apiClient';

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
  is_pinned?: boolean;
}

interface CommentDrawerProps {
  videoId: string;
  videoOwnerId: string;
  initialCommentsCount: number;
  onClose: () => void;
  onCommentsCountChange: (count: number) => void;
  onAuthRequired: (reason: string) => void;
}

// Stale-While-Revalidate Client-side memory cache to provide sub-millisecond local loading speeds!
const commentCache: Record<string, { comments: Comment[]; count: number }> = {};

export function CommentDrawer({
  videoId,
  videoOwnerId,
  initialCommentsCount,
  onClose,
  onCommentsCountChange,
  onAuthRequired,
}: CommentDrawerProps) {
  const { user } = useAuth();
  
  // Initialize from cache if exists for ultra-fast, instantaneous presentation
  const cachedData = commentCache[videoId];
  
  const [comments, setComments] = useState<Comment[]>(cachedData ? cachedData.comments : []);
  const [totalComments, setTotalComments] = useState(cachedData ? cachedData.count : initialCommentsCount);

  // Sync count to parent without creating "Cannot update component during render" warnings!
  useEffect(() => {
    onCommentsCountChange(totalComments);
  }, [totalComments, onCommentsCountChange]);

  const [loading, setLoading] = useState(!cachedData); // Skip loading spinner if we have cached results!
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for Instagram-style custom reply
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyParent, setReplyParent] = useState<Comment | null>(null); // Always the root parent comment
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
  // Accordion expansion state for comment nested replies
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Mention Suggestions & Pills State
  const [selectedMentions, setSelectedMentions] = useState<{ username: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore draft when videoId changes
  useEffect(() => {
    const savedDraft = localStorage.getItem(`comment_draft_${videoId}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setInputText(parsed.text || '');
        if (parsed.replyingTo) {
          setReplyingTo(parsed.replyingTo);
        } else {
          setReplyingTo(null);
        }
        if (parsed.replyParent) {
          setReplyParent(parsed.replyParent);
        } else {
          setReplyParent(null);
        }
        if (parsed.selectedMentions) {
          setSelectedMentions(parsed.selectedMentions);
        } else {
          setSelectedMentions([]);
        }
      } catch (err) {
        setInputText(savedDraft);
        setReplyingTo(null);
        setReplyParent(null);
        setSelectedMentions([]);
      }
    } else {
      setInputText('');
      setReplyingTo(null);
      setReplyParent(null);
      setSelectedMentions([]);
    }
  }, [videoId]);

  // Save draft continuously in localStorage whenever it changes
  useEffect(() => {
    const draftData = {
      text: inputText,
      replyingTo,
      replyParent,
      selectedMentions
    };
    if (inputText.trim() || replyingTo || selectedMentions.length > 0) {
      localStorage.setItem(`comment_draft_${videoId}`, JSON.stringify(draftData));
    } else {
      localStorage.removeItem(`comment_draft_${videoId}`);
    }
  }, [inputText, videoId, replyingTo, replyParent, selectedMentions]);

  // Monitor mention triggers (words starting with @)
  useEffect(() => {
    const words = inputText.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.startsWith('@')) {
      const query = lastWord.slice(1).toLowerCase();
      setMentionQuery(query);
    } else {
      setMentionQuery(null);
    }
  }, [inputText]);

  // Compute suggestions based on query from thread participants
  useEffect(() => {
    if (mentionQuery !== null) {
      // Collect unique usernames from all comments currently fetched
      const uniqueUsers = Array.from(new Set(
        comments
          .map(c => c.profiles?.username)
          .filter(Boolean) as string[]
      ));
      
      const filtered = uniqueUsers.filter(u => 
        u.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5);
      
      setMentionSuggestions(filtered);
      setActiveSuggestionIndex(0);
    } else {
      setMentionSuggestions([]);
    }
  }, [mentionQuery, comments]);

  const handleSelectMention = (username: string) => {
    if (!selectedMentions.some(m => m.username === username)) {
      setSelectedMentions(prev => [...prev, { username }]);
    }
    
    // Replace the '@query' chunk typed in inputText
    const words = inputText.split(/\s+/);
    words.pop(); // Remove the '@query' chunk
    let nextText = words.join(' ');
    if (nextText.length > 0) {
      nextText += ' ';
    }
    setInputText(nextText);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const renderCommentText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-[#3897f0] font-semibold hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

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
          
          if (replyToUsername) {
            // Strip any leading occurrences of @username 
            const regex = new RegExp(`^(@${replyToUsername}\\s*)+`, 'i');
            text = text.replace(regex, '');
          }
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
      is_pinned: raw.is_pinned === true,
    };
  };

  const fetchComments = async (reset = false) => {
    if (reset) {
      if (!commentCache[videoId]) {
        setLoading(true);
      }
      setError(null);
      setNextCursor(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const cursorParams = !reset && nextCursor ? `&cursor=${nextCursor}` : '';
      // Limit set to 30 for optimized server-to-client JSON serialization & layout density
      const json = await safeFetch(`/api/comments?video_id=${videoId}&limit=30${cursorParams}`);
      
      const parsed = (json?.data || []).map((item: any) => parseComment(item));
      
      let finalComments = [];
      if (reset) {
        finalComments = parsed;
        setComments(parsed);
      } else {
        setComments(prev => {
          const merged = [...prev];
          parsed.forEach((newC: Comment) => {
            if (!merged.some(c => c.id === newC.id)) {
              merged.push(newC);
            }
          });
          finalComments = merged;
          return merged;
        });
      }

      setNextCursor(json.nextCursor);
      
      // Update global memory cache (SWR pattern)
      commentCache[videoId] = {
        comments: finalComments,
        count: reset ? parsed.filter((c: any) => !c.is_reply).length : totalComments,
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchComments(true);
  }, [videoId]);

  // Real-time synchronization for comments
  useEffect(() => {
    const channel = supabase
      .channel(`public:comments:${videoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` },
        async (payload) => {
          const newId = payload.new.id;
          
          let exists = false;
          setComments((prev) => {
            exists = prev.some((c) => c.id === newId);
            return prev;
          });
          
          if (!exists) {
            try {
              const { data, error } = await supabase
                .from('comments')
                .select('*, profiles(username, avatar_url, is_brand)')
                .eq('id', newId)
                .single();
                
              if (!error && data) {
                const newC = parseComment(data);
                
                setComments((prev) => {
                  if (prev.some((c) => c.id === newC.id)) return prev;
                  const updated = [newC, ...prev];
                  commentCache[videoId] = { comments: updated, count: commentCache[videoId]?.count || 0 };
                  return updated;
                });
                
                if (!newC.is_reply) {
                   setTotalComments((tc) => {
                       const nt = tc + 1;
                       if (commentCache[videoId]) commentCache[videoId].count = nt;
                       return nt;
                   });
                }
              }
            } catch (e) {
              console.error('Failed to fetch realtime comment:', e);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` },
        (payload) => {
          const deletedId = payload.old.id;
          if (!deletedId) return;
          
          let deletedRootCount = 0;
          setComments((prev) => {
             const toDelete = prev.filter((c) => c.id === deletedId || c.parent_id === deletedId);
             if (toDelete.length === 0) return prev;
             
             deletedRootCount = toDelete.filter((c) => !c.is_reply).length;
             const updated = prev.filter((c) => c.id !== deletedId && c.parent_id !== deletedId);
             
             if (commentCache[videoId]) commentCache[videoId].comments = updated;
             return updated;
          });
          
          if (deletedRootCount > 0) {
             setTotalComments((tc) => {
                 const nt = Math.max(0, tc - deletedRootCount);
                 if (commentCache[videoId]) commentCache[videoId].count = nt;
                 return nt;
             });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` },
        (payload) => {
          const updatedId = payload.new.id;
          const newPinned = payload.new.is_pinned === true;
          
          setComments((prev) => {
             const existing = prev.find((c) => c.id === updatedId);
             if (!existing || existing.is_pinned === newPinned) return prev;
             
             const updated = prev.map((c) => {
                 if (c.id === updatedId) return { ...c, is_pinned: newPinned };
                 if (newPinned && c.video_id === videoId && c.id !== updatedId) return { ...c, is_pinned: false };
                 return c;
             });
             if (commentCache[videoId]) commentCache[videoId].comments = updated;
             return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, onCommentsCountChange]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && selectedMentions.length === 0) return;

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
        let text = inputText.trim();
        const username = replyingTo.profiles?.username || 'user';
        
        if (selectedMentions.length > 0) {
          const mentionsPrefix = selectedMentions.map(m => `@${m.username}`).join(' ') + ' ';
          text = mentionsPrefix + text;
        }

        // Clean up redundant @username if typed accidentally by the user or autocomplete
        const regex = new RegExp(`^(@${username}\\s*)+`, 'i');
        text = text.replace(regex, '');

        finalContent = JSON.stringify({
          parent_id: replyParent.id,
          reply_to_username: username,
          text: text,
        });
      } else {
        // Normal comment with active mention pills
        if (selectedMentions.length > 0) {
          const mentionsPrefix = selectedMentions.map(m => `@${m.username}`).join(' ') + ' ';
          finalContent = mentionsPrefix + finalContent;
        }
      }

      const json = await safeFetch('/api/comments', {
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

      if (!json?.comment) throw new Error('Invalid response from server');
      const newComment = parseComment(json.comment);

      let wasDuplicate = false;
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) {
          wasDuplicate = true;
          return prev;
        }
        const updated = [newComment, ...prev];
        if (commentCache[videoId]) commentCache[videoId].comments = updated;
        return updated;
      });
      
      // Schedule the count update in the next tick to ensure wasDuplicate is captured if setComments is synchronous
      setTimeout(() => {
        if (!wasDuplicate && !newComment.is_reply) {
          setTotalComments((tc) => {
            const nt = tc + 1;
            if (commentCache[videoId]) commentCache[videoId].count = nt;
            return nt;
          });
        }
      }, 0);

      // Auto-expand replies for parent if we just replied to it
      if (replyParent) {
        setExpandedReplies(prev => ({
          ...prev,
          [replyParent.id]: true
        }));
      }

      setInputText('');
      setReplyingTo(null);
      setReplyParent(null);
      setSelectedMentions([]);
      localStorage.removeItem(`comment_draft_${videoId}`);
      
      // Focus restoration
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      setError(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinComment = async (commentId: string) => {
    if (!user) return;
    setError(null);

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;

      const resJson = await safeFetch(`/api/comments/${commentId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const isPinnedNewValue = resJson?.is_pinned;

      setComments((prev) => {
        const updated = prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, is_pinned: isPinnedNewValue };
          }
          // Unpin other comments for this video (max 1 pinned comment per video)
          if (isPinnedNewValue && c.video_id === videoId && c.id !== commentId) {
            return { ...c, is_pinned: false };
          }
          return c;
        });

        commentCache[videoId] = { comments: updated, count: totalComments };
        return updated;
      });
    } catch (err: any) {
      setError(err.message || 'Could not toggle pin state');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || deletingCommentId) return;
    setError(null);

    // Confirmation click flow
    if (confirmDeleteId !== commentId) {
      setConfirmDeleteId(commentId);
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === commentId ? null : prev));
      }, 3000);
      return;
    }

    setConfirmDeleteId(null);
    setDeletingCommentId(commentId);

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;

      await safeFetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Determine how many ROOT comments are deleted
      let deletedRootCount = 0;
      
      setComments((prev) => {
        const toDelete = prev.filter((c) => c.id === commentId || c.parent_id === commentId);
        deletedRootCount = toDelete.filter(c => !c.is_reply).length;
        
        const updated = prev.filter((c) => c.id !== commentId && c.parent_id !== commentId);
        if (commentCache[videoId]) commentCache[videoId].comments = updated;
        return updated;
      });

      // Schedule count update
      setTimeout(() => {
        if (deletedRootCount > 0) {
          setTotalComments((tc) => {
            const nt = Math.max(0, tc - deletedRootCount);
            if (commentCache[videoId]) commentCache[videoId].count = nt;
            return nt;
          });
        }
      }, 0);
    } catch (err: any) {
      setError(err.message || 'Could not delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleReplyClick = (targetComment: Comment) => {
    if (!user) {
      onAuthRequired('reply to comments');
      return;
    }

    // Capture original parent root comment
    let parent = targetComment;
    if (targetComment.is_reply && targetComment.parent_id) {
      const found = comments.find((c) => c.id === targetComment.parent_id);
      if (found) {
        parent = found;
      }
    }

    setReplyingTo(targetComment);
    setReplyParent(parent);
    
    // Clear and focus clean - the styled pill component will represent the target in the input box!
    setInputText('');
    inputRef.current?.focus();
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Group hierarchically: Pinned at top, followed by chronological DESC sorting
  const rootComments = comments
    .filter((c) => !c.is_reply)
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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
        className="bg-[#121212] w-full max-w-md h-[75vh] sm:h-[70vh] rounded-t-[24px] border-t border-border-subtle flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull Drawer Bar Accent */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

        {/* Header */}
        <div className="px-5 pb-4 border-b border-border-subtle flex items-center justify-between shrink-0">
          <div className="w-6" /> {/* Spacer */}
          <h3 className="text-text-primary font-sans font-bold text-[15px] tracking-wide">
            {totalComments} comments
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 rounded-full hover:bg-surface-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Comments Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5 no-scrollbar">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs mt-2 mx-1">
              <AlertCircle className="size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-text-secondary gap-2">
              <Loader2 className="size-6 animate-spin text-brand-primary" />
            </div>
          ) : rootComments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-text-secondary gap-2">
              <p className="text-sm font-sans font-medium text-text-primary/80">No comments yet.</p>
              <p className="text-xs text-text-secondary">Start the conversation.</p>
            </div>
          ) : (
            <div className="space-y-5 pt-2 pb-6">
              {rootComments.map((comment) => {
                const commentReplies = replies.filter((r) => r.parent_id === comment.id);
                const isUploaderOrOwner = user?.id === comment.user_id || user?.id === videoOwnerId;
                const isCreatorOrAdmin = user?.id === videoOwnerId || user?.user_metadata?.is_admin === true;
                const isExpanded = !!expandedReplies[comment.id];

                return (
                  <div key={comment.id} className="space-y-2">
                    {/* Root Comment Row */}
                    <div className="flex items-start gap-2.5 group">
                      {/* Avatar */}
                      <div className="size-8 rounded-full bg-surface-2 overflow-hidden shrink-0 mt-0.5 relative">
                        {comment.profiles?.avatar_url ? (
                          <img                             src={comment.profiles.avatar_url}
                            alt=""
                            className="size-full object-cover"
                            referrerPolicy="no-referrer"
                          loading="lazy" decoding="async" />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-surface-2 text-text-primary font-semibold text-[10px] italic">
                            {comment.profiles?.username?.charAt(0).toLowerCase() || 'u'}
                          </div>
                        )}
                        {comment.user_id === videoOwnerId && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-brand-primary rounded-full p-[2px] border border-[#121212]">
                            <Pin className="size-1.5 text-text-primary fill-white" />
                          </div>
                        )}
                      </div>

                      {/* Content Wrapper */}
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-text-primary/60 text-xs font-semibold tracking-wide">
                            {comment.profiles?.username || 'user'}
                          </span>
                          {comment.profiles?.is_brand && (
                            <span className="px-1 text-[8px] bg-sky-500/20 text-sky-400 font-bold uppercase tracking-wider rounded">
                              Brand
                            </span>
                          )}
                          {comment.user_id === videoOwnerId && (
                            <span className="px-1 text-[8px] bg-brand-primary/20 text-brand-primary font-bold uppercase tracking-wider rounded">
                              Creator
                            </span>
                          )}
                          <span className="text-[10px] text-text-primary/60 font-medium">
                            {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Pinned Indicator badge */}
                        {comment.is_pinned && (
                          <div className="flex items-center gap-1 text-brand-primary font-bold text-[10px] pt-0.5 tracking-wide uppercase">
                            <Pin className="size-2.5 fill-brand-primary" />
                            <span>Pinned by creator</span>
                          </div>
                        )}

                        <p className="text-text-primary/90 text-[14px] leading-snug whitespace-pre-wrap font-sans pt-0.5">
                          {renderCommentText(comment.content)}
                        </p>

                        {/* Action details bar */}
                        <div className="flex items-center gap-4 text-[11px] font-bold text-text-primary/60 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleReplyClick(comment)}
                            className="hover:text-text-primary/80 transition-colors cursor-pointer"
                          >
                            Reply
                          </button>
                          
                          {isCreatorOrAdmin && (
                            <button
                              type="button"
                              onClick={() => handlePinComment(comment.id)}
                              className={`${comment.is_pinned ? 'text-brand-primary' : 'hover:text-text-primary/80'} transition-colors flex items-center gap-0.5 cursor-pointer`}
                            >
                              <Pin className={`size-3 ${comment.is_pinned ? 'fill-brand-primary' : ''}`} />
                              <span>{comment.is_pinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                          )}

                          {isUploaderOrOwner && (
                            <button
                              type="button"
                              disabled={deletingCommentId !== null}
                              onClick={() => handleDeleteComment(comment.id)}
                              className={`${confirmDeleteId === comment.id ? 'text-red-500 font-bold' : 'text-text-primary/60 hover:text-red-400'} disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer`}
                            >
                              {deletingCommentId === comment.id ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="size-3 animate-spin text-brand-primary" />
                                  <span>Deleting...</span>
                                </span>
                              ) : (
                                <span>{confirmDeleteId === comment.id ? 'Confirm?' : 'Delete'}</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies Collapsible Segment - Industry Standard Thread Connector */}
                    {commentReplies.length > 0 && (
                      <div className="space-y-2 mt-0.5">
                        <div className="pl-[22px]">
                          <button
                            type="button"
                            onClick={() => toggleReplies(comment.id)}
                            className="flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors focus:outline-none py-1"
                          >
                            <span className="w-5 h-[1.5px] bg-surface-2 inline-block shrink-0" />
                            <span>
                              {isExpanded ? 'Hide replies' : `View replies (${commentReplies.length})`}
                            </span>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pl-10 space-y-3 pt-1 border-l-2 border-border-subtle/40 ml-[15px]">
                            {commentReplies.map((reply) => {
                              const isReplyOwnerOrVideoOwner = user?.id === reply.user_id || user?.id === videoOwnerId;

                              return (
                                <div key={reply.id} className="flex items-start gap-2.5 group pl-1">
                                  {/* Avatar */}
                                  <div className="size-6 rounded-full bg-surface-2 overflow-hidden shrink-0 mt-0.5">
                                    {reply.profiles?.avatar_url ? (
                                      <img                                         src={reply.profiles.avatar_url}
                                        alt=""
                                        className="size-full object-cover"
                                        referrerPolicy="no-referrer"
                                      loading="lazy" decoding="async" />
                                    ) : (
                                      <div className="size-full flex items-center justify-center bg-surface-2 text-text-primary font-semibold text-[9px] italic">
                                        {reply.profiles?.username?.charAt(0).toLowerCase() || 'u'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Reply content details */}
                                  <div className="flex-1 space-y-0.5">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className="text-text-primary/60 text-xs font-semibold tracking-wide">
                                        {reply.profiles?.username || 'user'}
                                      </span>
                                      {reply.profiles?.is_brand && (
                                        <span className="px-1 text-[8px] bg-sky-500/20 text-sky-400 font-bold uppercase tracking-wider rounded">
                                          Brand
                                        </span>
                                      )}
                                      {reply.user_id === videoOwnerId && (
                                        <span className="px-1 text-[8px] bg-brand-primary/20 text-brand-primary font-bold uppercase tracking-wider rounded">
                                          Creator
                                        </span>
                                      )}
                                      <span className="text-[10px] text-text-primary/60 font-medium">
                                        {new Date(reply.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-text-primary/90 text-[14px] leading-snug whitespace-pre-wrap font-sans">
                                      {reply.reply_to_username && (
                                        <span className="text-sky-400 font-semibold mr-1">
                                          @{reply.reply_to_username}
                                        </span>
                                      )}
                                      {renderCommentText(reply.content)}
                                    </p>

                                    {/* Sub-reply features */}
                                    <div className="flex items-center gap-4 text-[11px] font-bold text-text-primary/60 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleReplyClick(reply)}
                                        className="hover:text-text-primary/80 transition-colors cursor-pointer"
                                      >
                                        Reply
                                      </button>

                                      {isReplyOwnerOrVideoOwner && (
                                        <button
                                          type="button"
                                          disabled={deletingCommentId !== null}
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className={`${confirmDeleteId === reply.id ? 'text-red-500 font-bold' : 'text-text-primary/60 hover:text-red-400'} disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer`}
                                        >
                                          {deletingCommentId === reply.id ? (
                                            <span className="flex items-center gap-1">
                                              <Loader2 className="size-3 animate-spin text-brand-primary" />
                                              <span>Deleting...</span>
                                            </span>
                                          ) : (
                                            <span>{confirmDeleteId === reply.id ? 'Confirm?' : 'Delete'}</span>
                                          )}
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
                    )}
                  </div>
                );
              })}
              
              {/* Load Previous Comments */}
              {nextCursor && (
                <div className="pt-2 pb-4 flex justify-center">
                  <button
                    onClick={() => fetchComments()}
                    disabled={loadingMore}
                    className="px-5 py-2.5 bg-white/5 hover:bg-surface-1 active:scale-95 transition-all rounded-full flex items-center gap-2 border border-border-subtle group"
                  >
                    {loadingMore ? (
                      <Loader2 className="size-4 animate-spin text-text-primary/60" />
                    ) : (
                      <CornerDownRight className="size-4 text-text-primary/60 group-hover:text-text-primary" />
                    )}
                    <span className="text-sm font-semibold tracking-wide text-text-primary/80 group-hover:text-text-primary">
                      View previous comments
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div ref={commentsEndRef} />
        </div>

        {/* Mention Suggestions Popup */}
        <AnimatePresence>
          {mentionSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-3 mb-2 bg-surface-2 border border-border-subtle rounded-xl overflow-hidden shadow-2xl z-20 overflow-y-auto max-h-[160px]"
            >
              <div className="px-3.5 py-2 text-[11px] font-sans font-bold text-text-secondary uppercase tracking-wider border-b border-border-subtle">
                Suggested Mentions
              </div>
              <div className="flex flex-col py-1">
                {mentionSuggestions.map((username) => (
                  <button
                    key={username}
                    type="button"
                    onClick={() => handleSelectMention(username)}
                    className="px-4 py-2 text-left text-[13.5px] font-sans text-text-primary hover:bg-surface-1 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <span className="font-semibold text-text-primary/90 group-hover:text-text-primary">@{username}</span>
                    <span className="text-[11px] text-brand-primary group-hover:text-[#f4284d] font-semibold">Select</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replying indicator overlay */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#18181c] border-t border-border-subtle px-4 py-3 flex items-center gap-3 shrink-0"
            >
              <div className="size-8 rounded-full bg-surface-2 overflow-hidden shrink-0">
                {replyingTo.profiles?.avatar_url ? (
                  <img                     src={replyingTo.profiles.avatar_url}
                    alt=""
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  loading="lazy" decoding="async" />
                ) : (
                  <div className="size-full flex items-center justify-center bg-surface-2 text-text-primary font-semibold text-xs italic">
                    {replyingTo.profiles?.username?.charAt(0).toLowerCase() || 'u'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                  Replying to thread
                </div>
                <div className="text-[13px] font-semibold text-text-primary truncate max-w-xs">
                  @{replyingTo.profiles?.username}
                </div>
                <div className="text-[11.5px] text-text-secondary truncate max-w-sm font-sans mt-0.5">
                  {replyingTo.content}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyParent(null);
                  setInputText('');
                  setSelectedMentions([]);
                }}
                className="text-text-primary/60 hover:text-text-primary size-6 flex items-center justify-center rounded-full bg-white/5 border border-border-subtle active:scale-90 transition-all cursor-pointer"
                title="Cancel reply"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Input Footer */}
        <div className="p-3 bg-[#121212] border-t border-border-subtle shrink-0 pb-safe">
          <form onSubmit={handlePostComment} className="flex items-start gap-3">
            {/* User Profile avatar */}
            <div className="size-8 rounded-full bg-surface-2 overflow-hidden shrink-0 mt-1">
              {user?.user_metadata?.avatar_url ? (
                <img                   src={user.user_metadata.avatar_url}
                  alt="My Profile"
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                loading="lazy" decoding="async" />
              ) : (
                <div className="size-full bg-surface-2 flex items-center justify-center text-text-primary italic font-bold text-xs">
                  {user?.user_metadata?.username?.charAt(0).toLowerCase() || 'u'}
                </div>
              )}
            </div>

            {/* Input wrapper field */}
            <div className="flex-1 bg-[#1a1a1a] rounded-2xl flex flex-wrap items-center gap-1.5 px-3 py-1.5 transition-all relative border border-transparent focus-within:border-white/20 min-h-[38px] max-h-[100px] overflow-y-auto">
              
              {/* Selected Mentions Styled Pills */}
              {selectedMentions.map((mention, index) => (
                <div 
                  key={index}
                  className="bg-brand-primary/15 text-brand-primary pl-2.5 pr-1 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 border border-brand-primary/30 select-none font-sans"
                >
                  <span>@{mention.username}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedMentions(prev => prev.filter(m => m.username !== mention.username))}
                    className="hover:text-red-400 p-0.5 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={replyingTo || selectedMentions.length > 0 ? "" : "Add comment..."}
                disabled={isSubmitting}
                className="bg-transparent border-none text-text-primary placeholder-white/40 text-[14px] focus:outline-none flex-1 min-w-[80px] h-7 leading-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || (!inputText.trim() && selectedMentions.length === 0)}
                className="p-1 text-brand-primary hover:text-[#f4284d] disabled:text-text-primary/20 transition-colors disabled:scale-100 active:scale-90 ml-auto"
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
