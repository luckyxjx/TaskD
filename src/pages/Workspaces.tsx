import { useEffect, useState } from 'react';
import { LayoutGrid, Plus, User, Users, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { ShareWorkspaceModal } from '../components/ShareWorkspaceModal';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

interface WorkspacesProps {
  onWorkspaceClick: (workspaceId: string) => void;
  onProfileClick: () => void;
  onInvitationsClick?: () => void;
}

export function Workspaces({ onWorkspaceClick, onProfileClick, onInvitationsClick }: WorkspacesProps) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
      loadPendingInvitations();

      // Real-time subscription for invitations
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
                onClick={() => setActiveTab('shared')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'shared'
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Shared with Me ({workspaces.filter(w => w.owner_id !== user?.id).length})
              </button>
            </div>

            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'my' ? 'My Workspaces' : 'Shared with Me'}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {workspaces
                .filter(w => activeTab === 'my' ? w.owner_id === user?.id : w.owner_id !== user?.id)
                .length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {activeTab === 'my' ? 'No workspaces yet' : 'No shared workspaces'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    {activeTab === 'my' 
                      ? 'Create your first workspace to get started'
                      : 'Workspaces shared with you will appear here'}
                  </p>
                </div>
              ) : (
                workspaces
                  .filter(w => activeTab === 'my' ? w.owner_id === user?.id : w.owner_id !== user?.id)
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
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                        <LayoutGrid className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {workspace.owner_id === user?.id && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkspace(workspace);
                                setShowShareModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400 transition-all"
                              title="Share workspace"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">
                              Owner
                            </span>
                          </>
                        )}
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
              )))}
            </div>
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
    </div>
  );
}
