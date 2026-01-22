import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityIcon, PlusIcon, EditIcon, TrashIcon, MessageSquareIcon } from '../icons';

interface Activity {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
  user_email?: string;
}

interface ActivityFeedProps {
  boardId: string;
  limit?: number;
}

export function ActivityFeed({ boardId, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Subscribe to real-time activity changes
    const subscription = supabase
      .channel(`activities:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `board_id=eq.${boardId}`
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [boardId, limit]);

  const loadActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading activities:', error);
      setLoading(false);
      return;
    }

    // Fetch user emails for each activity
    const activitiesWithEmails = await Promise.all(
      (data || []).map(async (activity) => {
        if (!activity.user_id) {
          return { ...activity, user_email: 'System' };
        }

        const email = await supabase.rpc('get_user_email', {
          user_uuid: activity.user_id
        });
        
        return {
          ...activity,
          user_email: email.data || 'Unknown User'
        };
      })
    );

    setActivities(activitiesWithEmails);
    setLoading(false);
  };

  const getActivityIcon = (action: string, entityType: string) => {
    if (action === 'created') return <PlusIcon className="w-4 h-4" />;
    if (action === 'updated' || action === 'moved') return <EditIcon className="w-4 h-4" />;
    if (action === 'deleted') return <TrashIcon className="w-4 h-4" />;
    if (action === 'commented') return <MessageSquareIcon className="w-4 h-4" />;
    return <ActivityIcon className="w-4 h-4" />;
  };

  const getActivityColor = (action: string) => {
    if (action === 'created' || action === 'joined') return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
    if (action === 'updated' || action === 'moved') return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400';
    if (action === 'deleted') return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400';
    if (action === 'commented') return 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  const getActivityMessage = (activity: Activity) => {
    const { action, entity_type, metadata } = activity;
    
    if (action === 'created') {
      if (entity_type === 'card') return `created card "${metadata?.title || 'Untitled'}"`;
      if (entity_type === 'list') return `created list "${metadata?.name || 'Untitled'}"`;
      return `created ${entity_type}`;
    }
    
    if (action === 'updated') {
      if (entity_type === 'card') return `updated card "${metadata?.title || 'Untitled'}"`;
      if (entity_type === 'list') return `updated list "${metadata?.name || 'Untitled'}"`;
      return `updated ${entity_type}`;
    }
    
    if (action === 'moved') {
      return `moved card "${metadata?.title || 'Untitled'}" to "${metadata?.to_list || 'another list'}"`;
    }
    
    if (action === 'deleted') {
      if (entity_type === 'card') return `deleted card "${metadata?.title || 'Untitled'}"`;
      if (entity_type === 'list') return `deleted list "${metadata?.name || 'Untitled'}"`;
      return `deleted ${entity_type}`;
    }
    
    if (action === 'commented') {
      return `commented on "${metadata?.card_title || 'a card'}"`;
    }
    
    if (action === 'joined') {
      return `joined the board as ${metadata?.role || 'member'}`;
    }
    
    return `${action} ${entity_type}`;
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <ActivityIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Recent Activity
        </h3>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No activity yet
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.action)}`}>
                {getActivityIcon(activity.action, activity.entity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{activity.user_email}</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">
                    {getActivityMessage(activity)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
