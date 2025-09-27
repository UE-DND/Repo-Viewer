/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useMemo, ReactNode } from "react";
import { PaletteMode, useMediaQuery } from "@mui/material";

// 颜色模式上下文类型
interface ColorModeContextType {
  toggleColorMode: () => void;
  toggleAutoMode: () => void;
  mode: PaletteMode;
  isAutoMode: boolean;
}

// 创建颜色模式上下文
export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  toggleAutoMode: () => {},
  mode: "light",
  isAutoMode: false,
});

// 颜色模式提供者组件Props
interface ColorModeProviderProps {
  children: ReactNode;
}

// 颜色模式提供者组件
export const ColorModeProvider: React.FC<ColorModeProviderProps> = ({
  children,
}) => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState<PaletteMode>(
    (localStorage.getItem("colorMode") as PaletteMode) ||
      (prefersDarkMode ? "dark" : "light"),
  );
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
