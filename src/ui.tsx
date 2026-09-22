import type { ReactNode } from "react";
import { useTheme } from "./theme";

/* ------------------------------------------------------------------ *
 * Design system for Callsheet Doctor.
 * Dark, filmic, emerald accent. Every primitive the app and the
 * marketing site share lives here so the look stays uniform.
 * ------------------------------------------------------------------ */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Button ---------- */

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  const tones = {
    primary: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20",
    ghost: "border border-white/15 text-white/80 hover:bg-white/5 hover:border-white/25",
    subtle: "bg-white/5 text-white/70 hover:bg-white/10",
    danger: "border border-rose-500/40 text-rose-300 hover:bg-rose-500/10",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(base, sizes[size], tones[variant], className)}
    >
      {children}
    </button>
  );
}

/* ---------- Card ---------- */

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-white/10 bg-white/[0.03]",
        interactive && "transition-colors hover:border-white/20 hover:bg-white/[0.05] cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Badge ---------- */

const TONES: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  waiting: "bg-amber-500/15 text-amber-300",
  sent: "bg-amber-500/15 text-amber-300",
  replied: "bg-sky-500/15 text-sky-300",
  negotiating: "bg-violet-500/15 text-violet-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-rose-500/15 text-rose-300",
  closed: "bg-white/10 text-white/40",
  gap: "bg-rose-500/15 text-rose-300",
  sourcing: "bg-amber-500/15 text-amber-300",
  cured: "bg-emerald-500/15 text-emerald-300",
  neutral: "bg-white/8 text-white/55",
};

export function Badge({
  children,
  tone = "draft",
  className = "",
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONES[tone] ?? TONES.draft,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Spinner ---------- */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white/80",
        className,
      )}
    />
  );
}

/* ---------- Stat card ---------- */

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "emerald" | "amber" | "sky" | "rose";
  icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    neutral: "text-white",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    rose: "text-rose-300",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</p>
        {icon && <span className="text-white/30">{icon}</span>}
      </div>
      <p className={cx("mt-2 text-2xl font-semibold tabular-nums", accents[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </Card>
  );
}

/* ---------- Progress bar ---------- */

export function Progress({ value, max, tone = "emerald" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bars: Record<string, string> = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    sky: "bg-sky-400",
    violet: "bg-violet-400",
    rose: "bg-rose-400",
    white: "bg-white/60",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className={cx("h-full rounded-full transition-all duration-500", bars[tone] ?? bars.emerald)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-white/[0.06]", className)} />;
}

/* ---------- Empty state ---------- */

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-white/25">{icon}</div>}
      <p className="text-sm font-medium text-white/70">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs text-white/40">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  // Deterministic hue from the name so each contact keeps its colour.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <span
      className={cx(
        "inline-grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white/90",
        className,
      )}
      style={{ background: `hsl(${h} 45% 28%)` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ---------- Theme toggle ---------- */

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={cx(
        "inline-grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/60 transition-colors hover:bg-white/5 hover:text-white/90",
        className,
      )}
    >
      {dark ? <Icon.Sun className="h-4 w-4" /> : <Icon.Moon className="h-4 w-4" />}
    </button>
  );
}

/* ---------- Icons (inline, no dependency) ---------- */

type IconProps = { className?: string };
const iconBase = (className?: string) =>
  cx("inline-block h-[1.15em] w-[1.15em]", className);

export const Icon = {
  Rx: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h5a3 3 0 0 1 0 6H4zM4 10l6 10M13 13l7 7M20 13l-7 7" />
    </svg>
  ),
  Dashboard: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Stethoscope: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3v6a5 5 0 0 0 10 0V3M6 3H3M12 3h3M9 14v2a5 5 0 0 0 10 0v-1" /><circle cx="19" cy="13" r="2" />
    </svg>
  ),
  Board: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="4" height="16" rx="1" /><rect x="10" y="4" width="4" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" />
    </svg>
  ),
  Contacts: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Inbox: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  Mail: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" />
    </svg>
  ),
  Search: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Sparkles: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  ),
  Bolt: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  ),
  Globe: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
    </svg>
  ),
  Check: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Arrow: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  Close: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Plus: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Film: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" /><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5M7 12h10" />
    </svg>
  ),
  Coin: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0M9.5 14.5a2.5 2 0 0 0 5 0" />
    </svg>
  ),
  Sun: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  Moon: ({ className }: IconProps) => (
    <svg className={iconBase(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
};

/* ---------- Labels ---------- */

export const KIND_LABEL: Record<string, string> = {
  location: "Location",
  cast: "Cast",
  crew: "Crew",
  gear: "Gear",
  permit: "Permit",
  catering: "Catering",
  clearance: "Clearance",
  insurance: "Insurance",
  travel: "Travel",
  festival: "Festival",
  press: "Press",
  distribution: "Distribution",
};

export const KIND_ICON: Record<string, string> = {
  location: "📍",
  cast: "🎭",
  crew: "🎬",
  gear: "🎥",
  permit: "📄",
  catering: "🍽️",
  clearance: "⚖️",
  insurance: "🛡️",
  travel: "✈️",
  festival: "🏆",
  press: "📰",
  distribution: "📡",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Drafting",
  sent: "Sent",
  waiting: "Waiting",
  replied: "Replied",
  negotiating: "Negotiating",
  confirmed: "Confirmed",
  declined: "Declined",
  closed: "Closed",
};

/** Relative time, compact ("3h", "2d", "just now"). */
export function ago(ts?: number | null): string {
  if (!ts) return "";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
