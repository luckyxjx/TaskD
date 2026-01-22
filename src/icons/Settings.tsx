export function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m5.196-15.804L13.5 6.893m-3 3L7.804 6.196m12 12L16.107 14.5m-3 3-3.697 3.697M1 12h6m6 0h6m-15.804 5.196L6.893 13.5m3-3L6.196 7.804m12 12L14.5 16.107m-3 3-3.697 3.697" />
    </svg>
  );
}
