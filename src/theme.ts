import { useEffect, useState } from "react";

// Theme: "light" | "dark". Stored in localStorage; defaults to the OS preference.
// Applied as data-theme on <html>; the CSS in index.css swaps the palette variables.

export type Theme = "light" | "dark";

const KEY = "callsheet.theme";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

/** Hook: current theme + a toggle that persists and applies. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle() {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore (private mode) */
      }
      return next;
    });
  }

  return [theme, toggle];
}
