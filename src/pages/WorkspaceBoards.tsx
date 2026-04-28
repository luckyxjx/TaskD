import { useEffect, useState, useRef } from 'react';
import { Search, User, ArrowLeft, Plus, LayoutGrid, Sparkles, CheckCircle2, Clock, AlertTriangle, Activity, Bell, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { MoreVerticalIcon, EditIcon, TrashIcon } from '../icons';

interface Board {
  id: string;
  name: string;
  workspace_id: string;
}

interface BoardStats {
  [boardId: string]: {
    total: number;
    completed: number;
    overdue: number;
    urgent: number;
  };
}

interface RecentActivity {
  id: string;
  board_id: string;
  action: string;
  entity_type: string;
  metadata: { title?: string; name?: string; to_list?: string } | null;
  created_at: string;
  board_name?: string;
}

interface InvitationPayload {
  email?: string | null;
}

interface CardStatsRow {
  id: string;
  list_id: string;
  priority?: string | null;
  due_date?: string | null;
}

interface WorkspaceBoardsProps {
  workspaceId: string;
  onBoardClick: (boardId: string) => void;
  onBack: () => void;
  onProfileClick: () => void;
  onInvitationsClick?: () => void;
}

export function WorkspaceBoards({ workspaceId, onBoardClick, onBack, onProfileClick, onInvitationsClick }: WorkspaceBoardsProps) {
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardStats, setBoardStats] = useState<BoardStats>({});
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'boards' | 'activity'>('dashboard');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [showRenameBoardModal, setShowRenameBoardModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [boardToRename, setBoardToRename] = useState<Board | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [renameBoardName, setRenameBoardName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadPendingInvitations();

      // Real-time subscription for board invitations
      const boardInvitationsSubscription = supabase
        .channel('workspace-boards-board-invitations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'board_invitations'
        }, (payload) => {
          const invitation = (payload.new || payload.old) as InvitationPayload | null;
          if (invitation && invitation.email === user.email) {
            loadPendingInvitations();
          }
        })
        .subscribe();

      // Real-time subscription for workspace invitations
      const workspaceInvitationsSubscription = supabase
        .channel('workspace-boards-workspace-invitations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'workspace_invitations'
        }, (payload) => {
          const invitation = (payload.new || payload.old) as InvitationPayload | null;
          if (invitation && invitation.email === user.email) {
            loadPendingInvitations();
          }
        })
        .subscribe();

      return () => {
        boardInvitationsSubscription.unsubscribe();
        workspaceInvitationsSubscription.unsubscribe();
      };
    }
  }, []); // Remove user dependency to prevent reloading

  useEffect(() => {
    loadWorkspaceName();
    loadBoards();

    const boardsSubscription = supabase
      .channel(`boards:${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'boards',
        filter: `workspace_id=eq.${workspaceId}`
      }, () => {
        loadBoards();
      })
      .subscribe();

    return () => {
      boardsSubscription.unsubscribe();
    };
  }, [workspaceId]);

  useEffect(() => {
    if (boards.length > 0) {
      loadBoardStats();

      const subscription = supabase
        .channel('cards-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => {
          loadBoardStats();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [boards]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWorkspaceName = async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error loading workspace:', error);
      return;
    }

    if (data) {
      setWorkspaceName(data.name);
    }
  };

  const loadBoards = async () => {
    setLoadingBoards(true);
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading boards:', error);
      setLoadingBoards(false);
      return;
    }

    setBoards(data || []);
    setLoadingBoards(false);
  };

  const loadPendingInvitations = async () => {
    if (!user?.email) return;

    // Count board invitations
    const { count: boardCount, error: boardError } = await supabase
      .from('board_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('email', user.email)
      .eq('accepted', false);

    if (boardError) {
      console.error('Error loading board invitations:', boardError);
    }

    // Count workspace invitations
    const { count: workspaceCount, error: workspaceError } = await supabase
      .from('workspace_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('email', user.email)
      .eq('accepted', false);

    if (workspaceError) {
      console.error('Error loading workspace invitations:', workspaceError);
    }

    setPendingInvitationsCount((boardCount || 0) + (workspaceCount || 0));
  };

  const loadBoardStats = async () => {
    const stats: BoardStats = {};

    for (const board of boards) {
      const { data: lists } = await supabase
        .from('lists')
        .select('id, name')
        .eq('board_id', board.id);

      if (!lists || lists.length === 0) {
        stats[board.id] = { total: 0, completed: 0, overdue: 0, urgent: 0 };
        continue;
      }

      const doneList = lists.find(list => list.name.toLowerCase() === 'done');

      const { data: cardData, count: totalCount } = await supabase
        .from('cards')
        .select('id, list_id, priority, due_date', { count: 'exact' })
        .in('list_id', lists.map(l => l.id));

      let completedCount = 0;
      if (doneList) {
        const { count } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', doneList.id);
        completedCount = count || 0;
      }

      stats[board.id] = {
        total: totalCount || 0,
        completed: completedCount,
        overdue: ((cardData || []) as CardStatsRow[]).filter((card) => {
          if (!card.due_date || card.list_id === doneList?.id) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return new Date(`${card.due_date}T00:00:00`) < today;
        }).length,
        urgent: ((cardData || []) as CardStatsRow[]).filter((card) => card.priority === 'urgent').length,
      };
    }

    setBoardStats(stats);
    loadRecentActivities();
  };

  const loadRecentActivities = async () => {
    if (boards.length === 0) {
      setRecentActivities([]);
      return;
    }

    const boardNames = new Map(boards.map((board) => [board.id, board.name]));
    const { data, error } = await supabase
      .from('activities')
      .select('id, board_id, action, entity_type, metadata, created_at')
      .in('board_id', boards.map((board) => board.id))
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error loading manager activity:', error);
      setRecentActivities([]);
      return;
    }

    setRecentActivities(((data || []) as RecentActivity[]).map((activity) => ({
      ...activity,
      board_name: boardNames.get(activity.board_id) || 'Board',
    })));
  };

  const createBoard = async () => {
    if (!workspaceId || !newBoardName.trim()) return;

    const { data: boardId, error } = await supabase.rpc('create_board_as_owner', {
      p_workspace_id: workspaceId,
      p_board_name: newBoardName
    });

    if (error) {
      console.error('Error creating board:', error);
      alert(error.message || 'Failed to create board.');
      return;
    }

    if (boardId) {
      const defaultLists = [
        { name: 'To Do', board_id: boardId, position: 0 },
        { name: 'In Progress', board_id: boardId, position: 1 },
        { name: 'Done', board_id: boardId, position: 2 },
      ];

      await supabase.from('lists').insert(defaultLists);

      loadBoards();
      setNewBoardName('');
      setShowNewBoardModal(false);
    }
  };

  const renameBoard = async () => {
    if (!boardToRename || !renameBoardName.trim()) return;

    const { error } = await supabase
      .from('boards')
      .update({ name: renameBoardName })
      .eq('id', boardToRename.id);

    if (error) {
      console.error('Error renaming board:', error);
      return;
    }

    setBoards(boards.map(b => b.id === boardToRename.id ? { ...b, name: renameBoardName } : b));
    setShowRenameBoardModal(false);
    setBoardToRename(null);
    setRenameBoardName('');
  };

  const deleteBoard = async () => {
    if (!boardToDelete) return;

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardToDelete.id);

    if (error) {
      console.error('Error deleting board:', error);
      return;
    }

    setBoards(boards.filter(b => b.id !== boardToDelete.id));
    setShowDeleteBoardModal(false);
    setBoardToDelete(null);
  };

  const toggleDropdown = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === boardId ? null : boardId);
  };

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const dashboardStats = Object.values(boardStats).reduce(
    (totals, stats) => ({
      total: totals.total + stats.total,
      completed: totals.completed + stats.completed,
      overdue: totals.overdue + stats.overdue,
      urgent: totals.urgent + stats.urgent,
    }),
    { total: 0, completed: 0, overdue: 0, urgent: 0 }
  );
  const dashboardCompletion = dashboardStats.total > 0 ? Math.round((dashboardStats.completed / dashboardStats.total) * 100) : 0;

  const formatActivityMessage = (activity: RecentActivity) => {
    const target = activity.metadata?.title || activity.metadata?.name || activity.entity_type;
    if (activity.action === 'moved') return `Moved ${target} to ${activity.metadata?.to_list || 'another list'}`;
    return `${activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} ${target}`;
  };

  const navButtonClass = (section: 'dashboard' | 'boards' | 'activity') =>
    `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
      activeSection === section
        ? 'bg-white/[0.07] text-white border border-white/5'
        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
    }`;

  const sectionTitle = activeSection === 'boards'
    ? 'Boards'
    : activeSection === 'activity'
      ? 'Activity'
      : workspaceName;

  const sectionSubtitle = activeSection === 'boards'
    ? 'Open, rename, and review progress across this workspace.'
    : activeSection === 'activity'
      ? 'Recent work history across the boards in this workspace.'
      : 'Organize your work and boost productivity';

  const SkeletonDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="surface-card rounded-2xl p-5 h-44">
            <div className="skeleton w-10 h-10 rounded-xl mb-5" />
            <div className="skeleton w-24 h-4 rounded mb-4" />
            <div className="skeleton w-20 h-9 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((item) => (
          <div key={item} className="surface-card rounded-2xl p-6 h-56">
            <div className="skeleton w-12 h-12 rounded-xl mb-6" />
            <div className="skeleton w-36 h-5 rounded mb-6" />
            <div className="skeleton w-full h-2 rounded mb-4" />
            <div className="skeleton w-28 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-shell flex">
      <aside className="surface-sidebar hidden lg:flex w-72 flex-col p-4 relative z-10">
        <div className="px-3 py-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">TaskD</p>
          <h2 className="text-xl font-bold text-white truncate mt-2">{workspaceName || 'Workspace'}</h2>
        </div>
        <nav className="space-y-1">
          <button className={navButtonClass('dashboard')} onClick={() => setActiveSection('dashboard')}>
            <Home className="w-4 h-4 text-primary-300" />
            Dashboard
          </button>
          <button className={navButtonClass('boards')} onClick={() => setActiveSection('boards')}>
            <LayoutGrid className="w-4 h-4" />
            Boards
          </button>
          <button className={navButtonClass('activity')} onClick={() => setActiveSection('activity')}>
            <Activity className="w-4 h-4" />
            Activity
          </button>
          {onInvitationsClick && (
            <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] text-sm font-semibold" onClick={onInvitationsClick}>
              <span className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                Invitations
              </span>
              {pendingInvitationsCount > 0 && (
                <span className="tabular-nums min-w-5 h-5 rounded-full bg-danger-500 text-white text-xs flex items-center justify-center">
                  {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                </span>
              )}
            </button>
          )}
        </nav>
        <div className="mt-auto space-y-2">
          <button onClick={onBack} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Workspaces
          </button>
          <button onClick={onProfileClick} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.05] text-sm font-semibold">
            <User className="w-4 h-4" />
            Profile
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
      <header className="surface-header px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="lg:hidden flex items-center gap-2 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="p-2 rounded-xl hover:bg-white/[0.06] transition-all">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-semibold hidden sm:inline">Back to Workspaces</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-white/[0.04] border border-white/5 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 w-64 text-gray-100 placeholder:text-gray-500"
              />
            </div>

            {onInvitationsClick && (
              <button
                onClick={onInvitationsClick}
                className="relative p-3 rounded-xl bg-white/[0.04] border border-white/5 text-accent-300 hover:bg-white/[0.07] transition-all duration-200"
                title="View invitations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {pendingInvitationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-slow">
                    {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onProfileClick}
              className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-primary-300 hover:bg-white/[0.07] transition-all duration-200"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8 animate-fade-in-down">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {sectionTitle}
              </h1>
              <p className="text-gray-500">{sectionSubtitle}</p>
            </div>
            {activeSection !== 'activity' && filteredBoards.length > 0 && (
              <Button
                onClick={() => setShowNewBoardModal(true)}
                variant="primary"
                icon={Plus}
              >
                New Board
              </Button>
            )}
          </div>

          {loadingBoards ? (
            <SkeletonDashboard />
          ) : activeSection === 'dashboard' && boards.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-8 animate-fade-in-up">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total tasks', value: dashboardStats.total, icon: LayoutGrid, tone: 'primary' },
                  { label: 'Completed', value: `${dashboardStats.completed} (${dashboardCompletion}%)`, icon: CheckCircle2, tone: 'success' },
                  { label: 'Overdue', value: dashboardStats.overdue, icon: AlertTriangle, tone: 'danger' },
                  { label: 'Urgent', value: dashboardStats.urgent, icon: Clock, tone: 'warning' },
                ].map((item) => {
                  const Icon = item.icon;
                  const toneClasses = {
                    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
                    success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
                    danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
                    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
                  }[item.tone];

                  return (
                    <div key={item.label} className="surface-card surface-card-hover rounded-2xl p-5 min-h-44">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${toneClasses}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500">{item.label}</p>
                      <p className="tabular-nums text-3xl font-bold text-white mt-1">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary-300" />
                  <h2 className="text-sm font-bold text-white">Manager Activity</h2>
                </div>
                {recentActivities.length === 0 ? (
                  <div className="py-8 text-center">
                    <Activity className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="border-l border-white/10 pl-3">
                        <p className="text-sm font-medium text-gray-100 line-clamp-1">{formatActivityMessage(activity)}</p>
                        <p className="text-xs text-gray-500">{activity.board_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loadingBoards && activeSection === 'activity' && (
            <div className="surface-card rounded-2xl p-6 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-primary-300" />
                <h2 className="text-lg font-bold text-white">Manager Activity</h2>
              </div>
              {recentActivities.length === 0 ? (
                <div className="py-16 text-center">
                  <Activity className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="py-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-100">{formatActivityMessage(activity)}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.board_name}</p>
                      </div>
                      <span className="text-xs text-gray-600 tabular-nums">
                        {new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loadingBoards && activeSection !== 'activity' && filteredBoards.length === 0 ? (
            <div className="text-center py-20 animate-fade-in-up">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-center">
                  <LayoutGrid className="w-12 h-12 text-primary-300" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="w-8 h-8 text-accent-500 dark:text-accent-400 animate-bounce-subtle" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No boards yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Create your first board to start organizing your tasks and projects
              </p>
              <Button
                onClick={() => setShowNewBoardModal(true)}
                variant="primary"
                icon={Plus}
              >
                Create Your First Board
              </Button>
            </div>
          ) : activeSection !== 'activity' ? (
            <div id="boards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
              {filteredBoards.map((board, index) => {
                const stats = boardStats[board.id] || { total: 0, completed: 0, overdue: 0, urgent: 0 };
                const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                return (
                  <Card
                    key={board.id}
                    interactive
                    onClick={() => onBoardClick(board.id)}
                    className="group relative surface-card-hover"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                        <LayoutGrid className="w-6 h-6 text-primary-300" />
                      </div>
                      <div className="relative" ref={openDropdownId === board.id ? dropdownRef : null}>
                        <button
                          onClick={(e) => toggleDropdown(board.id, e)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
                          title="Board options"
                        >
                          <MoreVerticalIcon className="w-4 h-4" />
                        </button>
                        {openDropdownId === board.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoardToRename(board);
                                setRenameBoardName(board.name);
                                setShowRenameBoardModal(true);
                                setOpenDropdownId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                            >
                              <EditIcon className="w-4 h-4" />
                              Rename Board
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoardToDelete(board);
                                setShowDeleteBoardModal(true);
                                setOpenDropdownId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Delete Board
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">
                      {board.name}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Progress</span>
                        <span className="tabular-nums font-semibold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 tabular-nums">
                        <span>{stats.completed} completed</span>
                        <span>{stats.total} total</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        {stats.overdue > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 text-xs font-semibold">
                            {stats.overdue} overdue
                          </span>
                        )}
                        {stats.urgent > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 text-xs font-semibold">
                            {stats.urgent} urgent
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </div>
      </main>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showNewBoardModal}
        onClose={() => setShowNewBoardModal(false)}
        title="Create Board"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Board Name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="e.g., Sprint Planning, Marketing Campaign"
            onKeyDown={(e) => e.key === 'Enter' && createBoard()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setShowNewBoardModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={createBoard} variant="primary">
              Create Board
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRenameBoardModal}
        onClose={() => {
          setShowRenameBoardModal(false);
          setBoardToRename(null);
          setRenameBoardName('');
        }}
        title="Rename Board"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Board Name"
            value={renameBoardName}
            onChange={(e) => setRenameBoardName(e.target.value)}
            placeholder="New board name"
            onKeyDown={(e) => e.key === 'Enter' && renameBoard()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowRenameBoardModal(false);
                setBoardToRename(null);
                setRenameBoardName('');
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={renameBoard} variant="primary">
              Rename Board
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteBoardModal}
        onClose={() => setShowDeleteBoardModal(false)}
        title="Delete Board"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{boardToDelete?.name}"</span>? This action cannot be undone and will delete all lists and cards in this board.
          </p>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setShowDeleteBoardModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={deleteBoard} variant="primary" className="bg-red-600 hover:bg-red-700">
              Delete Board
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
