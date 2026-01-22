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
}

export function Dashboard({ onBoardClick, onProfileClick }: DashboardProps) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardStats, setBoardStats] = useState<BoardStats>({});
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [showRenameBoardModal, setShowRenameBoardModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [boardToRename, setBoardToRename] = useState<Board | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [renameBoardName, setRenameBoardName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorkspaces();
  }, [user]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadBoards(selectedWorkspace);
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

    if (data && data.length > 0) {
      setWorkspaces(data);
      setSelectedWorkspace(data[0].id);
    } else {
      setShowNewWorkspaceModal(true);
    }
  };

  const loadBoards = async (workspaceId: string) => {
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

    // Check for duplicate workspace name
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .ilike('name', newWorkspaceName.trim())
      .single();

    if (existing) {
      alert('A workspace with this name already exists!');
      return;
    }

    const { data, error } = await supabase
      .from('workspaces')
      .insert([{ name: newWorkspaceName, owner_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error('Error creating workspace:', error);
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

    // Check for duplicate board name in this workspace
    const { data: existing } = await supabase
      .from('boards')
      .select('id')
      .eq('workspace_id', selectedWorkspace)
      .ilike('name', newBoardName.trim())
      .single();

    if (existing) {
      alert('A board with this name already exists in this workspace!');
      return;
    }

    const { data, error } = await supabase
      .from('boards')
      .insert([{ name: newBoardName, workspace_id: selectedWorkspace }])
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      return;
    }

    if (data) {
      // Add current user as board owner
      const { error: ownerError } = await supabase.rpc('add_user_as_board_owner', {
        board_uuid: data.id
      });

      if (ownerError) {
        console.error('Error adding board owner:', ownerError);
      }

      // Create default lists for the new board
      const defaultLists = [
        { name: 'To Do', board_id: data.id, position: 0 },
        { name: 'In Progress', board_id: data.id, position: 1 },
        { name: 'Done', board_id: data.id, position: 2 },
      ];

      const { error: listsError } = await supabase
        .from('lists')
        .insert(defaultLists);

      if (listsError) {
        console.error('Error creating default lists:', listsError);
      }

      setBoards([data, ...boards]);
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
                  <button
                    key={workspace.id}
                    onClick={() => setSelectedWorkspace(workspace.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                      selectedWorkspace === workspace.id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="font-medium">{workspace.name}</span>
                  </button>
                ))}
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search boards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
            <button
              onClick={onProfileClick}
              className="ml-4 w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-all duration-200"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
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
    </div>
  );
}
