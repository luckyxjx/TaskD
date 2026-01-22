interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  glass?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', interactive = false, glass = false, onClick, style }: CardProps) {
  const baseClasses = glass ? 'glass-card' : 'card p-6';
  const interactiveClasses = interactive ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : '';
  
  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
