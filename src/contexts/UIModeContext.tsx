import React, { createContext, useContext, useState, useEffect } from "react";

type UIMode = "standard" | "easy";
type UITheme = "light" | "dark";

interface UIModeContextType {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  toggleMode: () => void;
  theme: UITheme;
  setTheme: (theme: UITheme) => void;
  toggleTheme: () => void;
}

const UIModeContext = createContext<UIModeContextType | undefined>(undefined);

export const UIModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<UITheme>(() => {
    const saved = localStorage.getItem("zen-theme");
    return (saved as UITheme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("zen-theme", theme);
    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Remove easy-mode from DOM
    root.classList.remove("easy-mode");
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <UIModeContext.Provider
      value={{
        mode: "standard",
        setMode: () => {},
        toggleMode: () => {},
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </UIModeContext.Provider>
  );
};

export const useUIMode = () => {
  const context = useContext(UIModeContext);
  if (!context) throw new Error("useUIMode must be used within UIModeProvider");
  return context;
};
