import { useEffect, useState } from 'react';
import { ArrowLeft, Check, X, LayoutGrid, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BellIcon, ClockIcon } from '../icons';

interface BoardInvitation {
  id: string;
  board_id: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;
  expires_at: string;
  created_at: string;
  board_name?: string;
  invited_by_email?: string;
}

interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  expires_at: string;
  created_at: string;
  workspace_name?: string;
  invited_by_email?: string;
}

interface InvitationsProps {
  onBack: () => void;
  onBoardClick: (boardId: string) => void;
  onWorkspaceClick?: (workspaceId: string) => void;
}

export function Invitations({ onBack, onBoardClick, onWorkspaceClick }: InvitationsProps) {
  const [boardInvitations, setBoardInvitations] = useState<BoardInvitation[]>([]);
  const [workspaceInvitations, setWorkspaceInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'boards' | 'workspaces'>('boards');

  useEffect(() => {
    loadInvitations();

    // Real-time subscription for board invitations
    const boardInvitationsSubscription = supabase
      .channel('invitations-board-invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'board_invitations'
      }, () => {
        loadInvitations();
      })
      .subscribe();

    // Real-time subscription for workspace invitations
    const workspaceInvitationsSubscription = supabase
      .channel('invitations-workspace-invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workspace_invitations'
      }, () => {
        loadInvitations();
      })
      .subscribe();

    return () => {
      boardInvitationsSubscription.unsubscribe();
      workspaceInvitationsSubscription.unsubscribe();
    };
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user?.email) {
      setLoading(false);
      return;
    }

    // Load board invitations
    const { data: boardData, error: boardError } = await supabase
      .from('board_invitations')
      .select('*')
      .eq('email', user.user.email)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (boardError) {
      console.error('Error loading board invitations:', boardError);
    }

    // Load workspace invitations
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('email', user.user.email)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false});

    if (workspaceError) {
      console.error('Error loading workspace invitations:', workspaceError);
    }

    // Fetch board details
    const boardInvitationsWithDetails = await Promise.all(
      (boardData || []).map(async (inv) => {
        const { data: boardInfo } = await supabase
          .from('boards')
          .select('name')
          .eq('id', inv.board_id)
          .single();

        const { data: emailData } = await supabase.rpc('get_user_email', {
          user_uuid: inv.invited_by
        });

        return {
          ...inv,
          board_name: boardInfo?.name || 'Unknown Board',
          invited_by_email: emailData || 'Unknown User'
        };
      })
    );

    // Fetch workspace details
    const workspaceInvitationsWithDetails = await Promise.all(
      (workspaceData || []).map(async (inv) => {
        const { data: workspaceInfo } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', inv.workspace_id)
          .single();

        const { data: emailData } = await supabase.rpc('get_user_email', {
          user_uuid: inv.invited_by
        });

        return {
          ...inv,
          workspace_name: workspaceInfo?.name || 'Unknown Workspace',
          invited_by_email: emailData || 'Unknown User'
        };
      })
    );

    setBoardInvitations(boardInvitationsWithDetails);
    setWorkspaceInvitations(workspaceInvitationsWithDetails);
    setLoading(false);
  };

  const acceptBoardInvitation = async (token: string, boardId: string) => {
    const { data, error } = await supabase.rpc('accept_board_invitation', {
      invitation_token: token
    });

    if (error) {
      console.error('Error accepting invitation:', error);
      alert(`Failed to accept invitation: ${error.message}`);
      return;
    }

    if (data?.success) {
      alert('Invitation accepted!');
      setBoardInvitations(boardInvitations.filter(inv => inv.token !== token));
      onBoardClick(boardId);
    }
  };

  const acceptWorkspaceInvitation = async (token: string, workspaceId: string) => {
    const { error } = await supabase.rpc('accept_workspace_invitation', {
      invitation_token: token
    });

    if (error) {
      console.error('Error accepting workspace invitation:', error);
      alert(`Failed to accept invitation: ${error.message}`);
      return;
    }

    alert('Workspace invitation accepted!');
    setWorkspaceInvitations(workspaceInvitations.filter(inv => inv.token !== token));
    if (onWorkspaceClick) {
      onWorkspaceClick(workspaceId);
    }
  };

  const declineBoardInvitation = async (id: string) => {
    const { error } = await supabase
      .from('board_invitations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error declining invitation:', error);
      return;
    }

    setBoardInvitations(boardInvitations.filter(inv => inv.id !== id));
  };

  const declineWorkspaceInvitation = async (id: string) => {
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error declining invitation:', error);
      return;
    }

    setWorkspaceInvitations(workspaceInvitations.filter(inv => inv.id !== id));
  };

  const totalInvitations = boardInvitations.length + workspaceInvitations.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <BellIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Invitations ({totalInvitations})
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('boards')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'boards'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Boards ({boardInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'workspaces'
                ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Workspaces ({workspaceInvitations.length})
          </button>
        </div>

        {/* Board Invitations */}
        {activeTab === 'boards' && (
          boardInvitations.length === 0 ? (
            <div className="text-center py-20">
              <BellIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No board invitations</h3>
              <p className="text-gray-600 dark:text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {boardInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <LayoutGrid className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{invitation.board_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Invited by {invitation.invited_by_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 ml-13">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium">
                          {invitation.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => acceptBoardInvitation(invitation.token, invitation.board_id)}
                        variant="primary"
                        icon={Check}
                        className="text-sm"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => declineBoardInvitation(invitation.id)}
                        variant="secondary"
                        icon={X}
                        className="text-sm"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Workspace Invitations */}
        {activeTab === 'workspaces' && (
          workspaceInvitations.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No workspace invitations</h3>
              <p className="text-gray-600 dark:text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workspaceInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                          <Users className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{invitation.workspace_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Invited by {invitation.invited_by_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 ml-13">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 text-xs font-medium">
                          {invitation.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => acceptWorkspaceInvitation(invitation.token, invitation.workspace_id)}
                        variant="primary"
                        icon={Check}
                        className="text-sm"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => declineWorkspaceInvitation(invitation.id)}
                        variant="secondary"
                        icon={X}
                        className="text-sm"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
