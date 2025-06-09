import React, { useEffect, useState, memo, useRef } from "react";
import {
  Box,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Worker,
  Viewer,
  SpecialZoomLevel,
  RenderError,
} from "@react-pdf-viewer/core";
import {
  defaultLayoutPlugin,
  DefaultLayoutPlugin,
} from "@react-pdf-viewer/default-layout";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import zh_CN from "@react-pdf-viewer/locales/lib/zh_CN.json";
import WarningIcon from "@mui/icons-material/Warning";
import { alpha } from "@mui/material/styles";
// 导入骨架屏组件
import { PDFPreviewSkeleton } from "../common/SkeletonComponents";

// 导入核心CSS
import "@react-pdf-viewer/core/lib/styles/index.css";
// 导入默认布局插件的CSS
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

// 固定Worker URL版本，确保与pdfjs-dist@3.11.174匹配
const WORKER_URL =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
// 添加cMap URL，确保与pdfjs-dist版本一致
const CMAP_URL = "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/";

interface PDFPreviewProps {
  pdfUrl: string;
  fileName: string;
  isSmallScreen: boolean;
  pdfContainerRef: React.RefObject<HTMLDivElement | null>;
  lastVisiblePagesRef: React.MutableRefObject<
    { page: number; ratio: number }[]
  >;
  isPdfInitializingRef: React.MutableRefObject<boolean>;
  fitToPage?: boolean;
  onClose?: () => void;
}

// 自定义更完整的中文翻译
const customZhLocalization = {
  ...zh_CN,
  rotate: {
    rotateForward: "顺时针旋转",
    rotateBackward: "逆时针旋转",
  },
  scrollMode: {
    horizontalScrolling: "水平滚动",
    verticalScrolling: "垂直滚动",
    wrappedScrolling: "环绕滚动",
    Page: "分页模式",
    Horizontal: "水平滚动",
    Vertical: "垂直滚动",
    Wrapped: "环绕滚动",
  },
  selectionMode: {
    textSelectionTool: "文本选择工具",
    handTool: "手型工具",
  },
  zoom: {
    actualSize: "实际大小",
    pageFit: "适合页面",
    pageWidth: "页面宽度",
    zoomDocument: "缩放文档",
    zoomIn: "放大",
    zoomOut: "缩小",
  },
  // 大写格式ViewMode枚举值适配
  ViewMode: {
    SinglePage: "单页视图",
    DualPage: "双页视图",
    DualPageWithCover: "双页视图（带封面）",
  },
  // 使用exports.ViewMode格式
  "$exports.ViewMode": {
    SinglePage: "单页视图",
    DualPage: "双页视图",
    DualPageWithCover: "双页视图（带封面）",
  },
  // 按钮相关翻译
  button: {
    select: "选择",
    scroll: "滚动",
    previousPage: "上一页",
    nextPage: "下一页",
    firstPage: "第一页",
    lastPage: "最后一页",
    rotateCw: "顺时针旋转",
    rotateCcw: "逆时针旋转",
    zoomIn: "放大",
    zoomOut: "缩小",
    singlePageMode: "单页模式",
    doublePagesMode: "双页模式",
    coverPagesMode: "封面页模式",
    moreOptions: "更多选项",
  },
};

