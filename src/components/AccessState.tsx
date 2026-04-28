import { ArrowLeft, Ban } from 'lucide-react';
import { Button } from './Button';

interface AccessStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AccessState({
  title = 'Access Denied',
  message,
  actionLabel = 'Back',
  onAction,
}: AccessStateProps) {
  return (
    <div className="app-shell flex items-center justify-center p-6">
      <div className="relative z-10 max-w-md w-full surface-card rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        {onAction && (
          <Button onClick={onAction} variant="primary" icon={ArrowLeft}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
