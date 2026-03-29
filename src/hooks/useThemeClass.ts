import { useEffect, useState } from "react";
import { usePrefsStore } from "../store/usePrefsStore";

export function useThemeClass() {
  const theme = usePrefsStore((s) => s.prefs.theme);
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (resolvedTheme: "dark" | "light") => {
      setResolvedTheme(resolvedTheme);
      if (resolvedTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(media.matches ? "dark" : "light");

      const handleChange = (event: MediaQueryListEvent) => {
        applyTheme(event.matches ? "dark" : "light");
      };

      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    applyTheme(theme);
  }, [theme]);

  return resolvedTheme;
}
