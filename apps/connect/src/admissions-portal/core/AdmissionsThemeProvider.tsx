import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";

export type AdmissionsThemeMode = "light" | "dark";

const storage = createBrowserAuthStorage();

interface ThemeContextValue {
  theme: AdmissionsThemeMode;
  toggleTheme: () => void;
  setTheme: (t: AdmissionsThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AdmissionsThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdmissionsThemeMode>(() => {
    const raw = storage.getItem(ADMISSIONS_STORAGE_KEYS.theme);
    if (raw === "dark") return "dark";
    return "light";
  });

  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    storage.setItem(ADMISSIONS_STORAGE_KEYS.theme, theme);
  }, [theme, isDark]);

  const setTheme = (t: AdmissionsThemeMode) => setThemeState(t);
  const toggleTheme = () => setThemeState((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAdmissionsTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAdmissionsTheme must be used within AdmissionsThemeProvider");
  return ctx;
}
