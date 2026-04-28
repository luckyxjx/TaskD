import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, LogOut, Edit, ArrowLeft, TrendingUp, Palette } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';

interface ProfileProps {
  onBack: () => void;
}

// Generate a consistent pastel color based on user email
const getAvatarColor = (email: string) => {
  const colors = [
    { bg: '#e7eef5', icon: '#4f678e' }, // primary-50 / primary-600
    { bg: '#fceef7', icon: '#d999a9' }, // accent-50 / accent-500
    { bg: '#f0fdf4', icon: '#22c55e' }, // success-50 / success-600
    { bg: '#fffbeb', icon: '#f59e0b' }, // warning-50 / warning-500
    { bg: '#fef2f2', icon: '#ef4444' }, // danger-50 / danger-500
    { bg: '#f5f6f7', icon: '#7e84a1' }, // neutral-50 / neutral-600
  ];
  
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

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

  const avatarColor = getAvatarColor(user?.email || 'default');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200"
        >
          <div className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
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
                  {/* Pastel SVG Avatar */}
                  <svg width="128" height="128" viewBox="0 0 128 128" className="rounded-2xl shadow-lg">
                    <rect width="128" height="128" rx="16" fill={avatarColor.bg} />
                    <circle cx="64" cy="50" r="24" fill={avatarColor.icon} opacity="0.2" />
                    <path
                      d="M64 54c-8.837 0-16-7.163-16-16s7.163-16 16-16 16 7.163 16 16-7.163 16-16 16zm0-28c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12z"
                      fill={avatarColor.icon}
                    />
                    <path
                      d="M88 96H40c-2.21 0-4-1.79-4-4 0-13.255 10.745-24 24-24h8c13.255 0 24 10.745 24 24 0 2.21-1.79 4-4 4zm-44-4h40c-1.105-10.29-9.665-18.4-20-18.4h-8c-10.335 0-18.895 8.11-20 18.4z"
                      fill={avatarColor.icon}
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              </div>
            </Card>

            <Card glass className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: avatarColor.bg }}>
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <path
                      d="M16 4l2.5 7.5H26l-6 4.5 2.5 7.5-6-4.5-6 4.5 2.5-7.5-6-4.5h7.5z"
                      fill={avatarColor.icon}
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Achievements</h3>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Complete tasks and reach milestones to unlock achievements
                </p>
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

            <Card glass className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Productivity Stats</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow duration-200">
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">0</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Boards</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow duration-200">
                  <p className="text-3xl font-bold text-success-600 dark:text-success-400">0</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Tasks</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center hover:shadow-md transition-shadow duration-200">
                  <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">0</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Completed</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
