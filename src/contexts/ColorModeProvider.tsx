import React, { useMemo, useState, type ReactNode } from "react";
import { type PaletteMode, useMediaQuery } from "@mui/material";
import { ColorModeContext } from "./colorModeContext";

// 颜色模式提供者组件Props
interface ColorModeProviderProps {
  children: ReactNode;
}

// 颜色模式提供者组件
export const ColorModeProvider: React.FC<ColorModeProviderProps> = ({
  children,
}) => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem("colorMode");
    if (savedMode === "light" || savedMode === "dark") {
      return savedMode;
    }
    return prefersDarkMode ? "dark" : "light";
  });
  const [isAutoMode, setIsAutoMode] = useState<boolean>(false);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("colorMode", newMode);
          return newMode;
        });
      },
      toggleAutoMode: () => {
        setIsAutoMode((prev) => !prev);
      },
      mode,
      isAutoMode,
    }),
    [mode, isAutoMode],
  );

  return (
    <ColorModeContext.Provider value={colorMode} data-oid="zbecvw5">
      {children}
    </ColorModeContext.Provider>
  );
};
