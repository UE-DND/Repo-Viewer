import React from "react";
import { SnackbarProvider } from "notistack";
import { useTheme, useMediaQuery } from "@mui/material";
import CustomSnackbar from "./CustomSnackbar";

export const ResponsiveSnackbarProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      autoHideDuration={3000}
      dense={isSmallScreen}
      preventDuplicate
      TransitionProps={{ direction: "up" }}
      Components={{
        default: CustomSnackbar,
        success: CustomSnackbar,
        error: CustomSnackbar,
        warning: CustomSnackbar,
        info: CustomSnackbar,
      }}
      data-oid="kcy4t9o"
    >
      {children}
    </SnackbarProvider>
  );
};