const PDFPreview = memo<PDFPreviewProps>(
  ({
    pdfUrl,
    fileName,
    isSmallScreen,
    pdfContainerRef,
    lastVisiblePagesRef,
    isPdfInitializingRef,
    fitToPage = false,
    onClose,
  }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [securityDialogOpen, setSecurityDialogOpen] = useState(true);
    const [showPdf, setShowPdf] = useState(false);
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // 自定义缩放插件配置
    const zoomPluginInstance = zoomPlugin({
      // 启用键盘快捷键
      enableShortcuts: true,
    });

    // 创建页面导航插件
    const pageNavigationPluginInstance = pageNavigationPlugin();

    // 创建默认布局插件并整合缩放和导航插件
    const defaultLayoutPluginInstance = defaultLayoutPlugin({
      toolbarPlugin: {
        fullScreenPlugin: {
          // 自定义全屏模式
          onEnterFullScreen: (zoom) => {
            // 可以在这里添加进入全屏的逻辑
          },
          onExitFullScreen: (zoom) => {
            // 可以在这里添加退出全屏的逻辑
          },
        },
      },
      // 移动端隐藏左侧工具栏
      sidebarTabs: isSmallScreen ? (defaultTabs) => [] : undefined,
    });

    // 处理安全对话框确认
    const handleSecurityConfirm = () => {
      setSecurityDialogOpen(false);
      setShowPdf(true);
      // 继续加载PDF
      isPdfInitializingRef.current = true;

      // 模拟PDF加载完成
      const timer = setTimeout(() => {
        setLoading(false);
        isPdfInitializingRef.current = false;
      }, 1000);

      return () => {
        clearTimeout(timer);
        isPdfInitializingRef.current = false;
      };
    };

    // 处理安全对话框取消
    const handleSecurityCancel = () => {
      setSecurityDialogOpen(false);
      setError("用户取消了PDF预览");
      setLoading(false);
      // 通知父组件关闭预览
      if (onClose) {
        onClose();
      }
    };

    // 处理加载状态
    useEffect(() => {
      setLoading(true);
      setError(null);
      setSecurityDialogOpen(true);
      setShowPdf(false);
      isPdfInitializingRef.current = true;

      return () => {
        isPdfInitializingRef.current = false;
      };
    }, [pdfUrl, isPdfInitializingRef]);

    // 处理PDF加载完成事件
    const handleDocumentLoad = () => {
      setLoading(false);
    };

    // 错误处理函数
    const handleError = (e: any) => {
      console.error("PDF错误:", e);
      setError(`加载PDF时出错: ${e.message || "未知错误"}`);
      setLoading(false);
    };

    // 自定义渲染错误UI
    const renderError = (error: any) => {
      // 报告错误但是在另一个地方显示它
      handleError(error);

      // 返回空组件，因为我们会在其他地方渲染错误UI
      return <></>;
    };

    // 添加流畅缩放支持
    useEffect(() => {
      if (showPdf && !loading && isSmallScreen && viewerRef.current) {
        const container = viewerRef.current;
        let initialDistance = 0;
        let initialScale = 1;
        let lastTouchEndTime = 0;
        let isPinching = false;

        // 计算两个触摸点之间的距离
        const getDistance = (touches: TouchList): number => {
          if (touches.length < 2) return 0;
          const dx = touches[0].clientX - touches[1].clientX;
          const dy = touches[0].clientY - touches[1].clientY;
          return Math.sqrt(dx * dx + dy * dy);
        };

        // 获取触摸中心点
        const getMidpoint = (touches: TouchList): { x: number; y: number } => {
          if (touches.length < 2)
            return { x: touches[0].clientX, y: touches[0].clientY };
          return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
          };
        };

        // 处理触摸开始事件
        const handleTouchStart = (e: TouchEvent) => {
          // 停止事件冒泡，防止其他处理器干扰
          e.stopPropagation();

          if (e.touches.length === 2) {
            // 双指触摸，准备缩放
            isPinching = true;
            initialDistance = getDistance(e.touches);
            initialScale = scale;
            e.preventDefault();
          } else if (e.touches.length === 1) {
            // 单指触摸，准备拖动
            const now = Date.now();
            if (now - lastTouchEndTime < 300) {
              // 双击检测
              if (scale > 1) {
                // 如果已经放大，则还原
                setScale(1);
              } else {
                // 否则放大到200%
                setScale(2);
              }
            } else {
              // 记录拖动起点
              dragStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
              setIsDragging(true);
            }
          }
        };

        // 处理触摸移动事件
        const handleTouchMove = (e: TouchEvent) => {
          if (isPinching && e.touches.length === 2) {
            // 处理缩放手势
            const currentDistance = getDistance(e.touches);
            const scaleFactor = currentDistance / initialDistance;
            const newScale = Math.max(
              0.5,
              Math.min(5, initialScale * scaleFactor),
            );

            setScale(newScale);
            e.preventDefault();
          } else if (isDragging && e.touches.length === 1 && scale > 1) {
            // 仅在放大状态下支持拖动
            const pdfViewer = container.querySelector(
              ".rpv-core__viewer-container",
            );
            if (pdfViewer) {
              const dx = e.touches[0].clientX - dragStartRef.current.x;
              const dy = e.touches[0].clientY - dragStartRef.current.y;

              // 使用requestAnimationFrame确保平滑滚动
              requestAnimationFrame(() => {
                (pdfViewer as HTMLElement).scrollLeft -= dx;
                (pdfViewer as HTMLElement).scrollTop -= dy;
              });

              // 更新拖动起点
              dragStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }
            e.preventDefault();
          }
        };

        // 处理触摸结束事件
        const handleTouchEnd = (e: TouchEvent) => {
          lastTouchEndTime = Date.now();
          isPinching = false;
          setIsDragging(false);
        };

        // 添加事件监听器
        container.addEventListener("touchstart", handleTouchStart, {
          passive: false,
        });
        container.addEventListener("touchmove", handleTouchMove, {
          passive: false,
        });
        container.addEventListener("touchend", handleTouchEnd);

        // 清除事件监听器
        return () => {
          container.removeEventListener("touchstart", handleTouchStart);
          container.removeEventListener("touchmove", handleTouchMove);
          container.removeEventListener("touchend", handleTouchEnd);
        };
      }
    }, [showPdf, loading, isSmallScreen, scale]);

    return (
      <Box
        ref={pdfContainerRef}
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5",
          // 移动端下移除所有外边距和内边距
          ...(isSmallScreen && {
            m: 0,
            p: 0,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.modal,
          }),
        }}
        data-oid="e2v3tht"
      >
        {!isSmallScreen && (
          <Typography
            variant="h6"
            sx={{
              py: 1.5,
              px: 2,
              textAlign: "center",
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(0,0,0,0.4)"
                  : "rgba(255,255,255,0.8)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
            data-oid="5f:.thx"
          >
            {fileName}
          </Typography>
        )}

        {/* 安全确认对话框 */}
        <Dialog
          open={securityDialogOpen}
          onClose={handleSecurityCancel}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          data-oid="8q435cy"
        >
          <DialogTitle
            id="alert-dialog-title"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
            data-oid="n7nn7nw"
          >
            <WarningIcon color="warning" data-oid="gx5qvqo" />
            <span data-oid="7-_s6:n">PDF安全警告</span>
          </DialogTitle>
          <DialogContent data-oid="5e6.xen">
            <DialogContentText id="alert-dialog-description" data-oid="y5b.:k_">
              预览组件可能会自动执行含有攻击性的代码，是否信任该文件？
            </DialogContentText>
          </DialogContent>
          <DialogActions data-oid="5ir..ox">
            <Button
              onClick={handleSecurityConfirm}
              variant="outlined"
              data-oid="u-x7dh6"
            >
              确定
            </Button>
            <Button
              onClick={handleSecurityCancel}
              color="primary"
              variant="contained"
              autoFocus
              data-oid="e0s3_99"
            >
              取消
            </Button>
          </DialogActions>
        </Dialog>

        {loading ? (
          // 使用 PDF 预览骨架屏替代加载指示器
          <PDFPreviewSkeleton
            isSmallScreen={isSmallScreen}
            data-oid="m.oftzu"
          />
        ) : error ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              p: 3,
              color: "error.main",
            }}
            data-oid="hba4gf8"
          >
            <Typography data-oid="h:9lsec">{error}</Typography>
          </Box>
        ) : showPdf ? (
          <Box
            ref={viewerRef}
            sx={{
              flex: 1,
              overflow: "auto",
              "& .rpv-core__viewer": {
                height: "100%",
              },
              "& .rpv-default-layout__main": {
                height: "100%",
              },
              "& .rpv-default-layout__container": {
                height: "100%",
                overflow: "hidden",
              },
              // 优化PDF渲染性能
              "& .rpv-core__text-layer": {
                opacity: isSmallScreen ? 0 : 1, // 移动端缩放时隐藏文本层提高性能
              },
              "& .rpv-core__canvas-layer canvas": {
                imageRendering: "crisp-edges",
                backfaceVisibility: "hidden",
                willChange: "transform",
                transformOrigin: "center center",
                transition: "none", // 移除过渡效果以获得更直接的缩放体验
              },
              // 添加CSS缩放支持
              ...(isSmallScreen && {
                "& .rpv-core__viewer-container": {
                  transform: `scale(${scale})`,
                  transformOrigin: "center top",
                  transition: isDragging ? "none" : "transform 0.05s ease-out",
                  willChange: "transform",
                },
              }),
              // 移动端下确保内容完全填充
              ...(isSmallScreen && {
                m: 0,
                p: 0,
                width: "100vw",
                height: "100vh",
                "& .rpv-core__viewer": {
                  margin: 0,
                  padding: 0,
                },
                "& .rpv-default-layout__container": {
                  margin: 0,
                  padding: 0,
                  border: "none",
                },
                "& .rpv-default-layout__toolbar": {
                  padding: 0,
                },
                "& .rpv-default-layout__content": {
                  margin: 0,
                  padding: 0,
                },
                // 移动端隐藏滚动条
                "& ::-webkit-scrollbar": {
                  display: "none",
                  width: 0,
                  height: 0,
                },
                "& *": {
                  scrollbarWidth: "none",
                  "-ms-overflow-style": "none",
                },
                "& .rpv-core__viewer-container": {
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                  scrollbarWidth: "none",
                  "-ms-overflow-style": "none",
                },
              }),
            }}
            data-oid="oohlzke"
          >
            <Worker workerUrl={WORKER_URL} data-oid="ts5dr88">
              <Viewer
                fileUrl={pdfUrl}
                plugins={[
                  defaultLayoutPluginInstance,
                  zoomPluginInstance,
                  pageNavigationPluginInstance,
                ]}
                defaultScale={
                  isSmallScreen
                    ? SpecialZoomLevel.PageWidth // 移动端使用"页面宽度"
                    : 1.0 // 桌面端始终使用精确的100%缩放
                }
                onDocumentLoad={handleDocumentLoad}
                renderError={renderError}
                theme={theme.palette.mode === "dark" ? "dark" : "light"}
                localization={customZhLocalization}
                transformGetDocumentParams={(params) => ({
                  ...params,
                  cMapUrl: CMAP_URL,
                  cMapPacked: true,
                  // 提高渲染性能的配置
                  disableAutoFetch: false,
                  disableStream: false,
                  disableFontFace: false,
                  enableXfa: true,
                  renderInteractiveForms: true,
                  // 缓存设置
                  cacheSize: 50,
                  useWorkerFetch: true,
                  enableWebGL: true,
                  disableRange: false,
                  rangeChunkSize: 65536,
                })}
                data-oid="-b4oo_o"
              />
            </Worker>
          </Box>
        ) : null}

        {onClose && (
          <Button
            variant="contained"
            color="primary"
            onClick={onClose}
            sx={{
              position: "fixed",
              right: isSmallScreen ? theme.spacing(2) : theme.spacing(4),
              bottom: isSmallScreen ? theme.spacing(2) : theme.spacing(4),
              borderRadius: theme.shape.borderRadius * 2,
              minWidth: "80px",
              fontWeight: "bold",
              backgroundColor:
                theme.palette.mode === "dark"
                  ? theme.palette.primary.dark
                  : theme.palette.primary.main,
              color: "#fff",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.primary.dark, 0.9)
                    : alpha(theme.palette.primary.main, 0.9),
              },
              zIndex: theme.zIndex.modal + 50,
            }}
            data-oid="qpz.lih"
          >
            关闭
          </Button>
        )}
      </Box>
    );
  },
);

export default PDFPreview;
