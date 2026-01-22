import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { Board } from './pages/Board';
import { Profile } from './pages/Profile';

type View = 'login' | 'signup' | 'dashboard' | 'board' | 'profile';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('login');
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
          onSignUpSuccess={() => setCurrentView('dashboard')}
        />
      );
    }
    return <Login onSwitchToSignUp={() => setCurrentView('signup')} />;
  }

  if (currentView === 'profile') {
    return <Profile onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'board' && selectedBoardId) {
    return (
      <Board
        boardId={selectedBoardId}
        onBack={() => setCurrentView('dashboard')}
        onProfileClick={() => setCurrentView('profile')}
      />
    );
  }

  return (
    <Dashboard
      onBoardClick={(boardId) => {
        setSelectedBoardId(boardId);
        setCurrentView('board');
      }}
      onProfileClick={() => setCurrentView('profile')}
    />
  );
}

export default App;
