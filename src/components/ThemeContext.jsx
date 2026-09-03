import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const ACCENT_KEY = "gdmr-accent";  // "green" | "blue" | "purple" | "rose" | "orange" | "teal"

export const ACCENTS = [
  { key: "green",  label: "Green",  swatch: "#34a06a" },
  { key: "blue",   label: "Blue",   swatch: "#2563eb" },
  { key: "purple", label: "Purple", swatch: "#7c3aed" },
  { key: "rose",   label: "Rose",   swatch: "#e11d48" },
  { key: "orange", label: "Orange", swatch: "#ea580c" },
  { key: "teal",   label: "Teal",   swatch: "#007D88" },
];

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  // Light-only: the Dark / System options were removed from Settings. `mode`
  // is fixed to "light" and any previously-stored "dark"/"system" preference
  // is ignored, so no one is left stuck in a theme they can't change.
  const mode = "light";
  // Default accent is "teal" (Jampack reference palette) — anyone who's
  // already picked a color in Settings keeps exactly that choice (it's in
  // localStorage), this only changes what a first-time/never-customized
  // user sees out of the box.
  const [accent, setAccentState] = useState(() => localStorage.getItem(ACCENT_KEY) || "teal");

  useEffect(() => { document.documentElement.setAttribute("data-theme", "light"); }, []);
  useEffect(() => { document.documentElement.setAttribute("data-accent", accent); }, [accent]);

  const setMode = () => { /* no-op — light-only */ };
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
