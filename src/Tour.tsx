import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Icon, cx } from "./ui";

/* A dependency-free guided tour. Each step points at an element carrying a matching
   `data-tour="<id>"` attribute. The tour dims the page, cuts a spotlight around the
   target, and floats a tooltip beside it. Steps can flip the active page first via
   `onStep`, so the element they highlight is mounted before we measure it. */

export type TourStep = {
  target: string; // data-tour id, or "" for a centered welcome card
  title: string;
  body: string;
  page?: "overview" | "diagnosis" | "pipeline" | "contacts" | "inbox" | "security";
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

export default function Tour({
  steps,
  onStep,
  onClose,
}: {
  steps: TourStep[];
  onStep: (page: NonNullable<TourStep["page"]> | undefined) => void;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  const step = steps[i];
  const isFirst = i === 0;
  const isLast = i === steps.length - 1;

  // When the step changes, switch the page it needs, then locate the target.
  useEffect(() => {
    setReady(false);
    onStep(step.page);
    let tries = 0;
    let raf = 0;
    const find = () => {
      if (!step.target) {
        setRect(null);
        setReady(true);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setReady(true);
      } else if (tries++ < 40) {
        raf = requestAnimationFrame(find);
      } else {
        // Target never mounted (e.g. empty state); fall back to a centered card.
        setRect(null);
        setReady(true);
      }
    };
    raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Keep the spotlight aligned on resize/scroll.
  useLayoutEffect(() => {
    if (!step.target) return;
    const update = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [i, step.target]);

  // Escape closes, arrows navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !isLast) setI((n) => n + 1);
      if (e.key === "ArrowLeft" && !isFirst) setI((n) => n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFirst, isLast, onClose]);

  if (!ready) {
    return <div className="fixed inset-0 z-[60] bg-black/60" />;
  }

  // Tooltip placement: below the target if there is room, else above; centered when no target.
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  let tipStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 12;
    const placeBelow = below + 190 < vh;
    const top = placeBelow ? below : Math.max(12, rect.top - 190 - 12);
    let left = rect.left + rect.width / 2 - 160;
    left = Math.min(Math.max(12, left), vw - 332);
    tipStyle = { top, left, width: 320 };
  } else {
    tipStyle = { top: vh / 2 - 120, left: vw / 2 - 170, width: 340 };
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Dim + spotlight cutout via four panels around the target, so the target stays clickable-looking. */}
      {rect ? (
        <>
          <div
            className="pointer-events-auto absolute inset-x-0 top-0 bg-black/65"
            style={{ height: Math.max(0, rect.top - PAD) }}
            onClick={onClose}
          />
          <div
            className="pointer-events-auto absolute left-0 bg-black/65"
            style={{ top: rect.top - PAD, height: rect.height + PAD * 2, width: Math.max(0, rect.left - PAD) }}
            onClick={onClose}
          />
          <div
            className="pointer-events-auto absolute bg-black/65"
            style={{
              top: rect.top - PAD,
              left: rect.left + rect.width + PAD,
              right: 0,
              height: rect.height + PAD * 2,
            }}
            onClick={onClose}
          />
          <div
            className="pointer-events-auto absolute inset-x-0 bg-black/65"
            style={{ top: rect.top + rect.height + PAD, bottom: 0 }}
            onClick={onClose}
          />
          {/* Highlight ring */}
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-emerald-400/80"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      )}

      {/* Tooltip */}
      <div
        ref={tipRef}
        className="pointer-events-auto absolute rounded-xl border border-white/12 bg-[#0e141b] p-4 shadow-2xl shadow-black/60"
        style={tipStyle}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/15 text-emerald-300">
            <Icon.Sparkles className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold">{step.title}</h3>
          <button
            onClick={onClose}
            className="ml-auto rounded p-0.5 text-white/40 hover:text-white/80"
            aria-label="Close tour"
          >
            <Icon.Close className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={cx(
                  "h-1.5 rounded-full transition-all",
                  idx === i ? "w-4 bg-emerald-400" : "w-1.5 bg-white/20",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={() => setI((n) => n - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={onClose}>
                <Icon.Check className="h-4 w-4" /> Done
              </Button>
            ) : (
              <Button size="sm" onClick={() => setI((n) => n + 1)}>
                Next <Icon.Arrow className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
