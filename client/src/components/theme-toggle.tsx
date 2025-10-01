import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark" || 
           (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsDark(!isDark)}
      className="px-4 py-2 text-foreground hover:text-primary min-w-[48px]"
      title={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
      data-testid="button-theme-toggle"
    >
      <i className={`fas ${isDark ? "fa-sun" : "fa-moon"} text-lg sm:text-xl`}></i>
      <span className="sr-only">{isDark ? "Day Mode" : "Night Mode"}</span>
    </Button>
  );
}
