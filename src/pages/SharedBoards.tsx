import { useEffect, useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { LayoutGridIcon } from '../icons';

interface SharedBoard {
  id: string;
  name: string;
  workspace_id: string;
  created_at: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by: string;
  invited_by_email?: string;
}

interface SharedBoardsProps {
  onBack: () => void;
  onBoardClick: (boardId: string) => void;
  onProfileClick: () => void;
}

export function SharedBoards({ onBack, onBoardClick, onProfileClick }: SharedBoardsProps) {
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedBoards();
  }, []);

  const loadSharedBoards = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      setLoading(false);
      return;
    }

    console.log('🔍 Loading shared boards for user:', user.user.id);

    // Get all board memberships for the current user
    const { data: memberData, error: memberError } = await supabase
      .from('board_members')
      .select('board_id, role, invited_by')
      .eq('user_id', user.user.id);

    console.log('📊 Board members data:', memberData);
    console.log('❌ Board members error:', memberError);

    if (memberError) {
      console.error('Error loading board members:', memberError);
      setLoading(false);
      return;
    }

    if (!memberData || memberData.length === 0) {
      console.log('⚠️ No board memberships found');
      setSharedBoards([]);
      setLoading(false);
      return;
    }

    // Get board IDs
    const boardIds = memberData.map(m => m.board_id);
    console.log('🎯 Board IDs to fetch:', boardIds);

    // Fetch board details WITH workspace info
    const { data: boardsData, error: boardsError } = await supabase
      .from('boards')
      .select(`
        *,
        workspaces (
          id,
          owner_id
        )
      `)
      .in('id', boardIds);

    console.log('📋 Boards data:', boardsData);
    console.log('❌ Boards error:', boardsError);

    if (boardsError) {
      console.error('Error loading boards:', boardsError);
      setLoading(false);
      return;
    }

    // Filter out boards where user is the WORKSPACE OWNER
    // (Keep boards where user is just a member, not the workspace owner)
    const filteredBoards = (boardsData || []).filter(board => {
      const isWorkspaceOwner = board.workspaces?.owner_id === user.user.id;
      console.log(`Board "${board.name}": workspace owner = ${board.workspaces?.owner_id}, current user = ${user.user.id}, is owner = ${isWorkspaceOwner}`);
      return !isWorkspaceOwner;
    });

    console.log('✅ Filtered shared boards:', filteredBoards);

    // Combine data with member details
    const sharedBoardsWithDetails = await Promise.all(
      filteredBoards.map(async (board) => {
        const membership = memberData.find(m => m.board_id === board.id);
        
        // Get inviter email
        let inviterEmail = 'Unknown';
        if (membership?.invited_by) {
          const { data: emailData, error: emailError } = await supabase.rpc('get_user_email', {
            user_uuid: membership.invited_by
          });
          
          if (!emailError && emailData) {
            inviterEmail = emailData;
          }
        }

        return {
          ...board,
          role: membership?.role || 'viewer',
          invited_by: membership?.invited_by || '',
          invited_by_email: inviterEmail
        };
      })
    );

    console.log('🎉 Final shared boards with details:', sharedBoardsWithDetails);
    setSharedBoards(sharedBoardsWithDetails);
    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
      editor: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
      viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold">Back to Dashboard</span>
          </button>
          <button
            onClick={onProfileClick}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shared with Me</h1>
            <p className="text-gray-600 dark:text-gray-400">Boards that have been shared with you</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading shared boards...</p>
          </div>
        ) : sharedBoards.length === 0 ? (
          <Card className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No shared boards yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              When someone shares a board with you, it will appear here
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sharedBoards.map((board, index) => (
              <Card
                key={board.id}
                interactive
                onClick={() => onBoardClick(board.id)}
                className="group relative animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <LayoutGridIcon className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                  </div>
                  {getRoleBadge(board.role)}
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors mb-3">
                  {board.name}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                      {board.invited_by_email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate">
                    Shared by <span className="font-medium text-gray-900 dark:text-gray-100">{board.invited_by_email}</span>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
