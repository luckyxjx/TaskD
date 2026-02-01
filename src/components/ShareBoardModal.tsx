import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { supabase } from '../lib/supabase';
import { UserPlusIcon, UsersIcon, CrownIcon, EditIcon, TrashIcon, LogOutIcon } from '../icons';

interface BoardMember {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  email?: string;
  accepted_at: string | null;
}

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
}

export function ShareBoardModal({ isOpen, onClose, boardId, boardName }: ShareBoardModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const loadMembers = async () => {
    const { data, error } = await supabase.rpc('get_board_members', {
      p_board_id: boardId
    });

    if (error) {
      console.error('Error loading members:', error);
      alert('Failed to load members: ' + error.message);
      return;
    }

    setMembers(data || []);
    setShowMembers(true);
  };

  // Check if current user is owner
  const isCurrentUserOwner = () => {
    if (!currentUserId) return false;
    const currentUser = members.find(m => m.user_id === currentUserId);
    return currentUser?.role === 'owner';
  };

  const inviteUser = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check if invitation already exists for this email (only non-expired, unaccepted ones)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      
      const { data: existingInvitations, error: inviteCheckError } = await supabase
        .from('board_invitations')
        .select('id, created_at')
        .eq('board_id', boardId)
        .eq('email', normalizedEmail)
        .eq('accepted', false)
        .gt('created_at', fourHoursAgo); // Only check invitations from last 4 hours

      if (inviteCheckError) {
        console.error('Error checking invitations:', inviteCheckError);
      }

      if (existingInvitations && existingInvitations.length > 0) {
        alert('An invitation was sent to this email recently. Please wait 4 hours before sending another.');
        setLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: userData } = await supabase.rpc('get_user_by_email', {
        user_email: normalizedEmail
      });

      if (userData) {
        const { data: existingMembers, error: memberCheckError } = await supabase
          .from('board_members')
          .select('id')
          .eq('board_id', boardId)
          .eq('user_id', userData);

        if (memberCheckError) {
          console.error('Error checking members:', memberCheckError);
        }

        if (existingMembers && existingMembers.length > 0) {
          alert('This user is already a member of this board!');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('board_invitations')
        .insert([{
          board_id: boardId,
          email: normalizedEmail,
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }]);

      if (error) throw error;

      alert(`Invitation sent to ${email}!`);
      setEmail('');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      alert(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string, memberRole: string) => {
    // Prevent removing owner
    if (memberRole === 'owner') {
      alert('Cannot remove the board owner!');
      return;
    }

    if (!confirm('Remove this member from the board?')) return;

    const { error } = await supabase.rpc('manage_board_member_role', {
      p_board_id: boardId,
      p_member_id: memberId,
      p_action: 'remove'
    });

    if (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member: ' + error.message);
      return;
    }

    setMembers(members.filter(m => m.id !== memberId));
  };

  const changeRole = async (memberId: string, memberRole: string, newRole: 'editor' | 'viewer') => {
    // Prevent changing owner role
    if (memberRole === 'owner') {
      alert('Cannot change the owner role!');
      return;
    }

    const { error } = await supabase.rpc('manage_board_member_role', {
      p_board_id: boardId,
      p_member_id: memberId,
      p_action: 'update_role',
      p_new_role: newRole
    });

    if (error) {
      console.error('Error changing role:', error);
      alert('Failed to change member role: ' + error.message);
      return;
    }

    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  const leaveBoard = async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return;

    const myMembership = members.find(m => m.user_id === currentUser.id);
    if (!myMembership) return;

    if (myMembership.role === 'owner') {
      alert('Board owners cannot leave. Please transfer ownership first or delete the board.');
      return;
    }

    if (!confirm('Are you sure you want to leave this board?')) return;

    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('id', myMembership.id);

    if (error) {
      console.error('Error leaving board:', error);
      alert('Failed to leave board');
      return;
    }

    alert('You have left the board');
    onClose();
    window.location.reload(); // Refresh to update board list
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
      editor: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
      viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    };

    const icons = {
      owner: <CrownIcon className="w-3 h-3" />,
      editor: <EditIcon className="w-3 h-3" />,
      viewer: <UsersIcon className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {icons[role as keyof typeof icons]}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${boardName}"`} size="md">
      <div className="space-y-6">
        {/* Invite Section - Only for owners */}
        {isCurrentUserOwner() && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Invite by Email
            </h3>
          <div className="space-y-3">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              onKeyDown={(e) => e.key === 'Enter' && inviteUser()}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRole('editor')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    role === 'editor'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
                  }`}
                >
                  <div className="text-sm font-medium">Editor</div>
                  <div className="text-xs opacity-75">Can edit cards</div>
                </button>
                <button
                  onClick={() => setRole('viewer')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    role === 'viewer'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
                  }`}
                >
                  <div className="text-sm font-medium">Viewer</div>
                  <div className="text-xs opacity-75">Can only view</div>
                </button>
              </div>
            </div>

            <Button
              onClick={inviteUser}
              variant="primary"
              icon={UserPlusIcon}
              className="w-full"
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
        )}

        {/* Members Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <button
            onClick={loadMembers}
            className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <UsersIcon className="w-4 h-4" />
            {showMembers ? 'Hide Members' : 'View Members'}
          </button>

          {showMembers && (
            <div className="mt-4 space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No members yet
                </p>
              ) : (
                <>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                            {member.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {member.email}
                          </p>
                          {!member.accepted_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Pending invitation
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === 'owner' ? (
                          getRoleBadge(member.role)
                        ) : isCurrentUserOwner() ? (
                          // Only owners can change roles
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => changeRole(member.id, member.role, e.target.value as 'editor' | 'viewer')}
                              className="px-2 py-1 rounded-lg text-xs font-medium border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              onClick={() => removeMember(member.id, member.role)}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Remove member"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          // Non-owners just see the role badge
                          getRoleBadge(member.role)
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Leave Board Button - Only for non-owners */}
                  {!isCurrentUserOwner() && (
                    <Button
                      onClick={leaveBoard}
                      variant="secondary"
                      icon={LogOutIcon}
                      className="w-full mt-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Leave Board
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
