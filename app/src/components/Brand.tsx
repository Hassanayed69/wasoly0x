import { cn } from "@/lib/utils";

/**
 * Brand mark: a mihrab arch with a hanging lamp (مصباح).
 * Drawn on a 64×64 grid so it stays crisp from favicon to hero sizes.
 */
export function LogoMark({
  className,
  strokeWidth = 2.6,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="وصولي"
      fill="none"
    >
      <path
        d="M12.5 58V31.5C12.5 18 20.5 9.5 32 4.5c11.5 5 19.5 13.5 19.5 27V58"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path d="M32 12.7v8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M24.2 24.4h15.6l2.3 9.5a10.1 10.1 0 0 1-20.2 0l2.3-9.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M32 30.8c1.9 2.1 1.9 5.1 0 7.2-1.9-2.1-1.9-5.1 0-7.2Z"
        fill="currentColor"
      />
      <circle cx="32" cy="20.3" r="1.3" fill="currentColor" />
      <path d="M12.5 58h39" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/** Mark + wordmark lockup used in the sidebar, mobile header and sign-in screen. */
export function Logo({
  className,
  markClassName,
  tagline,
  titleClassName,
}: {
  className?: string;
  markClassName?: string;
  tagline?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={cn("h-10 w-10", markClassName)} />
      <div className="min-w-0">
        <div className={cn("font-kufi text-2xl font-bold leading-none", titleClassName)}>
          وصولي
        </div>
        {tagline && (
          <div className="mt-1 truncate text-[11px] tracking-wide text-sidebar-foreground/50">
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}
