import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "gdmr-theme"; // "light" | "dark" | "system"

export function useTheme() {
  return useContext(ThemeContext);
}

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode) {
  const resolved = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(STORAGE_KEY) || "system");

  useEffect(() => { applyTheme(mode); }, [mode]);

  // Live-update when in "system" mode and the OS preference changes
  useEffect(() => {
    if (mode !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, [mode]);

  const setMode = (next) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
