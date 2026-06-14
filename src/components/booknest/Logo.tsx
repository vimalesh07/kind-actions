export function Logo({ variant = "light", className = "" }: { variant?: "light" | "dark"; className?: string }) {
  const bg = variant === "light" ? "var(--color-primary)" : "white";
  const fg = variant === "light" ? "white" : "var(--color-primary)";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="grid h-9 w-9 place-items-center rounded-lg"
        style={{ background: bg, color: fg }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 19c2-3 6-4 9-4s7 1 9 4" />
          <path d="M12 15V7" />
          <path d="M8 7c0-2 2-3 4-3s4 1 4 3v6c-2-1-6-1-8 0V7Z" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight">Book Nest</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] opacity-60">Smart Library</div>
      </div>
    </div>
  );
}
