import { useEffect } from "react";
import { usePrefsStore } from "../store/usePrefsStore";

export function useThemeClass() {
  const theme = usePrefsStore((s) => s.prefs.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);
}
