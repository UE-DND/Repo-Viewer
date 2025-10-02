import React from "react";
import { Box, Typography, Link, Container, useTheme } from "@mui/material";

declare const __APP_VERSION__: string;

const Footer: React.FC = () => {
  const version = __APP_VERSION__;
  const currentYear = new Date().getFullYear();
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        py: 2.5,
        px: 2,
        mt: "auto",
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: theme.palette.mode === "light" ? "#FFFBFE" : "#1C1B1F",
        transition: "background-color 0.3s, border-color 0.3s",
      }}
      data-oid="bljwygu"
    >
      <Container maxWidth="lg" data-oid="bw3i.iq">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr auto 1fr" },
            gap: { xs: 1, sm: 0 },
            alignItems: "center",
          }}
          data-oid="uk5kgqo"
        >
          {/* 左侧：萌ICP备徽标 */}
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              justifyContent: "flex-start",
            }}
            data-oid="3z6-ik7"
          >
            <Link
              href="https://icp.gov.moe/?keyword=20251940"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                lineHeight: 0,
                display: "inline-flex",
                alignItems: "center",
                transition: "opacity 0.2s ease-in-out, transform 0.2s ease",
                opacity: 0.9,
                '&:hover': { opacity: 1, transform: 'translateY(-1px)' },
              }}
            >
              <img
                src="/moeicp.svg"
                alt="萌ICP备 20251940号"
                style={{ display: 'block', height: 20, width: 'auto' }}
              />
            </Link>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: { xs: "center", sm: "center" },
              fontSize: "0.75rem",
              order: { xs: 2, sm: 1 },
            }}
            data-oid="wukw05h"
          >
            <Link
              color="inherit"
              href="https://github.com/UE-DND/Repo-Viewer"
              target="_blank"
              rel="noopener"
              sx={{
                textDecoration: "none",
                transition: "color 0.2s ease-in-out",
                "&:hover": {
                  color: theme.palette.primary.main,
                  textDecoration: "none",
                },
              }}
              data-oid=".fmrdb9"
            >
              Repo-Viewer
            </Link>
            {version !== '' && (
              <>
                {" "}
                · {version}
              </>
            )}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: { xs: "center", sm: "right" },
              fontSize: "0.75rem",
              order: { xs: 1, sm: 2 },
            }}
            data-oid="78vii.:"
          >
            © {currentYear}{" "}
            <Link
              color="inherit"
              href="https://github.com/UE-DND"
              target="_blank"
              rel="noopener"
              sx={{
                textDecoration: "none",
                transition: "color 0.2s ease-in-out",
                "&:hover": {
                  color: theme.palette.primary.main,
                  textDecoration: "none",
                },
              }}
              data-oid="k7qr9bw"
            >
              UE-DND
            </Link>{" "}
            · Released under GNU AGPL 3.0
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
