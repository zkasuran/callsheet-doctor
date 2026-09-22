import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const tones = {
    primary: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400",
    ghost: "border border-white/15 text-white/80 hover:bg-white/5",
    danger: "border border-rose-500/40 text-rose-300 hover:bg-rose-500/10",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${tones[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] ${className}`}>{children}</div>
  );
}

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
};

export function Badge({ children, tone = "draft" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        TONES[tone] ?? TONES.draft
      }`}
    >
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
  );
}

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
