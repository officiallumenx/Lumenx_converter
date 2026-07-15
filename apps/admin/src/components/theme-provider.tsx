import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  set: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem("luminexa-theme")) as Theme | null;
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem("luminexa-theme", theme);
    } catch (_) {
      /* storage unavailable */
    }
  }, [theme]);

  return (
    <ThemeCtx.Provider
      value={{ theme, set: setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
