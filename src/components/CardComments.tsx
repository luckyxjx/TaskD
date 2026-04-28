import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { SendIcon, TrashIcon, EditIcon } from '../icons';

interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

interface CardCommentsProps {
  cardId: string;
  boardMembers?: Array<{ user_id: string; email?: string }>;
}

export function CardComments({ cardId, boardMembers = [] }: CardCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
    getCurrentUser();

    // Subscribe to real-time comment changes
    const subscription = supabase
      .channel(`card-comments:${cardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_comments',
          filter: `card_id=eq.${cardId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [cardId]);

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id || null);
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('card_comments')
      .select('*')
      .eq('card_id', cardId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    // Fetch user emails for each comment
    const commentsWithEmails = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: emailData, error: emailError } = await supabase.rpc('get_user_email', {
          user_uuid: comment.user_id
        });

        if (emailError) {
          console.error('Error fetching user email:', emailError);
        }
        
        return {
          ...comment,
          user_email: emailData || 'Unknown User'
        };
      })
    );

    setComments(commentsWithEmails);
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    const { data: user } = await supabase.auth.getUser();

    const mentionedUserIds = boardMembers
      .filter((member) => member.email && newComment.toLowerCase().includes(`@${member.email.toLowerCase().split('@')[0]}`))
      .map((member) => member.user_id);

    const { error } = await supabase
      .from('card_comments')
      .insert([{
        card_id: cardId,
        user_id: user.user?.id,
        content: newComment.trim(),
        mentions: mentionedUserIds,
      }]);

    if (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } else {
      setNewComment('');
      loadComments();
    }
    setLoading(false);
  };

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={`${part}-${index}`} className="font-semibold text-primary-600 dark:text-primary-300">{part}</span>;
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  const updateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from('card_comments')
      .update({ content: editContent.trim() })
      .eq('id', commentId);

    if (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    } else {
      setEditingId(null);
      setEditContent('');
      loadComments();
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    const { error } = await supabase
      .from('card_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    } else {
      loadComments();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Comments ({comments.length})
      </h3>

      {/* Comment List */}
      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                      {comment.user_email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {comment.user_email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(comment.created_at)}
                      {comment.updated_at !== comment.created_at && ' (edited)'}
                    </p>
                  </div>
                </div>
                {currentUserId === comment.user_id && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="Edit comment"
                    >
                      <EditIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete comment"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateComment(comment.id)}
                      variant="primary"
                      className="text-xs py-1 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(null);
                        setEditContent('');
                      }}
                      variant="secondary"
                      className="text-xs py-1 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {renderCommentContent(comment.content)}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              addComment();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Press Cmd/Ctrl + Enter to send
          </p>
          <Button
            onClick={addComment}
            variant="primary"
            icon={SendIcon}
            disabled={loading || !newComment.trim()}
            className="text-sm"
          >
            {loading ? 'Sending...' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
