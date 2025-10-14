import React from "react";
import {
  Box,
  Typography,
  Link,
  Container,
  useTheme,
} from "@mui/material";
import { BranchSwitcher } from "@/components/ui";

declare const __APP_VERSION__: string;

const Footer: React.FC = () => {
  const version = __APP_VERSION__;
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
          {/* 萌ICP备 */}
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
                textDecoration: "none",
                fontSize: "0.75rem",
                color: "text.secondary",
                transition: "color 0.2s ease-in-out",
                "&:hover": {
                  color: theme.palette.primary.main,
                },
              }}
            >
              萌ICP备 20251940号
            </Link>
          </Box>

          {/* 分支切换器 */}
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              justifyContent: "center",
            }}
            data-oid="wukw05h"
          >
            <BranchSwitcher showLabel={true} />
          </Box>

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
            Built with{" "}
            <Link
              color="primary"
              href="https://github.com/UE-DND/Repo-Viewer"
              target="_blank"
              rel="noopener"
              sx={{
                textDecoration: "none",
                transition: "color 0.2s ease-in-out",
                "&:hover": {
                  color: theme.palette.primary.dark,
                  textDecoration: "none",
                },
              }}
              data-oid=".fmrdb9"
            >
              RepoViewer
            </Link>
            {version !== '' && (
              <>
                {" "}
                {version}
              </>
            )}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
