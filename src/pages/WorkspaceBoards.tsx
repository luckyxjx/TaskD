import { useEffect, useState, useRef } from 'react';
import { Search, User, ArrowLeft, Plus, LayoutGrid, Sparkles } from 'lucide-react';
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
  };
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
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
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

      const invitationsSubscription = supabase
        .channel('user-invitations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'board_invitations'
        }, (payload) => {
          const invitation: any = payload.new || payload.old;
          if (invitation && invitation.email === user.email) {
            loadPendingInvitations();
          }
        })
        .subscribe();

      return () => {
        invitationsSubscription.unsubscribe();
      };
    }
  }, [user]);

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
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading boards:', error);
      return;
    }

    setBoards(data || []);
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
        stats[board.id] = { total: 0, completed: 0 };
        continue;
      }

      const doneList = lists.find(list => list.name.toLowerCase() === 'done');

      const { count: totalCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
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
      };
    }

    setBoardStats(stats);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-semibold">Back to Workspaces</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 w-64 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

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
      <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8 animate-fade-in-down">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {workspaceName}
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

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {board.name}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Progress</span>
                        <span className="font-semibold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{stats.completed} completed</span>
                        <span>{stats.total} total</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

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
