import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { supabase } from '../lib/supabase';
import { UserPlusIcon, UsersIcon } from '../icons';

interface ShareWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export function ShareWorkspaceModal({ isOpen, onClose, workspaceId, workspaceName }: ShareWorkspaceModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);

  const inviteUser = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check if invitation already exists
      const { data: existingInvitations, error: inviteCheckError } = await supabase
        .from('workspace_invitations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', normalizedEmail)
        .eq('accepted', false);

      if (inviteCheckError) {
        console.error('Error checking invitations:', inviteCheckError);
      }

      if (existingInvitations && existingInvitations.length > 0) {
        alert('An invitation has already been sent to this email!');
        setLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: userData } = await supabase.rpc('get_user_by_email', {
        user_email: normalizedEmail
      });

      if (userData) {
        const { data: existingMembers, error: memberCheckError } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userData);

        if (memberCheckError) {
          console.error('Error checking members:', memberCheckError);
        }

        if (existingMembers && existingMembers.length > 0) {
          alert('This user is already a member of this workspace!');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('workspace_invitations')
        .insert([{
          workspace_id: workspaceId,
          email: normalizedEmail,
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }]);

      if (error) throw error;

      alert(`Invitation sent to ${email}!`);
      setEmail('');
      onClose();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      alert(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${workspaceName}"`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Invite team members to collaborate in this workspace. They'll have access to all boards within it.
        </p>

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          onKeyDown={(e) => e.key === 'Enter' && inviteUser()}
          autoFocus
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                role === 'admin'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
              }`}
            >
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs opacity-75">Can manage workspace</div>
            </button>
            <button
              onClick={() => setRole('member')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                role === 'member'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
              }`}
            >
              <div className="text-sm font-medium">Member</div>
              <div className="text-xs opacity-75">Can view and edit</div>
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={inviteUser}
            variant="primary"
            icon={UserPlusIcon}
            disabled={loading || !email.trim()}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
