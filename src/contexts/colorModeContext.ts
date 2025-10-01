import { createContext } from "react";
import type { PaletteMode } from "@mui/material";

export interface ColorModeContextType {
  toggleColorMode: () => void;
  toggleAutoMode: () => void;
  mode: PaletteMode;
  isAutoMode: boolean;
}

export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  toggleAutoMode: () => {},
  mode: "light",
  isAutoMode: false,
});
