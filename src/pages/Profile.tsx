import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, Award, LogOut, Edit, ArrowLeft, Sparkles, TrendingUp, Palette } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';

interface ProfileProps {
  onBack: () => void;
}

export function Profile({ onBack }: ProfileProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/30 to-accent-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="glass border-b border-white/20 dark:border-gray-700/30 px-6 py-4">
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

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card glass className="animate-fade-in-up">
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 flex items-center justify-center shadow-xl">
                    <User className="w-16 h-16 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                  {user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              </div>
            </Card>

            <Card glass className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-warning-400 to-warning-600 flex items-center justify-center">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Achievements</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl border border-primary-200 dark:border-primary-700/50">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Getting Started</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created your first workspace</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-success-50 to-success-100 dark:from-success-900/30 dark:to-success-800/30 rounded-xl border border-success-200 dark:border-success-700/50">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Organizer</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created your first board</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 opacity-60">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Task Master</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Complete 50 cards</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card glass className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Profile Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/50 dark:to-success-800/50 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">User ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{user?.id}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-900/50 dark:to-warning-800/50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Member Since</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/50 dark:to-accent-800/50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Sign In</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card glass className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Appearance</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose how the app looks. Auto mode follows your system preferences.
              </p>
              <ThemeToggle />
            </Card>

            <Card glass className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" icon={Edit}>
                  Edit Profile
                </Button>
                <Button onClick={handleSignOut} variant="danger" icon={LogOut}>
                  Sign Out
                </Button>
              </div>
            </Card>

            <div className="glass-card bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100 dark:from-primary-900/30 dark:via-accent-900/30 dark:to-primary-800/30 border-2 border-white/40 dark:border-gray-700/40 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Productivity Stats</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="glass-card text-center group hover:scale-105 transition-transform duration-200">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">0</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Boards</p>
                </div>
                <div className="glass-card text-center group hover:scale-105 transition-transform duration-200">
                  <p className="text-3xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">0</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Tasks</p>
                </div>
                <div className="glass-card text-center group hover:scale-105 transition-transform duration-200">
                  <p className="text-3xl font-bold bg-gradient-to-r from-warning-600 to-warning-700 bg-clip-text text-transparent">0</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
