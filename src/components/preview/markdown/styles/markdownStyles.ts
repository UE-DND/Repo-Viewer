import { Theme, alpha } from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "../../../../theme/g3Curves";

export const createMarkdownStyles = (
  theme: Theme,
  latexCount: number
) => ({
  py: 2,
  px: { xs: 2, sm: 3, md: 4 },
  mt: 2,
  mb: 3,
  borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
  bgcolor: "background.paper",
  overflowX: "auto",
  border: "1px solid",
  borderColor: "divider",

  // 主题切换时的过渡效果
  "&.theme-transition-katex .katex-display, &.theme-transition-katex .katex": {
    visibility: "hidden",
    opacity: 0,
    transition: "visibility 0s, opacity 0.3s linear",
  },

  // 大量公式时的特殊优化
  ...(latexCount > 50 && {
    "& .katex": {
      contain: "paint layout style",
      willChange: "transform",
    },
    "& .katex-display": {
      contain: "paint layout style",
      willChange: "transform",
    },
  }),

  "& img": {
    maxWidth: "100%",
    borderRadius: g3BorderRadius(G3_PRESETS.image),
    my: 2,
    transition: theme.transitions.create(["opacity", "filter"], {
      duration: theme.transitions.duration.standard,
    }),
    filter: "brightness(1)",
    "&:not(.loaded)": {
      opacity: 0.7,
      filter: "brightness(0.95)",
      transform: "scale(0.98)",
    },
    "&.failed": {
      filter: "grayscale(0.5) brightness(0.9)",
      border: `1px dashed ${theme.palette.error.main}`,
    },
    "&.theme-transition": {
      transition: "none !important",
    },
  },

  // LaTeX公式样式
  "& .math": {
    fontSize: "1.1em",
    margin: "0.5em 0",
  },
  "& .math-inline": {
    display: "inline-flex",
    alignItems: "center",
    margin: "0 0.25em",
  },
  "& .katex-display": {
    margin: "1em 0",
    padding: "0.5em 0",
    overflowX: "auto",
    overflowY: "hidden",
    borderRadius: g3BorderRadius(G3_PRESETS.card),
  },

  // 深色模式下的LaTeX样式调整
  ...(theme.palette.mode === "dark" && {
    "& .katex": {
      color: "#E6E1E5",
    },
    "& .katex-display": {
      background: alpha(theme.palette.background.paper, 0.4),
      borderRadius: g3BorderRadius(G3_PRESETS.card),
    },
  }),

  "& p": {
    "& > a + a, & > a + img, & > img + a, & > img + img": {
      marginLeft: 1,
      marginTop: 0,
      marginBottom: 0,
    },
    // 识别连续的徽章图片链接，将其设置为弹性布局
    '&:has(a > img[src*="img.shields.io"]), &:has(img[src*="img.shields.io"])': {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 1,
      "& > a, & > img": {
        display: "inline-flex",
        marginTop: "4px",
        marginBottom: "4px",
      },
      "& img": {
        margin: 0,
      },
    },
  },

  "& h1": {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    pb: 1,
    fontSize: { xs: "1.5rem", sm: "1.8rem" },
  },
  "& h2": {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    pb: 1,
    mt: 3,
    fontSize: { xs: "1.25rem", sm: "1.5rem" },
  },
  "& h3, h4, h5, h6": {
    mt: 2,
    fontSize: { xs: "1rem", sm: "1.25rem" },
  },

  "& code": {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    padding: "0.2em 0.4em",
    borderRadius: g3BorderRadius(G3_PRESETS.button),
    fontFamily: "monospace",
    fontSize: "85%",
  },
  "& pre": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? alpha(theme.palette.common.black, 0.7)
        : alpha(theme.palette.common.black, 0.03),
    padding: 2,
    borderRadius: g3BorderRadius(G3_PRESETS.card),
    overflowX: "auto",
    "& code": {
      backgroundColor: "transparent",
      padding: 0,
      fontSize: "90%",
    },
  },

  "& blockquote": {
    borderLeft: `4px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    pl: 2,
    ml: 0,
    color: theme.palette.text.secondary,
  },

  "& table": {
    borderCollapse: "collapse",
    width: "100%",
    my: 2,
    "& th": {
      backgroundColor: alpha(theme.palette.primary.main, 0.05),
      textAlign: "left",
      padding: "8px 16px",
      fontWeight: 500,
    },
    "& td": {
      padding: "8px 16px",
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    "& tr:nth-of-type(even)": {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
    },
  },

  "& a": {
    color: theme.palette.primary.main,
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },

  "& ul, & ol": {
    pl: 3,
  },
});
