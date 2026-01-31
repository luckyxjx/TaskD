import { useEffect, useState, useRef } from 'react';
import { Search, User, ChevronLeft, ChevronRight, Plus, LayoutGrid, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { MoreVerticalIcon, EditIcon, TrashIcon } from '../icons';

interface Workspace {
  id: string;
  name: string;
}

interface Board {
  id: string;
  name: string;
  workspace_id: string;
}

interface BoardStats {
  [boardId: string]: {
    total: number;
    completed: number;
  };
}

interface DashboardProps {
  onBoardClick: (boardId: string) => void;
  onProfileClick: () => void;
  onInvitationsClick?: () => void;
  onSharedBoardsClick?: () => void;
}

export function Dashboard({ onBoardClick, onProfileClick, onInvitationsClick, onSharedBoardsClick }: DashboardProps) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardStats, setBoardStats] = useState<BoardStats>({});
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [showRenameBoardModal, setShowRenameBoardModal] = useState(false);
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);
  const [showRenameWorkspaceModal, setShowRenameWorkspaceModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [boardToRename, setBoardToRename] = useState<Board | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [workspaceToRename, setWorkspaceToRename] = useState<Workspace | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [renameBoardName, setRenameBoardName] = useState('');
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorkspaces();
    if (user) {
      loadPendingInvitations();
      
      // Subscribe to real-time invitation changes
      const invitationsSubscription = supabase
        .channel('user-invitations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'board_invitations'
          },
          (payload) => {
            console.log('Invitation change detected:', payload);
            // Check if this invitation is for the current user
            const invitation: any = payload.new || payload.old;
            if (invitation && invitation.email === user.email) {
              loadPendingInvitations();
            }
          }
        )
        .subscribe();

      // Also subscribe to board_members changes (for when invitations are accepted)
      const membersSubscription = supabase
        .channel('user-board-members')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'board_members',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Board member change detected:', payload);
            loadPendingInvitations();
          }
        )
        .subscribe();

      return () => {
        invitationsSubscription.unsubscribe();
        membersSubscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadBoards(selectedWorkspace);
      
      // Subscribe to real-time board changes for this workspace
      const boardsSubscription = supabase
        .channel(`boards:${selectedWorkspace}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'boards',
            filter: `workspace_id=eq.${selectedWorkspace}`
          },
          (payload) => {
            console.log('Board change detected:', payload);
            loadBoards(selectedWorkspace);
          }
        )
        .subscribe();

      return () => {
        boardsSubscription.unsubscribe();
      };
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (boards.length > 0) {
      loadBoardStats();
      
      // Set up real-time subscription for card changes
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(event.target as Node)) {
        setShowWorkspaceMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWorkspaces = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading workspaces:', error);
      return;
    }

    setWorkspaces(data || []);
    
    if (data && data.length > 0) {
      // Only set selected workspace if not already set
      if (!selectedWorkspace) {
        setSelectedWorkspace(data[0].id);
      }
    }
    // Don't show modal here - let the user click "New Workspace" button if they want to create one
  };

  const loadBoards = async (workspaceId: string) => {
    // Load boards owned by the workspace
    const { data: ownedBoards, error: ownedError } = await supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error loading owned boards:', ownedError);
      return;
    }

    setBoards(ownedBoards || []);
  };

  const loadPendingInvitations = async () => {
    if (!user?.email) return;

    const { count, error } = await supabase
      .from('board_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('email', user.email)
      .eq('accepted', false);

    if (error) {
      console.error('Error loading pending invitations:', error);
      return;
    }

    setPendingInvitationsCount(count || 0);
  };

  const loadBoardStats = async () => {
    const stats: BoardStats = {};

    for (const board of boards) {
      // Get all lists for this board
      const { data: lists } = await supabase
        .from('lists')
        .select('id, name')
        .eq('board_id', board.id);

      if (!lists || lists.length === 0) {
        stats[board.id] = { total: 0, completed: 0 };
        continue;
      }

      // Find the "Done" list
      const doneList = lists.find(list => list.name.toLowerCase() === 'done');

      // Get total cards count
      const { count: totalCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .in('list_id', lists.map(l => l.id));

      // Get completed cards count (cards in "Done" list)
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
      };
    }

    setBoardStats(stats);
  };

  const createWorkspace = async () => {
    if (!user || !newWorkspaceName.trim()) return;

    const { data, error } = await supabase
      .from('workspaces')
      .insert([{ name: newWorkspaceName, owner_id: user.id }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        alert('A workspace with this name already exists!');
      } else {
        console.error('Error creating workspace:', error);
        alert('Failed to create workspace. Please try again.');
      }
      return;
    }

    if (data) {
      setWorkspaces([data, ...workspaces]);
      setSelectedWorkspace(data.id);
      setNewWorkspaceName('');
      setShowNewWorkspaceModal(false);
    }
  };

  const createBoard = async () => {
    if (!selectedWorkspace || !newBoardName.trim()) return;

    // Use RPC function to create board (handles workspace ownership check)
    const { data: boardId, error } = await supabase.rpc('create_board_as_owner', {
      p_workspace_id: selectedWorkspace,
      p_board_name: newBoardName
    });

    if (error) {
      console.error('Error creating board:', error);
      alert(error.message || 'Failed to create board. Please try again.');
      return;
    }

    if (boardId) {
      // Create default lists for the new board
      const defaultLists = [
        { name: 'To Do', board_id: boardId, position: 0 },
        { name: 'In Progress', board_id: boardId, position: 1 },
        { name: 'Done', board_id: boardId, position: 2 },
      ];

      const { error: listsError } = await supabase
        .from('lists')
        .insert(defaultLists);

      if (listsError) {
        console.error('Error creating default lists:', listsError);
      }

      // Reload boards to show the new one
      loadBoards(selectedWorkspace);
      setNewBoardName('');
      setShowNewBoardModal(false);
    }
  };

  const handleRenameBoard = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoardToRename(board);
    setRenameBoardName(board.name);
    setShowRenameBoardModal(true);
    setOpenDropdownId(null);
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

  const handleDeleteBoard = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoardToDelete(board);
    setShowDeleteBoardModal(true);
    setOpenDropdownId(null);
  };

  const deleteBoard = async () => {
    if (!boardToDelete) return;

    // Use RPC function to delete board (handles workspace ownership check)
    const { error } = await supabase.rpc('delete_board_as_owner', {
      p_board_id: boardToDelete.id
    });

    if (error) {
      console.error('Error deleting board:', error);
      alert(error.message || 'Failed to delete board');
      return;
    }

    setBoards(boards.filter(b => b.id !== boardToDelete.id));
    setShowDeleteBoardModal(false);
    setBoardToDelete(null);
  };

  const handleRenameWorkspace = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToRename(workspace);
    setRenameWorkspaceName(workspace.name);
    setShowRenameWorkspaceModal(true);
    setShowWorkspaceMenu(null);
  };

  const renameWorkspace = async () => {
    if (!workspaceToRename || !renameWorkspaceName.trim()) return;

    const { error } = await supabase
      .from('workspaces')
      .update({ name: renameWorkspaceName })
      .eq('id', workspaceToRename.id);

    if (error) {
      console.error('Error renaming workspace:', error);
      return;
    }

    setWorkspaces(workspaces.map(w => w.id === workspaceToRename.id ? { ...w, name: renameWorkspaceName } : w));
    setShowRenameWorkspaceModal(false);
    setWorkspaceToRename(null);
    setRenameWorkspaceName('');
  };

  const handleDeleteWorkspace = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToDelete(workspace);
    setShowDeleteWorkspaceModal(true);
    setShowWorkspaceMenu(null);
  };

  const deleteWorkspace = async () => {
    if (!workspaceToDelete) return;

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceToDelete.id);

    if (error) {
      console.error('Error deleting workspace:', error);
      return;
    }

    const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceToDelete.id);
    setWorkspaces(remainingWorkspaces);
    
    // Select first remaining workspace, don't show modal
    if (remainingWorkspaces.length > 0) {
      setSelectedWorkspace(remainingWorkspaces[0].id);
    } else {
      setSelectedWorkspace(null);
      setBoards([]);
    }
    
    setShowDeleteWorkspaceModal(false);
    setWorkspaceToDelete(null);
  };

  const toggleWorkspaceMenu = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowWorkspaceMenu(showWorkspaceMenu === workspaceId ? null : workspaceId);
  };

  const toggleDropdown = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === boardId ? null : boardId);
  };

  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/20 dark:border-gray-700/30 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shadow-sm">
                  <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-bold text-lg text-primary-700 dark:text-primary-400">
                  Workspaces
                </h2>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {!sidebarCollapsed && (
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <div key={workspace.id} className="relative">
                    <button
                      onClick={() => setSelectedWorkspace(workspace.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                        selectedWorkspace === workspace.id
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="font-medium">{workspace.name}</span>
                      <button
                        onClick={(e) => toggleWorkspaceMenu(workspace.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-all"
                      >
                        <MoreVerticalIcon className="w-4 h-4" />
                      </button>
                    </button>
                    {showWorkspaceMenu === workspace.id && (
                      <div 
                        ref={workspaceDropdownRef}
                        className="absolute right-2 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10"
                      >
                        <button
                          onClick={(e) => handleRenameWorkspace(workspace, e)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                        >
                          <EditIcon className="w-4 h-4" />
                          Rename Workspace
                        </button>
                        <button
                          onClick={(e) => handleDeleteWorkspace(workspace, e)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete Workspace
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Shared with Me Section */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onSharedBoardsClick}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="font-medium">Shared with Me</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowNewWorkspaceModal(true)}
                  className="w-full text-left px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">New Workspace</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search boards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              {onInvitationsClick && (
                <button
                  onClick={onInvitationsClick}
                  className="relative p-3 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-all duration-200"
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
                className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-all duration-200"
              >
                <User className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {workspaces.length === 0 ? (
              <div className="text-center py-20 animate-fade-in-up">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-8 h-8 text-accent-500 dark:text-accent-400 animate-bounce-subtle" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No workspaces yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Create your first workspace to organize your boards and projects
                </p>
                <Button
                  onClick={() => setShowNewWorkspaceModal(true)}
                  variant="primary"
                  icon={Plus}
                >
                  Create Your First Workspace
                </Button>
              </div>
            ) : !selectedWorkspace ? (
              <div className="text-center py-20 animate-fade-in-up">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Select a workspace</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Choose a workspace from the sidebar to view its boards
                </p>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between mb-8 animate-fade-in-down">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {workspaces.find((w) => w.id === selectedWorkspace)?.name || 'Boards'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Organize your work and boost productivity</p>
              </div>
              <Button
                onClick={() => setShowNewBoardModal(true)}
                variant="primary"
                icon={Plus}
              >
                New Board
              </Button>
            </div>

            {filteredBoards.length === 0 ? (
              <div className="text-center py-20 animate-fade-in-up">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-8 h-8 text-accent-500 dark:text-accent-400 animate-bounce-subtle" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No boards yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                {filteredBoards.map((board, index) => {
                  const stats = boardStats[board.id] || { total: 0, completed: 0 };
                  const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                  
                  return (
                  <Card
                    key={board.id}
                    interactive
                    onClick={() => onBoardClick(board.id)}
                    className="group relative"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                        <LayoutGrid className="w-6 h-6 text-primary-600 dark:text-primary-400" />
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
                              onClick={(e) => handleRenameBoard(board, e)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                            >
                              <EditIcon className="w-4 h-4" />
                              Rename Board
                            </button>
                            <button
                              onClick={(e) => handleDeleteBoard(board, e)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Delete Board
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                      {board.name}
                    </h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {stats.completed}/{stats.total} tasks
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-success-500 to-success-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 text-right">{percentage}% complete</p>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
            </>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <Modal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
        title="Create Workspace"
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="My Awesome Workspace"
            onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowNewWorkspaceModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={createWorkspace} variant="primary">
              Create Workspace
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showNewBoardModal}
        onClose={() => setShowNewBoardModal(false)}
        title="Create Board"
      >
        <div className="space-y-4">
          <Input
            label="Board Name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="Project Board"
            onKeyDown={(e) => e.key === 'Enter' && createBoard()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowNewBoardModal(false)}
              variant="secondary"
            >
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
            placeholder="New Board Name"
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
        onClose={() => {
          setShowDeleteBoardModal(false);
          setBoardToDelete(null);
        }}
        title="Delete Board"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{boardToDelete?.name}"</span>? This action cannot be undone and will delete all lists and cards in this board.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowDeleteBoardModal(false);
                setBoardToDelete(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={deleteBoard} 
              variant="primary"
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Board
            </Button>
          </div>
        </div>
      </Modal>

      {/* Workspace Modals */}
      <Modal
        isOpen={showRenameWorkspaceModal}
        onClose={() => {
          setShowRenameWorkspaceModal(false);
          setWorkspaceToRename(null);
          setRenameWorkspaceName('');
        }}
        title="Rename Workspace"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            value={renameWorkspaceName}
            onChange={(e) => setRenameWorkspaceName(e.target.value)}
            placeholder="New Workspace Name"
            onKeyDown={(e) => e.key === 'Enter' && renameWorkspace()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowRenameWorkspaceModal(false);
                setWorkspaceToRename(null);
                setRenameWorkspaceName('');
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={renameWorkspace} variant="primary">
              Rename Workspace
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteWorkspaceModal}
        onClose={() => {
          setShowDeleteWorkspaceModal(false);
          setWorkspaceToDelete(null);
        }}
        title="Delete Workspace"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{workspaceToDelete?.name}"</span>? This action cannot be undone and will delete all boards, lists, and cards in this workspace.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowDeleteWorkspaceModal(false);
                setWorkspaceToDelete(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={deleteWorkspace} 
              variant="primary"
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Workspace
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
