import { useEffect, useState } from 'react';

interface IconPosition {
  id: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  icon: JSX.Element;
}

export function FloatingIcons() {
  const [icons, setIcons] = useState<IconPosition[]>([]);

  useEffect(() => {
    const iconSvgs = [
      // Kanban
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>,
      // Checklist
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>,
      // Calendar
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>,
      // Clock
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>,
      // Document
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>,
      // Graph
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M18 17l-5-5-4 4-4-4" />
      </svg>,
      // Cloud
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>,
      // User
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>,
      // Pen
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>,
      // Grid
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>,
      // Database
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>,
      // Code
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>,
      // Book
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>,
      // Sticky Note
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z" />
        <path d="M15 3v6h6" />
      </svg>,
      // Progress Bar
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <rect x="6" y="10" width="8" height="4" rx="1" fill="currentColor" />
      </svg>,
      // Desktop
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>,
      // Sync
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
      </svg>,
      // API Nodes
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M9.5 9.5l-2-2M14.5 9.5l2-2M9.5 14.5l-2 2M14.5 14.5l2 2" />
      </svg>,
      // Books
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>,
      // Target
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>,
    ];

    const generateIcons = () => {
      const positions: IconPosition[] = [];
      const minDistance = 150; // Minimum distance between icons to prevent overlap
      const iconSize = 64; // Icon size in pixels
      const margin = 100; // Margin from edges

      const isOverlapping = (x: number, y: number, existingPositions: IconPosition[]) => {
        return existingPositions.some(pos => {
          const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
          return distance < minDistance;
        });
      };

      for (let i = 0; i < iconSvgs.length; i++) {
        let x, y;
        let attempts = 0;
        const maxAttempts = 100;

        // Try to find a non-overlapping position
        do {
          x = margin + Math.random() * (window.innerWidth - margin * 2 - iconSize);
          y = margin + Math.random() * (window.innerHeight - margin * 2 - iconSize);
          attempts++;
        } while (isOverlapping(x, y, positions) && attempts < maxAttempts);

        // If we found a valid position, add the icon
        if (attempts < maxAttempts) {
          positions.push({
            id: i,
            x,
            y,
            duration: 15 + Math.random() * 10, // Slower: 15-25 seconds
            delay: Math.random() * 3,
            icon: iconSvgs[i],
          });
        }
      }

      setIcons(positions);
    };

    generateIcons();
    window.addEventListener('resize', generateIcons);
    return () => window.removeEventListener('resize', generateIcons);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute w-16 h-16 text-primary-200/20 dark:text-primary-700/20"
          style={{
            left: `${icon.x}px`,
            top: `${icon.y}px`,
            animation: `floatFast ${icon.duration}s ease-in-out infinite`,
            animationDelay: `${icon.delay}s`,
          }}
        >
          {icon.icon}
        </div>
      ))}
    </div>
  );
}
