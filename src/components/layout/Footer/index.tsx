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

/**
 * 页脚组件
 * 
 * 显示应用底部信息，包括分支切换器、版权信息和ICP备案。
 */
const Footer: React.FC = () => {
  const version = __APP_VERSION__;
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        py: { xs: 1.5, sm: 2.5 },
        px: { xs: 1.5, sm: 2 },
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
            display: { xs: "flex", sm: "grid" },
            flexDirection: { xs: "column", sm: "row" },
            gridTemplateColumns: { sm: "1fr auto 1fr" },
            gap: { xs: 1, sm: 0 },
            alignItems: "center",
          }}
          data-oid="uk5kgqo"
        >
          {/* 分支切换器 - 移动端在最上方 */}
          <Box
            sx={{
              display: { xs: "flex", sm: "flex" },
              alignItems: "center",
              justifyContent: "center",
              order: { xs: 0, sm: 2 },
              transform: { xs: "scale(0.9)", sm: "scale(1)" },
              transformOrigin: "center",
            }}
            data-oid="wukw05h"
          >
            <BranchSwitcher showLabel={true} />
          </Box>

          {/* 移动端：萌ICP备和RepoViewer信息在一行 / 桌面端：萌ICP备 */}
          <Box
            sx={{
              display: { xs: "flex", sm: "flex" },
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              order: { xs: 1, sm: 1 },
              flexWrap: "wrap",
              gap: { xs: 0.75, sm: 0 },
            }}
            data-oid="3z6-ik7"
          >
            {/* 萌ICP备 */}
            <Link
              href="https://icp.gov.moe/?keyword=20251940"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textDecoration: "none",
                fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                color: "text.secondary",
                transition: "color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  color: theme.palette.primary.main,
                },
              }}
            >
              萌ICP备 20251940号
            </Link>

            {/* 分隔符 - 仅移动端显示 */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: { xs: "inline", sm: "none" },
                fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                mx: { xs: 0.375, sm: 0.5 },
              }}
            >
              •
            </Typography>

            {/* RepoViewer 信息 - 移动端显示 */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: { xs: "inline", sm: "none" },
                fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                textAlign: "center",
              }}
            >
              Presented by{" "}
              <Link
                color="primary"
                href="https://github.com/UE-DND/Repo-Viewer"
                target="_blank"
                rel="noopener"
                sx={{
                  textDecoration: "none",
                  transition: "color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    color: theme.palette.primary.dark,
                    textDecoration: "none",
                  },
                }}
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

          {/* RepoViewer 信息 - 桌面端显示 */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: { xs: "none", sm: "block" },
              textAlign: "right",
              fontSize: "0.75rem",
              order: 3,
            }}
            data-oid="78vii.:"
          >
            Presented by{" "}
            <Link
              color="primary"
              href="https://github.com/UE-DND/Repo-Viewer"
              target="_blank"
              rel="noopener"
              sx={{
                textDecoration: "none",
                transition: "color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
