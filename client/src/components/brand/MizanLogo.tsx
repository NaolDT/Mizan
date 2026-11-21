interface MizanLogoMarkProps {
  className?: string;
}

/**
 * The Mizan mark: a balance beam with two pans. It is the same drawing as
 * `public/favicon.svg`, so the site icon, app icon and in-page logo match.
 */
export function MizanLogoMark({ className = "h-9 w-9" }: MizanLogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Mizan logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#059669" />
      <path
        d="M16 6v20M10 10h12M8 22h16"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10" cy="10" r="2.2" fill="#ffffff" />
      <circle cx="22" cy="10" r="2.2" fill="#ffffff" />
    </svg>
  );
}

export function MizanWordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <MizanLogoMark />
      <span
        className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
      >
        Mizan
      </span>
    </span>
  );
}
