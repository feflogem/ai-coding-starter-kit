"use client"

import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
      aria-label="Theme wechseln"
    >
      {theme === "dark" ? "☀ Hell" : "☾ Dunkel"}
    </button>
  )
}
