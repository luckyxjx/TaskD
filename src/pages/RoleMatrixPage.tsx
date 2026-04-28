import { ArrowLeft, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoleMatrixPageProps {
  onBack: () => void;
  onProfileClick: () => void;
}

const ROLE_MATRIX = [
  ['View boards', 'Yes', 'Yes', 'Yes'],
  ['Create boards in workspace', 'Yes', 'No', 'No'],
  ['Rename or delete boards', 'Yes', 'No', 'No'],
  ['Manage board members', 'Yes', 'No', 'No'],
  ['Create lists and cards', 'Yes', 'Yes', 'No'],
  ['Move cards or lists', 'Yes', 'Yes', 'No'],
  ['Edit card details', 'Yes', 'Yes', 'No'],
  ['Add comments', 'Yes', 'Yes', 'Yes'],
  ['View activity and analytics', 'Yes', 'Yes', 'Yes'],
] as const;

export function RoleMatrixPage({ onBack, onProfileClick }: RoleMatrixPageProps) {
  return (
    <div className="app-shell min-h-screen">
      <header className="surface-header px-4 sm:px-6 py-4 relative z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200"
          >
            <div className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold">Back</span>
          </button>
          <button
            onClick={onProfileClick}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-10">
        <div className="surface-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Visible Security
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-4">Role Matrix</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-3xl">
                TaskD uses layered authorization. The frontend shows role-aware controls, while backend RLS and RPC functions enforce the final permission boundary.
              </p>
            </div>
            <Link
              to="/workspaces"
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-primary-300 dark:hover:border-primary-700"
            >
              Return to Workspaces
            </Link>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-4 text-left font-semibold">Action</th>
                  <th className="px-4 py-4 text-center font-semibold">Owner</th>
                  <th className="px-4 py-4 text-center font-semibold">Editor</th>
                  <th className="px-4 py-4 text-center font-semibold">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                {ROLE_MATRIX.map((row) => (
                  <tr key={row[0]}>
                    <td className="px-4 py-4 font-semibold text-gray-900 dark:text-gray-100">{row[0]}</td>
                    {row.slice(1).map((value, index) => (
                      <td
                        key={`${row[0]}-${index}`}
                        className={`px-4 py-4 text-center font-semibold ${
                          value === 'Yes' ? 'text-success-700 dark:text-success-300' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
            <div className="rounded-2xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/10 p-5">
              <h2 className="text-lg font-bold text-warning-800 dark:text-warning-200">Owner</h2>
              <p className="mt-2 text-sm text-warning-700 dark:text-warning-300">
                Full workspace and board control, including board creation, board deletion, and member management.
              </p>
            </div>
            <div className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 p-5">
              <h2 className="text-lg font-bold text-primary-800 dark:text-primary-200">Editor</h2>
              <p className="mt-2 text-sm text-primary-700 dark:text-primary-300">
                Can operate on assigned boards by editing cards and lists, but cannot manage membership or destructive board settings.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Viewer</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Read-only access with visible blocked actions, explicit permission messaging, and no mutation rights.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
