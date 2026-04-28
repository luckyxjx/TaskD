import { Shield } from 'lucide-react';

interface PermissionSummaryProps {
  label: string;
  role: 'owner' | 'editor' | 'viewer';
  description: string;
  capabilities: string[];
}

export function PermissionSummary({
  label,
  role,
  description,
  capabilities,
}: PermissionSummaryProps) {
  const tone =
    role === 'owner'
      ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
      : role === 'editor'
        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${tone}`}>
            <Shield className="w-4 h-4" />
            {label}: {role.charAt(0).toUpperCase() + role.slice(1)}
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-[50%]">
          {capabilities.map((capability) => (
            <span
              key={capability}
              className="inline-flex items-center rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
