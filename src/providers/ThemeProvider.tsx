import React, { useMemo, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createMaterialYouTheme } from "../theme";
import { ColorModeContext } from "../contexts/ColorModeContext";
import { useThemeMode } from "../hooks/useThemeMode";

interface ThemeProviderProps {
  children: ReactNode;
}

// 使用memo优化ThemeProvider组件，避免不必要的重新渲染
const ThemeProvider: React.FC<ThemeProviderProps> = React.memo(
  ({ children }) => {
    // 使用自定义hook获取主题模式
    const colorMode = useThemeMode();

    // 仅当模式改变时才创建新主题
    const theme = useMemo(
      () => createMaterialYouTheme(colorMode.mode),
      [colorMode.mode],
    );

    return (
      <ColorModeContext.Provider value={colorMode} data-oid="x_82-n7">
        <MuiThemeProvider theme={theme} data-oid="onb75g6">
          <CssBaseline data-oid="t4l0o9n" />
          {children}
        </MuiThemeProvider>
      </ColorModeContext.Provider>
    );
  },
);

// 添加显示名称以便调试
ThemeProvider.displayName = "ThemeProvider";

export default ThemeProvider;
