import { useEffect, useState, useRef } from 'react';
import { LayoutGrid, Plus, User, Users, Crown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { ShareWorkspaceModal } from '../components/ShareWorkspaceModal';
import { MoreVerticalIcon, EditIcon, TrashIcon, ShareIcon } from '../icons';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

interface SharedBoard {
  id: string;
  name: string;
  workspace_id: string;
  workspace_name?: string;
}

interface InvitationPayload {
  email?: string | null;
}

interface WorkspacesProps {
  onWorkspaceClick: (workspaceId: string) => void;
  onBoardClick?: (boardId: string) => void;
  onProfileClick: () => void;
  onInvitationsClick?: () => void;
}

export function Workspaces({ onWorkspaceClick, onBoardClick, onProfileClick, onInvitationsClick }: WorkspacesProps) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [sharedSubTab, setSharedSubTab] = useState<'workspaces' | 'boards'>('workspaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openBoardDropdownId, setOpenBoardDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const boardDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
      loadSharedBoards();
      loadPendingInvitations();

      // Real-time subscription for board invitations
      const boardInvitationsSubscription = supabase
        .channel('user-board-invitations')
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
        .channel('user-workspace-invitations')
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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(event.target as Node)) {
        setOpenBoardDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWorkspaces = async () => {
    if (!user) return;

    setLoading(true);

    // Get workspaces where user is a member
    const { data: memberWorkspaces, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Error loading workspace memberships:', memberError);
      setLoading(false);
      return;
    }

    const workspaceIds = memberWorkspaces?.map(m => m.workspace_id) || [];

    if (workspaceIds.length === 0) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    // Get workspace details
    const { data: workspacesData, error: workspacesError } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
      .order('created_at', { ascending: false });

    if (workspacesError) {
      console.error('Error loading workspaces:', workspacesError);
      setLoading(false);
      return;
    }

    // Get member counts for each workspace
    const workspacesWithCounts = await Promise.all(
      (workspacesData || []).map(async (workspace) => {
        const { count } = await supabase
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id);

        return {
          ...workspace,
          member_count: count || 0
        };
      })
    );

    setWorkspaces(workspacesWithCounts);
    setLoading(false);
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

  const loadSharedBoards = async () => {
    if (!user) return;

    // Get boards where user is a member but not the owner
    const { data: memberBoards, error: memberError } = await supabase
      .from('board_members')
      .select('board_id, role')
      .eq('user_id', user.id)
      .neq('role', 'owner'); // Only boards where user is NOT the owner

    if (memberError) {
      console.error('Error loading board memberships:', memberError);
      return;
    }

    const boardIds = memberBoards?.map(m => m.board_id) || [];

    if (boardIds.length === 0) {
      setSharedBoards([]);
      return;
    }

    // Get board details
    const { data: boardsData, error: boardsError } = await supabase
      .from('boards')
      .select('id, name, workspace_id')
      .in('id', boardIds);

    if (boardsError) {
      console.error('Error loading shared boards:', boardsError);
      return;
    }

    // Get workspace names for each board
    const boardsWithWorkspace = await Promise.all(
      (boardsData || []).map(async (board) => {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', board.workspace_id)
          .single();

        return {
          id: board.id,
          name: board.name,
          workspace_id: board.workspace_id,
          workspace_name: workspace?.name || 'Unknown Workspace'
        };
      })
    );

    setSharedBoards(boardsWithWorkspace);
  };

  const renameWorkspace = async () => {
    if (!selectedWorkspace || !renameWorkspaceName.trim()) return;

    const { error } = await supabase
      .from('workspaces')
      .update({ name: renameWorkspaceName })
      .eq('id', selectedWorkspace.id);

    if (error) {
      console.error('Error renaming workspace:', error);
      alert('Failed to rename workspace');
      return;
    }

    setWorkspaces(workspaces.map(w => 
      w.id === selectedWorkspace.id ? { ...w, name: renameWorkspaceName } : w
    ));
    setShowRenameModal(false);
    setSelectedWorkspace(null);
    setRenameWorkspaceName('');
  };

  const deleteWorkspace = async () => {
    if (!selectedWorkspace) return;

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', selectedWorkspace.id);

    if (error) {
      console.error('Error deleting workspace:', error);
      alert('Failed to delete workspace');
      return;
    }

    setWorkspaces(workspaces.filter(w => w.id !== selectedWorkspace.id));
    setShowDeleteModal(false);
    setSelectedWorkspace(null);
  };

  const toggleDropdown = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === workspaceId ? null : workspaceId);
  };

  const toggleBoardDropdown = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenBoardDropdownId(openBoardDropdownId === boardId ? null : boardId);
  };

  const leaveBoard = async (boardId: string, boardName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    if (!confirm(`Are you sure you want to leave "${boardName}"? You will lose access to this board.`)) {
      return;
    }

    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving board:', error);
      alert('Failed to leave board');
      return;
    }

    // Remove from local state
    setSharedBoards(sharedBoards.filter(b => b.id !== boardId));
    setOpenBoardDropdownId(null);
  };

  const createWorkspace = async () => {
    if (!user || !newWorkspaceName.trim()) return;

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert([{ name: newWorkspaceName, owner_id: user.id }])
      .select()
      .single();

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError);
      alert('Failed to create workspace. Please try again.');
      return;
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert([{
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner'
      }]);

    if (memberError) {
      console.error('Error adding workspace member:', memberError);
    }

    setNewWorkspaceName('');
    setShowNewWorkspaceModal(false);
    loadWorkspaces();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Your Workspaces
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a workspace to get started</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/roles"
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200"
            >
              Role Matrix
            </Link>
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
      <main className="max-w-7xl mx-auto px-6 py-12">
        {workspaces.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <LayoutGrid className="w-12 h-12 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Plus className="w-8 h-8 text-accent-500 dark:text-accent-400 animate-bounce-subtle" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">No workspaces yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create your first workspace to organize your boards and collaborate with your team
            </p>
            <Button
              onClick={() => setShowNewWorkspaceModal(true)}
              variant="primary"
              icon={Plus}
              className="text-lg px-8 py-4"
            >
              Create Your First Workspace
            </Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setActiveTab('my')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'my'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                My Workspaces ({workspaces.filter(w => w.owner_id === user?.id).length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('shared');
                  setSearchQuery('');
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'shared'
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Shared with Me ({workspaces.filter(w => w.owner_id !== user?.id).length + sharedBoards.length})
              </button>
            </div>

            {/* Shared Sub-tabs and Search */}
            {activeTab === 'shared' && (
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSharedSubTab('workspaces');
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      sharedSubTab === 'workspaces'
                        ? 'bg-white dark:bg-gray-800 text-accent-700 dark:text-accent-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Workspaces ({workspaces.filter(w => w.owner_id !== user?.id).length})
                  </button>
                  <button
                    onClick={() => {
                      setSharedSubTab('boards');
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      sharedSubTab === 'boards'
                        ? 'bg-white dark:bg-gray-800 text-accent-700 dark:text-accent-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Boards ({sharedBoards.length})
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={`Search ${sharedSubTab === 'workspaces' ? 'workspaces' : 'boards'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent outline-none transition-all duration-200 w-64 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'my' ? 'My Workspaces' : 
                  sharedSubTab === 'workspaces' ? 'Shared Workspaces' : 'Shared Boards'}
              </h2>
              {activeTab === 'my' && (
                <Button
                  onClick={() => setShowNewWorkspaceModal(true)}
                  variant="primary"
                  icon={Plus}
                >
                  New Workspace
                </Button>
              )}
            </div>

            {/* My Workspaces Grid */}
            {activeTab === 'my' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {workspaces.filter(w => w.owner_id === user?.id).length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="relative inline-block mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <Users className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No workspaces yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Create your first workspace to get started
                    </p>
                  </div>
                ) : (
                  workspaces
                    .filter(w => w.owner_id === user?.id)
                    .map((workspace, index) => (
                <Card
                  key={workspace.id}
                  interactive
                  onClick={() => onWorkspaceClick(workspace.id)}
                  className="group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                        <LayoutGrid className="w-6 h-6 text-white" />
                        {workspace.owner_id === user?.id && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning-400 flex items-center justify-center">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {workspace.owner_id === user?.id && (
                        <div className="relative" ref={openDropdownId === workspace.id ? dropdownRef : null}>
                          <button
                            onClick={(e) => toggleDropdown(workspace.id, e)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
                            title="Workspace options"
                          >
                            <MoreVerticalIcon className="w-4 h-4" />
                          </button>
                          {openDropdownId === workspace.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkspace(workspace);
                                  setShowShareModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                              >
                                <ShareIcon className="w-4 h-4" />
                                Share Workspace
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkspace(workspace);
                                  setRenameWorkspaceName(workspace.name);
                                  setShowRenameModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                              >
                                <EditIcon className="w-4 h-4" />
                                Rename Workspace
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkspace(workspace);
                                  setShowDeleteModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete Workspace
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {workspace.name}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-auto">
                      <Users className="w-4 h-4" />
                      <span>
                        {workspace.member_count === 1 ? 'Just you' : `${workspace.member_count} members`}
                      </span>
                    </div>
                  </div>
                </Card>
              )))}
            </div>
            )}

            {/* Shared Workspaces Grid */}
            {activeTab === 'shared' && sharedSubTab === 'workspaces' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {workspaces
                  .filter(w => w.owner_id !== user?.id)
                  .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="relative inline-block mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <Users className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {searchQuery ? 'No workspaces found' : 'No shared workspaces'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      {searchQuery 
                        ? 'Try a different search term'
                        : 'Workspaces shared with you will appear here'}
                    </p>
                  </div>
                ) : (
                  workspaces
                    .filter(w => w.owner_id !== user?.id)
                    .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((workspace, index) => (
                      <Card
                        key={workspace.id}
                        interactive
                        onClick={() => onWorkspaceClick(workspace.id)}
                        className="group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                              <LayoutGrid className="w-6 h-6 text-white" />
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {workspace.name}
                          </h3>

                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-auto">
                            <Users className="w-4 h-4" />
                            <span>
                              {workspace.member_count === 1 ? 'Just you' : `${workspace.member_count} members`}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                )}
              </div>
            )}

            {/* Shared Boards Grid */}
            {activeTab === 'shared' && sharedSubTab === 'boards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sharedBoards
                  .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="relative inline-block mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <LayoutGrid className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {searchQuery ? 'No boards found' : 'No shared boards'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      {searchQuery 
                        ? 'Try a different search term'
                        : 'Boards shared with you will appear here'}
                    </p>
                  </div>
                ) : (
                  sharedBoards
                    .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((board, index) => (
                      <Card
                        key={board.id}
                        interactive
                        onClick={() => onBoardClick?.(board.id)}
                        className="group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                              <LayoutGrid className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                            </div>
                            
                            {/* Board Options Dropdown */}
                            <div className="relative" ref={openBoardDropdownId === board.id ? boardDropdownRef : null}>
                              <button
                                onClick={(e) => toggleBoardDropdown(board.id, e)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
                                title="Board options"
                              >
                                <MoreVerticalIcon className="w-4 h-4" />
                              </button>
                              {openBoardDropdownId === board.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                                  <button
                                    onClick={(e) => leaveBoard(board.id, board.name, e)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    Leave Board
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                            {board.name}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-auto">
                            <Users className="w-3 h-3" />
                            <span>{board.workspace_name}</span>
                          </div>
                        </div>
                      </Card>
                    ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
        title="Create Workspace"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g., TaskD Team, Personal Projects"
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

      {/* Share Workspace Modal */}
      {selectedWorkspace && (
        <ShareWorkspaceModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedWorkspace(null);
          }}
          workspaceId={selectedWorkspace.id}
          workspaceName={selectedWorkspace.name}
        />
      )}

      {/* Rename Workspace Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setSelectedWorkspace(null);
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
            placeholder="New workspace name"
            onKeyDown={(e) => e.key === 'Enter' && renameWorkspace()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowRenameModal(false);
                setSelectedWorkspace(null);
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

      {/* Delete Workspace Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedWorkspace(null);
        }}
        title="Delete Workspace"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{selectedWorkspace?.name}"</span>? This action cannot be undone and will delete all boards and data in this workspace.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedWorkspace(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={deleteWorkspace} variant="primary" className="bg-red-600 hover:bg-red-700">
              Delete Workspace
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
