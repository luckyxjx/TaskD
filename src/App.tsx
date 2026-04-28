import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Workspaces } from './pages/Workspaces';
import { WorkspaceBoards } from './pages/WorkspaceBoards';
import { Board } from './pages/Board';
import { Profile } from './pages/Profile';
import { Invitations } from './pages/Invitations';
import { SharedBoards } from './pages/SharedBoards';
import { RoleMatrixPage } from './pages/RoleMatrixPage';

function WorkspaceBoardsWrapper() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  if (!workspaceId) return <Navigate to="/workspaces" replace />;

  return (
    <WorkspaceBoards
      workspaceId={workspaceId}
      onBoardClick={(boardId) => navigate(`/board/${boardId}`)}
      onBack={() => navigate('/workspaces')}
      onProfileClick={() => navigate('/profile')}
      onInvitationsClick={() => navigate('/invitations')}
    />
  );
}

function BoardWrapper() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  if (!boardId) return <Navigate to="/workspaces" replace />;

  return (
    <Board
      boardId={boardId}
      onBack={() => navigate(-1)}
      onProfileClick={() => navigate('/profile')}
    />
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
    return (
      <Routes>
        <Route path="/signup" element={<SignUp onSwitchToLogin={() => navigate('/login')} onSignUpSuccess={() => navigate('/workspaces')} />} />
        <Route path="/login" element={<Login onSwitchToSignUp={() => navigate('/signup')} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/workspaces" element={
        <Workspaces
          onWorkspaceClick={(workspaceId) => navigate(`/workspace/${workspaceId}`)}
          onBoardClick={(boardId) => navigate(`/board/${boardId}`)}
          onProfileClick={() => navigate('/profile')}
          onInvitationsClick={() => navigate('/invitations')}
        />
      } />
      <Route path="/workspace/:workspaceId" element={<WorkspaceBoardsWrapper />} />
      <Route path="/board/:boardId" element={<BoardWrapper />} />
      <Route path="/profile" element={<Profile onBack={() => navigate('/workspaces')} />} />
      <Route path="/invitations" element={
        <Invitations
          onBack={() => navigate('/workspaces')}
          onBoardClick={(boardId) => navigate(`/board/${boardId}`)}
          onWorkspaceClick={(workspaceId) => navigate(`/workspace/${workspaceId}`)}
        />
      } />
      <Route path="/shared" element={
        <SharedBoards
          onBack={() => navigate('/workspaces')}
          onBoardClick={(boardId) => navigate(`/board/${boardId}`)}
          onProfileClick={() => navigate('/profile')}
        />
      } />
      <Route path="/roles" element={<RoleMatrixPage onBack={() => navigate(-1)} onProfileClick={() => navigate('/profile')} />} />
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
