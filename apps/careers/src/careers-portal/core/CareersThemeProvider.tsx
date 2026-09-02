import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";

import type { CareersThemeMode } from "@/lib/careers/types";



const storage = createBrowserAuthStorage();



interface ThemeContextValue {

  theme: CareersThemeMode;

  setTheme: (t: CareersThemeMode) => void;

  isDark: boolean;

}



const ThemeContext = createContext<ThemeContextValue | null>(null);



function readStoredTheme(): CareersThemeMode {

  const raw = storage.getItem(CAREERS_STORAGE_KEYS.theme);

  if (raw === "dark") return "dark";

  // Migrate legacy "system" (Follow System is not supported) → light

  return "light";

}



export function CareersThemeProvider({ children }: { children: ReactNode }) {

  const [theme, setThemeState] = useState<CareersThemeMode>(() => readStoredTheme());



  const isDark = theme === "dark";



  useEffect(() => {

    document.documentElement.classList.toggle("dark", isDark);

    storage.setItem(CAREERS_STORAGE_KEYS.theme, theme);

  }, [theme, isDark]);



  const setTheme = useCallback((t: CareersThemeMode) => setThemeState(t), []);



  const value = useMemo(

    () => ({ theme, setTheme, isDark }),

    [theme, setTheme, isDark],

  );



  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;

}



export function useCareersTheme() {

  const ctx = useContext(ThemeContext);

  if (!ctx) throw new Error("useCareersTheme must be used within CareersThemeProvider");

  return ctx;

}


