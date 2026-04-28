import { useEffect, useState, useRef } from 'react';
import { Search, User, Users, ArrowLeft, Plus, LayoutGrid, Sparkles, CheckCircle2, Clock, AlertTriangle, Activity, Bell, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { ShareWorkspaceModal } from '../components/ShareWorkspaceModal';
import { ShareBoardModal } from '../components/ShareBoardModal';
import { AccessState } from '../components/AccessState';
import { PermissionSummary } from '../components/PermissionSummary';
import { MoreVerticalIcon, EditIcon, TrashIcon } from '../icons';

interface Board {
  id: string;
  name: string;
  workspace_id: string;
}

type WorkspaceRole = 'owner' | 'editor' | 'viewer';
type BoardRole = 'owner' | 'editor' | 'viewer';

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
  user_id: string | null;
  action: string;
  entity_type: string;
  metadata: { title?: string; name?: string; to_list?: string } | null;
  created_at: string;
  board_name?: string;
  actor_email?: string;
}

interface InvitationPayload {
  email?: string | null;
}

interface CardStatsRow {
  id: string;
  list_id: string;
  priority?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  reminder_at?: string | null;
}

interface WorkspaceCardSearchResult {
  id: string;
  title: string;
  description: string | null;
  label: string | null;
  due_date: string | null;
  reminder_at: string | null;
  assignee_id: string | null;
  board_id: string;
  board_name: string;
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
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole>('viewer');
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardRoles, setBoardRoles] = useState<Record<string, BoardRole>>({});
  const [boardStats, setBoardStats] = useState<BoardStats>({});
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [workspaceCards, setWorkspaceCards] = useState<WorkspaceCardSearchResult[]>([]);
  const [userEmailMap, setUserEmailMap] = useState<Record<string, string>>({});
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'boards' | 'activity'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInviteLauncherModal, setShowInviteLauncherModal] = useState(false);
  const [showWorkspaceInviteModal, setShowWorkspaceInviteModal] = useState(false);
  const [showBoardInvitePickerModal, setShowBoardInvitePickerModal] = useState(false);
  const [selectedBoardForInvite, setSelectedBoardForInvite] = useState<Board | null>(null);
  const [showBoardInviteModal, setShowBoardInviteModal] = useState(false);
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
    loadWorkspaceContext();
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
    if (boards.length > 0) {
      void loadBoardRoles(boards.map((board) => board.id));
    } else {
      setBoardRoles({});
    }
  }, [boards, workspaceRole, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mapWorkspaceRole = (role: string | null | undefined): WorkspaceRole => {
    if (role === 'owner') return 'owner';
    if (role === 'admin') return 'editor';
    return 'viewer';
  };

  const resolveUserEmails = async (userIds: string[]) => {
    const missingIds = Array.from(new Set(userIds.filter((userId) => userId && !userEmailMap[userId])));
    if (missingIds.length === 0) return;

    const results = await Promise.all(
      missingIds.map(async (userId) => {
        const { data, error } = await supabase.rpc('get_user_email', {
          user_uuid: userId
        });

        if (error || !data) {
          console.error('Error resolving user email:', error);
          return [userId, 'Unknown user'] as const;
        }

        return [userId, data as string] as const;
      })
    );

    setUserEmailMap((current) => ({
      ...current,
      ...Object.fromEntries(results),
    }));
  };

  const getBoardRole = (boardId: string): BoardRole => {
    if (workspaceRole === 'owner') return 'owner';
    return boardRoles[boardId] || 'viewer';
  };

  const canCreateBoards = workspaceRole === 'owner';

  const canManageBoard = (boardId: string) => {
    const role = getBoardRole(boardId);
    return workspaceRole === 'owner' || role === 'owner';
  };

  const canInviteToWorkspace = workspaceRole === 'owner';

  const invitableBoards = boards.filter((board) => canManageBoard(board.id));

  const canEditBoard = (boardId: string) => {
    const role = getBoardRole(boardId);
    return workspaceRole === 'owner' || role === 'owner' || role === 'editor';
  };

  const getBoardPermissionMessage = (boardId: string) => {
    const role = getBoardRole(boardId);

    if (workspaceRole === 'owner') {
      return 'You own this workspace and can fully manage all boards inside it.';
    }

    if (role === 'owner') {
      return 'You own this board and can rename or delete it.';
    }

    if (role === 'editor') {
      return 'You can edit cards and lists inside this board, but only owners can rename or delete it.';
    }

    return 'You can view this board, but editing and board management are disabled for viewers.';
  };

  const loadWorkspaceContext = async () => {
    setAccessDenied(false);
    setWorkspaceError(null);
    const { data, error } = await supabase
      .from('workspaces')
      .select('name, owner_id')
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error loading workspace:', error);
      setAccessDenied(true);
      setWorkspaceError('You do not have access to this workspace, or it no longer exists.');
      setLoadingBoards(false);
      return;
    }

    if (data) {
      setWorkspaceName(data.name);

      if (user?.id && data.owner_id === user.id) {
        setWorkspaceRole('owner');
        return;
      }
    }

    if (!user?.id) {
      setWorkspaceRole('viewer');
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('Error loading workspace role:', membershipError);
      setWorkspaceRole('viewer');
      return;
    }

    if (!membership) {
      setAccessDenied(true);
      setWorkspaceError('You do not have access to this workspace.');
      setLoadingBoards(false);
      return;
    }

    setWorkspaceRole(mapWorkspaceRole(membership?.role));
  };

  const loadBoards = async () => {
    setLoadingBoards(true);
    setAccessDenied(false);
    setWorkspaceError(null);
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading boards:', error);
      setAccessDenied(true);
      setWorkspaceError('Unable to load boards for this workspace.');
      setLoadingBoards(false);
      return;
    }

    setBoards(data || []);
    void loadBoardRoles((data || []).map((board) => board.id));
    setLoadingBoards(false);
  };

  const loadBoardRoles = async (boardIds: string[]) => {
    if (!user?.id || boardIds.length === 0) {
      setBoardRoles({});
      return;
    }

    if (workspaceRole === 'owner') {
      setBoardRoles(
        boardIds.reduce<Record<string, BoardRole>>((acc, boardId) => {
          acc[boardId] = 'owner';
          return acc;
        }, {})
      );
      return;
    }

    const { data, error } = await supabase
      .from('board_members')
      .select('board_id, role')
      .eq('user_id', user.id)
      .in('board_id', boardIds);

    if (error) {
      console.error('Error loading board roles:', error);
      setBoardRoles({});
      return;
    }

    const membershipMap = new Map(
      ((data || []) as Array<{ board_id: string; role: BoardRole }>).map((membership) => [
        membership.board_id,
        membership.role,
      ])
    );

    setBoardRoles(
      boardIds.reduce<Record<string, BoardRole>>((acc, boardId) => {
        acc[boardId] = membershipMap.get(boardId) || 'viewer';
        return acc;
      }, {})
    );
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
        .select('id, list_id, priority, due_date, assignee_id, reminder_at', { count: 'exact' })
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
    loadWorkspaceCards();
  };

  const loadWorkspaceCards = async () => {
    if (boards.length === 0) {
      setWorkspaceCards([]);
      return;
    }

    const boardNames = new Map(boards.map((board) => [board.id, board.name]));
    const { data: lists, error: listsError } = await supabase
      .from('lists')
      .select('id, board_id')
      .in('board_id', boards.map((board) => board.id));

    if (listsError || !lists || lists.length === 0) {
      if (listsError) console.error('Error loading lists for global search:', listsError);
      setWorkspaceCards([]);
      return;
    }

    const listBoardMap = new Map((lists as { id: string; board_id: string }[]).map((list) => [list.id, list.board_id]));
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('id, list_id, title, description, label, due_date, reminder_at, assignee_id')
      .in('list_id', lists.map((list) => list.id))
      .order('updated_at', { ascending: false })
      .limit(80);

    if (cardsError) {
      console.error('Error loading global card search:', cardsError);
      setWorkspaceCards([]);
      return;
    }

    setWorkspaceCards(((cardsData || []) as Array<{
      id: string;
      list_id: string;
      title: string;
      description: string | null;
      label: string | null;
      due_date: string | null;
      reminder_at: string | null;
      assignee_id: string | null;
    }>).map((card) => {
      const boardId = listBoardMap.get(card.list_id) || '';
      return {
        id: card.id,
        title: card.title,
        description: card.description,
        label: card.label,
        due_date: card.due_date,
        reminder_at: card.reminder_at,
        assignee_id: card.assignee_id,
        board_id: boardId,
        board_name: boardNames.get(boardId) || 'Board',
      };
    }));

    void resolveUserEmails(
      ((cardsData || []) as Array<{ assignee_id: string | null }>)
        .map((card) => card.assignee_id)
        .filter((userId): userId is string => Boolean(userId))
    );
  };

  const loadRecentActivities = async () => {
    if (boards.length === 0) {
      setRecentActivities([]);
      return;
    }

    const boardNames = new Map(boards.map((board) => [board.id, board.name]));
    const { data, error } = await supabase
      .from('activities')
      .select('id, board_id, user_id, action, entity_type, metadata, created_at')
      .in('board_id', boards.map((board) => board.id))
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      console.error('Error loading manager activity:', error);
      setRecentActivities([]);
      return;
    }

    const activities = ((data || []) as RecentActivity[]).map((activity) => ({
      ...activity,
      board_name: boardNames.get(activity.board_id) || 'Board',
    }));

    setRecentActivities(activities);
    void resolveUserEmails(
      activities
        .map((activity) => activity.user_id)
        .filter((userId): userId is string => Boolean(userId))
    );
  };

  const createBoard = async () => {
    if (!workspaceId || !newBoardName.trim() || !canCreateBoards) return;

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
    if (!boardToRename || !renameBoardName.trim() || !canManageBoard(boardToRename.id)) return;

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
    if (!boardToDelete || !canManageBoard(boardToDelete.id)) return;

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

  const openInviteLauncher = () => {
    setShowInviteLauncherModal(true);
  };

  const openWorkspaceInviteFlow = () => {
    setShowInviteLauncherModal(false);
    setShowWorkspaceInviteModal(true);
  };

  const openBoardInvitePicker = () => {
    setShowInviteLauncherModal(false);
    setShowBoardInvitePickerModal(true);
  };

  const openBoardInviteFlow = (board: Board) => {
    setSelectedBoardForInvite(board);
    setShowBoardInvitePickerModal(false);
    setShowBoardInviteModal(true);
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
  const activeBoards = boards.filter((board) => (boardStats[board.id]?.total || 0) > 0).length;

  const getUserLabel = (userId?: string | null) => {
    if (!userId) return 'Unassigned';
    return userEmailMap[userId] || 'Loading user...';
  };

  const formatActivityMessage = (activity: RecentActivity) => {
    const target = activity.metadata?.title || activity.metadata?.name || activity.entity_type;
    if (activity.action === 'moved') return `Moved ${target} to ${activity.metadata?.to_list || 'another list'}`;
    return `${activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} ${target}`;
  };

  const activityCountsByDay = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const count = recentActivities.filter((activity) => activity.created_at.slice(0, 10) === key).length;
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count,
    };
  });
  const maxActivityCount = Math.max(1, ...activityCountsByDay.map((day) => day.count));

  const globalSearchQuery = searchQuery.trim().toLowerCase();
  const globalBoardResults = globalSearchQuery
    ? boards.filter((board) => board.name.toLowerCase().includes(globalSearchQuery)).slice(0, 4)
    : [];
  const globalCardResults = globalSearchQuery
    ? workspaceCards.filter((card) => {
      return card.title.toLowerCase().includes(globalSearchQuery)
        || (card.description || '').toLowerCase().includes(globalSearchQuery)
        || (card.label || '').toLowerCase().includes(globalSearchQuery)
        || card.board_name.toLowerCase().includes(globalSearchQuery)
        || (card.due_date || '').includes(globalSearchQuery);
    }).slice(0, 6)
    : [];

  const now = new Date();
  const upcomingNotifications = workspaceCards
    .filter((card) => {
      if (card.reminder_at && new Date(card.reminder_at) <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) return true;
      if (card.due_date) {
        const due = new Date(`${card.due_date}T23:59:59`);
        return due <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
      return false;
    })
    .slice(0, 8);

  const overdueCards = workspaceCards.filter((card) => {
    if (!card.due_date) return false;
    return new Date(`${card.due_date}T23:59:59`) < now;
  });

  const assigneeWorkload = workspaceCards.reduce<Record<string, number>>((acc, card) => {
    const key = card.assignee_id || 'unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topWorkload = Object.entries(assigneeWorkload)
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 5);

  const overdueByAssignee = overdueCards.reduce<Record<string, number>>((acc, card) => {
    const key = card.assignee_id || 'unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topOverdueAssignees = Object.entries(overdueByAssignee)
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 5);

  const contributorActivity = recentActivities.reduce<Record<string, number>>((acc, activity) => {
    const key = activity.user_id || 'system';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topContributors = Object.entries(contributorActivity)
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 5);
  const activeContributorCount = Object.keys(contributorActivity).filter((key) => key !== 'system').length;

  const completionCountsByDay = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const count = recentActivities.filter((activity) => {
      const happenedOnDay = activity.created_at.slice(0, 10) === key;
      if (!happenedOnDay) return false;
      if (activity.action === 'completed') return true;
      return activity.action === 'moved' && (activity.metadata?.to_list || '').toLowerCase() === 'done';
    }).length;
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count,
    };
  });
  const maxCompletionCount = Math.max(1, ...completionCountsByDay.map((day) => day.count));

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

  const workspaceRoleTone = workspaceRole === 'owner'
    ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
    : workspaceRole === 'editor'
      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
      : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  const workspacePermissionDescription = workspaceRole === 'owner'
    ? 'You can create boards, rename boards, delete boards, and manage access across the workspace.'
    : workspaceRole === 'editor'
      ? 'You can work inside boards where you are an editor, but workspace-level board management is restricted.'
      : 'You have read-only visibility. Board management and content mutations are blocked unless a board-specific role grants more access.';
  const workspaceCapabilities = workspaceRole === 'owner'
    ? ['Create boards', 'Rename/delete boards', 'View analytics', 'Manage access']
    : workspaceRole === 'editor'
      ? ['Open assigned boards', 'Edit cards/lists inside boards', 'View analytics']
      : ['View workspace', 'Open shared boards', 'Read-only access'];

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

  if (accessDenied) {
    return <AccessState message={workspaceError || 'You do not have access to this workspace.'} actionLabel="Back to Workspaces" onAction={onBack} />;
  }

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
            <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] text-sm font-semibold" onClick={openInviteLauncher}>
              <span className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                Invite People
              </span>
              {pendingInvitationsCount > 0 && (
                <span className="tabular-nums min-w-5 h-5 rounded-full bg-danger-500 text-white text-xs flex items-center justify-center">
                  {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                </span>
              )}
            </button>
          )}
          <Link
            to="/roles"
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] text-sm font-semibold"
          >
            <Users className="w-4 h-4" />
            Role Matrix
          </Link>
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
                placeholder="Search boards, cards, labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-white/[0.04] border border-white/5 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 w-64 text-gray-100 placeholder:text-gray-500"
              />
              {globalSearchQuery && (
                <div className="absolute right-0 top-full mt-2 w-[420px] max-h-[420px] overflow-y-auto surface-card rounded-xl p-3 z-30">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="text-xs font-bold uppercase text-gray-500">Global search</span>
                    <span className="text-xs text-gray-600 tabular-nums">{globalBoardResults.length + globalCardResults.length} results</span>
                  </div>
                  {globalBoardResults.length === 0 && globalCardResults.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-6 text-center">No matching boards or cards</p>
                  ) : (
                    <div className="space-y-2">
                      {globalBoardResults.map((board) => (
                        <button
                          key={board.id}
                          onClick={() => {
                            setSearchQuery('');
                            onBoardClick(board.id);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.06]"
                        >
                          <span className="block text-sm font-semibold text-white">{board.name}</span>
                          <span className="text-xs text-gray-500">Board</span>
                        </button>
                      ))}
                      {globalCardResults.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => {
                            setSearchQuery('');
                            onBoardClick(card.board_id);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.06]"
                        >
                          <span className="block text-sm font-semibold text-white">{card.title}</span>
                          <span className="text-xs text-gray-500">
                            Card in {card.board_name}{card.label ? ` • ${card.label}` : ''}{card.due_date ? ` • due ${card.due_date}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {onInvitationsClick && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 rounded-xl bg-white/[0.04] border border-white/5 text-accent-300 hover:bg-white/[0.07] transition-all duration-200"
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {(pendingInvitationsCount + upcomingNotifications.length) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-slow">
                      {pendingInvitationsCount + upcomingNotifications.length > 9 ? '9+' : pendingInvitationsCount + upcomingNotifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-96 surface-card rounded-xl p-4 z-40">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">Notifications</h3>
                      {pendingInvitationsCount > 0 && (
                        <button onClick={onInvitationsClick} className="text-xs font-semibold text-primary-300">View invites</button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {pendingInvitationsCount > 0 && (
                        <button onClick={onInvitationsClick} className="w-full text-left rounded-lg bg-white/[0.04] p-3">
                          <p className="text-sm font-semibold text-white">{pendingInvitationsCount} pending invitation{pendingInvitationsCount === 1 ? '' : 's'}</p>
                          <p className="text-xs text-gray-500">Workspace or board access needs review.</p>
                        </button>
                      )}
                      {upcomingNotifications.map((card) => (
                        <button key={card.id} onClick={() => onBoardClick(card.board_id)} className="w-full text-left rounded-lg bg-white/[0.04] p-3 hover:bg-white/[0.07]">
                          <p className="text-sm font-semibold text-white">{card.title}</p>
                          <p className="text-xs text-gray-500">
                            {card.reminder_at ? `Reminder ${new Date(card.reminder_at).toLocaleString()}` : `Due ${card.due_date}`} in {card.board_name}
                          </p>
                        </button>
                      ))}
                      {pendingInvitationsCount === 0 && upcomingNotifications.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-8">No notifications</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${workspaceRoleTone}`}>
                  <Users className="w-4 h-4" />
                  Workspace role: {workspaceRole.charAt(0).toUpperCase() + workspaceRole.slice(1)}
                </span>
                {workspaceRole !== 'owner' && (
                  <span className="text-sm text-gray-500">
                    Only workspace owners can create, rename, or delete boards here.
                  </span>
                )}
              </div>
              <div className="mt-4 max-w-4xl">
                <PermissionSummary
                  label="Workspace access"
                  role={workspaceRole}
                  description={workspacePermissionDescription}
                  capabilities={workspaceCapabilities}
                />
              </div>
            </div>
            {activeSection !== 'activity' && filteredBoards.length > 0 && canCreateBoards && (
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
                  { label: 'Active boards', value: activeBoards, icon: Activity, tone: 'primary' },
                  { label: 'Due alerts', value: upcomingNotifications.length, icon: Bell, tone: 'warning' },
                  { label: 'Overdue cards', value: overdueCards.length, icon: AlertTriangle, tone: 'danger' },
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
                <div className="flex items-end gap-2 h-20 mb-5 border-b border-white/5 pb-4">
                  {activityCountsByDay.map((day) => (
                    <div key={day.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-lg bg-primary-500/70 min-h-1"
                        style={{ height: `${Math.max(6, (day.count / maxActivityCount) * 56)}px` }}
                        title={`${day.count} activities`}
                      />
                      <span className="text-[10px] text-gray-600">{day.label}</span>
                    </div>
                  ))}
                </div>
                {recentActivities.length === 0 ? (
                  <div className="py-8 text-center">
                    <Activity className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.slice(0, 6).map((activity) => (
                      <div key={activity.id} className="border-l border-white/10 pl-3">
                        <p className="text-sm font-medium text-gray-100 line-clamp-1">{formatActivityMessage(activity)}</p>
                        <p className="text-xs text-gray-500">{activity.board_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="surface-card rounded-2xl p-5 xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Assignee Workload</h2>
                  <span className="text-xs text-gray-600">Cards by assignee</span>
                </div>
                <div className="space-y-3">
                  {topWorkload.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No workload data yet</p>
                  ) : topWorkload.map(([userId, count]) => (
                    <div key={userId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-300">{getUserLabel(userId === 'unassigned' ? null : userId)}</span>
                        <span className="text-gray-500 tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(8, (count / Math.max(1, dashboardStats.total)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Overdue by Assignee</h2>
                  <span className="text-xs text-gray-600">Ownership risk</span>
                </div>
                <div className="space-y-3">
                  {topOverdueAssignees.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No overdue assignments</p>
                  ) : topOverdueAssignees.map(([userId, count]) => (
                    <div key={userId} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-3">
                      <span className="text-sm text-gray-200">{getUserLabel(userId === 'unassigned' ? null : userId)}</span>
                      <span className="text-sm font-semibold text-danger-300 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Completion Trend</h2>
                  <span className="text-xs text-gray-600">Last 7 days</span>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {completionCountsByDay.map((day) => (
                    <div key={day.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-lg bg-success-500/70 min-h-1"
                        style={{ height: `${Math.max(6, (day.count / maxCompletionCount) * 72)}px` }}
                        title={`${day.count} tasks completed`}
                      />
                      <span className="text-[10px] text-gray-600">{day.label}</span>
                      <span className="text-[10px] text-gray-500 tabular-nums">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Active Contributors</h2>
                  <span className="text-xs text-gray-600">{activeContributorCount} active</span>
                </div>
                <div className="space-y-3">
                  {topContributors.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No contributor activity yet</p>
                  ) : topContributors.map(([userId, count]) => (
                    <div key={userId} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-3">
                      <div>
                        <p className="text-sm text-gray-200">{userId === 'system' ? 'System' : getUserLabel(userId)}</p>
                        <p className="text-xs text-gray-500">Recent activity events</p>
                      </div>
                      <span className="text-sm font-semibold text-primary-300 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loadingBoards && activeSection === 'activity' && (
            <div className="surface-card rounded-2xl p-6 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-primary-300" />
                <h2 className="text-lg font-bold text-white">Manager Activity</h2>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-300">Activity count by day</p>
                  <p className="text-xs text-gray-600">Last 7 days</p>
                </div>
                <div className="flex items-end gap-3 h-32">
                  {activityCountsByDay.map((day) => (
                    <div key={day.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-primary-600 to-accent-500 min-h-1"
                        style={{ height: `${Math.max(6, (day.count / maxActivityCount) * 96)}px` }}
                      />
                      <span className="text-xs text-gray-500">{day.label}</span>
                      <span className="text-xs tabular-nums text-gray-400">{day.count}</span>
                    </div>
                  ))}
                </div>
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
              {canCreateBoards ? (
                <Button
                  onClick={() => setShowNewBoardModal(true)}
                  variant="primary"
                  icon={Plus}
                >
                  Create Your First Board
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  You can view boards in this workspace, but only the workspace owner can create new boards.
                </p>
              )}
            </div>
          ) : activeSection !== 'activity' ? (
            <div id="boards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
              {filteredBoards.map((board, index) => {
                const stats = boardStats[board.id] || { total: 0, completed: 0, overdue: 0, urgent: 0 };
                const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                const boardRole = getBoardRole(board.id);
                const boardRoleTone = boardRole === 'owner'
                  ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                  : boardRole === 'editor'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                const boardPermissionMessage = getBoardPermissionMessage(board.id);

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
                      <div className="flex items-start gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${boardRoleTone}`}>
                          {boardRole.charAt(0).toUpperCase() + boardRole.slice(1)}
                        </span>
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
                                if (!canManageBoard(board.id)) return;
                                setBoardToRename(board);
                                setRenameBoardName(board.name);
                                setShowRenameBoardModal(true);
                                setOpenDropdownId(null);
                              }}
                              disabled={!canManageBoard(board.id)}
                              title={!canManageBoard(board.id) ? boardPermissionMessage : 'Rename board'}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                                canManageBoard(board.id)
                                  ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <EditIcon className="w-4 h-4" />
                              Rename Board
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canManageBoard(board.id)) return;
                                setBoardToDelete(board);
                                setShowDeleteBoardModal(true);
                                setOpenDropdownId(null);
                              }}
                              disabled={!canManageBoard(board.id)}
                              title={!canManageBoard(board.id) ? boardPermissionMessage : 'Delete board'}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                                canManageBoard(board.id)
                                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <TrashIcon className="w-4 h-4" />
                              Delete Board
                            </button>
                            <p className="px-4 pt-2 mt-1 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                              {boardPermissionMessage}
                            </p>
                          </div>
                        )}
                      </div>
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
                      <p className="pt-2 text-xs text-gray-500">
                        {canEditBoard(board.id)
                          ? boardRole === 'owner'
                            ? 'Full board management available.'
                            : 'Can edit cards and lists inside this board.'
                          : 'Read-only access.'}
                      </p>
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

      <Modal
        isOpen={showInviteLauncherModal}
        onClose={() => setShowInviteLauncherModal(false)}
        title="Invite People"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose where you want to grant access from this workspace.
          </p>
          <button
            onClick={openWorkspaceInviteFlow}
            disabled={!canInviteToWorkspace}
            title={!canInviteToWorkspace ? 'Only workspace owners can invite users to the whole workspace.' : 'Invite to this workspace'}
            className={`w-full rounded-2xl border px-5 py-5 text-left transition-all ${
              canInviteToWorkspace
                ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60 cursor-not-allowed'
            }`}
          >
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Invite to this workspace</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Send one invite that grants access to all boards in this workspace.
            </p>
          </button>
          <button
            onClick={openBoardInvitePicker}
            disabled={invitableBoards.length === 0}
            title={invitableBoards.length === 0 ? 'You do not own any boards here that you can invite people to.' : 'Invite to a specific board'}
            className={`w-full rounded-2xl border px-5 py-5 text-left transition-all ${
              invitableBoards.length > 0
                ? 'border-accent-200 dark:border-accent-800 bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/30'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60 cursor-not-allowed'
            }`}
          >
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Invite to specific board</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Pick one board and send a board-level editor or viewer invite.
            </p>
          </button>
          <div className="flex justify-end pt-2">
            <Button onClick={onInvitationsClick} variant="secondary">
              Open Inbox
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBoardInvitePickerModal}
        onClose={() => setShowBoardInvitePickerModal(false)}
        title="Select Board to Invite To"
        size="md"
      >
        <div className="space-y-3">
          {invitableBoards.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You do not own any boards in this workspace that can send board-specific invites.
            </p>
          ) : (
            invitableBoards.map((board) => (
              <button
                key={board.id}
                onClick={() => openBoardInviteFlow(board)}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 text-left hover:border-primary-300 dark:hover:border-primary-700 transition-all"
              >
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{board.name}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Send editor or viewer access for this board only.
                </p>
              </button>
            ))
          )}
        </div>
      </Modal>

      <ShareWorkspaceModal
        isOpen={showWorkspaceInviteModal}
        onClose={() => setShowWorkspaceInviteModal(false)}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />

      {selectedBoardForInvite && (
        <ShareBoardModal
          isOpen={showBoardInviteModal}
          onClose={() => {
            setShowBoardInviteModal(false);
            setSelectedBoardForInvite(null);
          }}
          boardId={selectedBoardForInvite.id}
          boardName={selectedBoardForInvite.name}
        />
      )}
    </div>
  );
}
