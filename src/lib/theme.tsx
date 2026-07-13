import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "rid-theme";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>(
  {
    theme: "light",
    toggle: () => {},
    setTheme: () => {},
  },
);

/**
 * Blocking script — runs in <head> BEFORE React hydrates so the correct theme
 * class is on <html> from the first paint. Prevents flash and eliminates the
 * SSR/CSR mismatch that was causing spontaneous theme flips.
 */
export const THEME_INIT_SCRIPT = `
(function(){try{
  var k='${STORAGE_KEY}';
  var s=localStorage.getItem(k);
  var t = s==='dark'||s==='light' ? s
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light');
  var r=document.documentElement;
  if(t==='dark') r.classList.add('dark'); else r.classList.remove('dark');
  r.dataset.theme=t;
}catch(e){}})();
`;

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Apply changes when user explicitly toggles. No OS-preference listener —
  // the user's manual choice is authoritative for the entire session.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Cross-tab sync only (not OS preference).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        setTheme: setThemeState,
        toggle: () => setThemeState((t) => (t === "light" ? "dark" : "light")),
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
