export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="MachineTrust logo">
      <rect x="1.5" y="1.5" width="21" height="21" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 17V8.5l6 5 6-5V17" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
      <circle cx="12" cy="13.5" r="1.6" fill="var(--primary)" />
    </svg>
  );
}
