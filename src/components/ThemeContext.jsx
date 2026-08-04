import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const MODE_KEY = "gdmr-theme";     // "light" | "dark" | "system"
const ACCENT_KEY = "gdmr-accent";  // "green" | "blue" | "purple" | "rose" | "orange" | "teal"

export const ACCENTS = [
  { key: "green",  label: "Green",  swatch: "#34a06a" },
  { key: "blue",   label: "Blue",   swatch: "#2563eb" },
  { key: "purple", label: "Purple", swatch: "#7c3aed" },
  { key: "rose",   label: "Rose",   swatch: "#e11d48" },
  { key: "orange", label: "Orange", swatch: "#ea580c" },
  { key: "teal",   label: "Teal",   swatch: "#0d9488" },
];

export function useTheme() {
  return useContext(ThemeContext);
}

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyMode(mode) {
  const resolved = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(MODE_KEY) || "system");
  const [accent, setAccentState] = useState(() => localStorage.getItem(ACCENT_KEY) || "green");

  useEffect(() => { applyMode(mode); }, [mode]);
  useEffect(() => { document.documentElement.setAttribute("data-accent", accent); }, [accent]);

  // Live-update when in "system" mode and the OS preference changes
  useEffect(() => {
    if (mode !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("system");
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, [mode]);

  const setMode = (next) => {
    setModeState(next);
    localStorage.setItem(MODE_KEY, next);
  };
  const setAccent = (next) => {
    setAccentState(next);
    localStorage.setItem(ACCENT_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}
