import { useEffect, useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BellIcon, ClockIcon } from '../icons';

interface Invitation {
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

interface InvitationsProps {
  onBack: () => void;
  onBoardClick: (boardId: string) => void;
}

export function Invitations({ onBack, onBoardClick }: InvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user?.email) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('board_invitations')
      .select('*')
      .eq('email', user.user.email)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invitations:', error);
      setLoading(false);
      return;
    }

    // Fetch board names and inviter emails
    const invitationsWithDetails = await Promise.all(
      (data || []).map(async (inv) => {
        const { data: boardData } = await supabase
          .from('boards')
          .select('name')
          .eq('id', inv.board_id)
          .single();

        const { data: emailData, error: emailError } = await supabase.rpc('get_user_email', {
          user_uuid: inv.invited_by
        });

        if (emailError) {
          console.error('Error fetching user email:', emailError);
        }

        return {
          ...inv,
          board_name: boardData?.name || 'Unknown Board',
          invited_by_email: emailData || 'Unknown User'
        };
      })
    );

    setInvitations(invitationsWithDetails);
    setLoading(false);
  };

  const acceptInvitation = async (token: string, boardId: string) => {
    console.log('🎯 Accepting invitation with token:', token);
    
    const { data, error } = await supabase.rpc('accept_board_invitation', {
      invitation_token: token
    });

    console.log('📊 Accept invitation response:', data);
    console.log('❌ Accept invitation error:', error);

    if (error) {
      console.error('Error accepting invitation:', error);
      alert(`Failed to accept invitation: ${error.message}`);
      return;
    }

    if (data?.success) {
      console.log('✅ Invitation accepted successfully!');
      console.log('   - Board ID:', data.board_id);
      console.log('   - Member ID:', data.member_id);
      console.log('   - Role:', data.role);
      console.log('   - Was existing member:', data.was_existing_member);
      
      alert('Invitation accepted! Redirecting to board...');
      setInvitations(invitations.filter(inv => inv.token !== token));
      onBoardClick(boardId);
    } else {
      console.error('❌ Invitation acceptance failed:', data?.error);
      alert(data?.error || 'Failed to accept invitation');
    }
  };

  const declineInvitation = async (id: string) => {
    const { error } = await supabase
      .from('board_invitations')
      .update({ accepted: true }) // Mark as accepted to hide it
      .eq('id', id);

    if (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation');
      return;
    }

    setInvitations(invitations.filter(inv => inv.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <div className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-semibold">Back to Dashboard</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <BellIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Board Invitations</h1>
            <p className="text-gray-600 dark:text-gray-400">Accept or decline invitations to collaborate</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invitations...</p>
          </div>
        ) : invitations.length === 0 ? (
          <Card className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <BellIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No pending invitations
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have any board invitations at the moment
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {invitation.board_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium">{invitation.invited_by_email}</span> invited you to collaborate as{' '}
                      <span className="font-medium capitalize">{invitation.role}</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <ClockIcon className="w-4 h-4" />
                      {formatDate(invitation.expires_at)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => acceptInvitation(invitation.token, invitation.board_id)}
                      variant="primary"
                      icon={Check}
                      className="whitespace-nowrap"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => declineInvitation(invitation.id)}
                      variant="secondary"
                      icon={X}
                      className="whitespace-nowrap"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
