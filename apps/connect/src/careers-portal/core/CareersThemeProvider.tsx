import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { CareersThemeMode } from "@/lib/careers/types";

const storage = createBrowserAuthStorage();

interface ThemeContextValue {
  theme: CareersThemeMode;
  setTheme: (t: CareersThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveDark(mode: CareersThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export function CareersThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<CareersThemeMode>(() => {
    const raw = storage.getItem(CAREERS_STORAGE_KEYS.theme);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
    return "light";
  });

  const [isDark, setIsDark] = useState(() => resolveDark(theme));

  useEffect(() => {
    const apply = () => setIsDark(resolveDark(theme));
    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    storage.setItem(CAREERS_STORAGE_KEYS.theme, theme);
  }, [theme, isDark]);

  const setTheme = (t: CareersThemeMode) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>{children}</ThemeContext.Provider>
  );
}

export function useCareersTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useCareersTheme must be used within CareersThemeProvider");
  return ctx;
}
