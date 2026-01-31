import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Workspaces } from './pages/Workspaces';
import { WorkspaceBoards } from './pages/WorkspaceBoards';
import { Board } from './pages/Board';
import { Profile } from './pages/Profile';
import { Invitations } from './pages/Invitations';
import { SharedBoards } from './pages/SharedBoards';

type View = 'login' | 'signup' | 'workspaces' | 'workspace-boards' | 'board' | 'profile' | 'invitations' | 'shared';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('login');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentView === 'signup') {
      return (
        <SignUp
          onSwitchToLogin={() => setCurrentView('login')}
          onSignUpSuccess={() => setCurrentView('workspaces')}
        />
      );
    }
    return <Login onSwitchToSignUp={() => setCurrentView('signup')} />;
  }

  if (currentView === 'workspaces') {
    return (
      <Workspaces
        onWorkspaceClick={(workspaceId) => {
          setSelectedWorkspaceId(workspaceId);
          setCurrentView('workspace-boards');
        }}
        onProfileClick={() => setCurrentView('profile')}
        onInvitationsClick={() => setCurrentView('invitations')}
      />
    );
  }

  if (currentView === 'profile') {
    return <Profile onBack={() => setCurrentView('workspaces')} />;
  }

  if (currentView === 'invitations') {
    return (
      <Invitations
        onBack={() => setCurrentView('workspaces')}
        onBoardClick={(boardId) => {
          setSelectedBoardId(boardId);
          setCurrentView('board');
        }}
        onWorkspaceClick={(workspaceId) => {
          setSelectedWorkspaceId(workspaceId);
          setCurrentView('workspace-boards');
        }}
      />
    );
  }

  if (currentView === 'shared') {
    return (
      <SharedBoards
        onBack={() => setCurrentView('workspaces')}
        onBoardClick={(boardId) => {
          setSelectedBoardId(boardId);
          setCurrentView('board');
        }}
        onProfileClick={() => setCurrentView('profile')}
      />
    );
  }

  if (currentView === 'board' && selectedBoardId) {
    return (
      <Board
        boardId={selectedBoardId}
        onBack={() => setCurrentView('workspace-boards')}
        onProfileClick={() => setCurrentView('profile')}
      />
    );
  }

  if (currentView === 'workspace-boards' && selectedWorkspaceId) {
    return (
      <WorkspaceBoards
        workspaceId={selectedWorkspaceId}
        onBoardClick={(boardId) => {
          setSelectedBoardId(boardId);
          setCurrentView('board');
        }}
        onBack={() => setCurrentView('workspaces')}
        onProfileClick={() => setCurrentView('profile')}
        onInvitationsClick={() => setCurrentView('invitations')}
      />
    );
  }

  // Default: show workspaces
  return (
    <Workspaces
      onWorkspaceClick={(workspaceId) => {
        setSelectedWorkspaceId(workspaceId);
        setCurrentView('workspace-boards');
      }}
      onProfileClick={() => setCurrentView('profile')}
      onInvitationsClick={() => setCurrentView('invitations')}
    />
  );
}

export default App;
