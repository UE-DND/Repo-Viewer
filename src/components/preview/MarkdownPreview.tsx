import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  Box, Typography, 
  Paper, Divider, 
  CircularProgress, 
  Link, alpha, useTheme,
  IconButton,
  Button,
  GlobalStyles
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { GitHubContent } from '../../types';
import { GitHubService } from '../../services/github';
import { Components } from 'react-markdown'
import { logger } from '../../utils';
import { countLatexElements } from '../../utils/latexOptimizer';

// LaTeX错误处理函数
const handleKatexError = (message: string) => {
  logger.warn('[KaTeX] 公式渲染错误:', message);
};

// 定义KaTeX选项
const katexOptions = {
  throwOnError: false, // 不因渲染错误而中断
  strict: false,       // 非严格模式，更宽容地处理语法
  output: 'html',      // 使用HTML输出
  trust: true,         // 允许一些额外的命令
  errorCallback: handleKatexError, // 错误处理
  macros: {            // 定义一些常用的宏
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\C': '\\mathbb{C}',
    '\\Q': '\\mathbb{Q}'
  },
  fleqn: false,        // 公式左对齐
  leqno: false,        // 等式编号在左侧
  colorIsTextColor: true
};

interface MarkdownPreviewProps {
  readmeContent: string | null;
  loadingReadme: boolean;
  isSmallScreen: boolean;
  onClose?: () => void;
  previewingItem?: GitHubContent | null;
  isFullscreen?: boolean;
  isReadme?: boolean;
  lazyLoad?: boolean;
}

// 添加全局样式定义
const globalStyles = (
  <GlobalStyles 
    styles={(theme) => ({
      '.MuiPaper-root.theme-switching img': {
        transition: 'none !important'
      }
    })}
  />
);

const MarkdownPreview = memo<MarkdownPreviewProps>(({
  readmeContent,
  loadingReadme,
  isSmallScreen,
  onClose,
  previewingItem,
  isFullscreen = false,
  isReadme = false,
  lazyLoad = true
}) => {
  // 使用useTheme钩子获取主题
  const theme = useTheme();
  
  // 懒加载状态
  const [shouldRender, setShouldRender] = useState<boolean>(!lazyLoad);
  const markdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // 图片加载缓存，用于记住已加载的图片
  const loadedImagesRef = useRef<Set<string>>(new Set());
  // 添加主题切换状态追踪
  const [isThemeChanging, setIsThemeChanging] = useState<boolean>(false);
  // LaTeX公式数量
  const [latexCount, setLatexCount] = useState<number>(0);
  
  // 检测LaTeX公式数量
  const checkLatexCount = useCallback(() => {
    // 延迟检测，等待渲染完成
    setTimeout(() => {
      if (markdownRef.current) {
        const count = countLatexElements();
        setLatexCount(count);
        
        // 如果公式数量很多，在控制台提示
        if (count > 50) {
          console.warn(`检测到${count}个LaTeX公式，已启用性能优化模式`);
        }
      }
    }, 500);
  }, []);
  
  // 设置IntersectionObserver监听markdown容器
  useEffect(() => {
    if (!lazyLoad || shouldRender) return;
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldRender(true);
        // 一旦内容开始加载，就停止观察
        if (observerRef.current && markdownRef.current) {
          observerRef.current.unobserve(markdownRef.current);
        }
      }
    }, {
      root: null,
      rootMargin: '200px', // 提前200px开始加载
      threshold: 0
    });
    
    // 开始观察
    if (markdownRef.current) {
      observerRef.current.observe(markdownRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazyLoad, shouldRender]);
  
  // 添加主题切换检测
  useEffect(() => {
    // 检查是否是仅主题切换操作
    const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';
    
    // 当主题发生变化时，暂时将公式容器设为不可见，避免卡顿
    setIsThemeChanging(true);
    const timer = setTimeout(() => {
      setIsThemeChanging(false);
      
      // 检测LaTeX公式数量（仅在非主题切换操作或初始加载时进行）
      if (!isThemeChangeOnly) {
        checkLatexCount();
      }
    }, 300); // 主题切换动画完成后再显示公式
    
    return () => clearTimeout(timer);
  }, [theme.palette.mode, checkLatexCount]);
  
  // 初始检测LaTeX公式数量
  useEffect(() => {
    if (shouldRender && readmeContent) {
      checkLatexCount();
    }
  }, [shouldRender, readmeContent, checkLatexCount]);
  
  if (loadingReadme) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          py: 8 
        }}
      >
        <CircularProgress color="primary" size={isSmallScreen ? 32 : 40} />
      </Box>
    );
  }

  if (!readmeContent) {
    return null;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }} ref={markdownRef}>
      {/* 添加全局样式组件 */}
      {globalStyles}
      
      <Paper 
        elevation={0} 
        className={isThemeChanging ? 'theme-transition-katex' : ''}
        sx={{ 
          py: 2,
          px: { xs: 2, sm: 3, md: 4 },
          mt: 2, 
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflowX: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          // 主题切换时的过渡效果
          '&.theme-transition-katex .katex-display, &.theme-transition-katex .katex': {
            visibility: 'hidden',
            opacity: 0,
            transition: 'visibility 0s, opacity 0.3s linear'
          },
          // 大量公式时的特殊优化
          ...(latexCount > 50 && {
            '& .katex': {
              contain: 'paint layout style',
              willChange: 'transform',
            },
            '& .katex-display': {
              contain: 'paint layout style',
              willChange: 'transform',
            }
          }),
          '& img': {
            maxWidth: '100%',
            borderRadius: 1,
            my: 2,
            // 修改图片过渡效果，确保主题切换时不会闪烁
            transition: theme.transitions.create(['opacity', 'filter'], {
              duration: theme.transitions.duration.standard,
            }),
            // 使用filter而不是opacity，在主题切换时不会重置
            filter: 'brightness(1)',
            '&:not(.loaded)': {
              filter: 'brightness(0.6) blur(2px)',
              transform: 'scale(0.98)'
            },
            '&.theme-transition': {
              transition: 'none !important'
            }
          },
          // LaTeX公式样式
          '& .math': {
            fontSize: '1.1em',
            margin: '0.5em 0',
          },
          '& .math-inline': {
            display: 'inline-flex',
            alignItems: 'center',
            margin: '0 0.25em',
          },
          '& .katex-display': {
            margin: '1em 0',
            padding: '0.5em 0',
            overflowX: 'auto',
            overflowY: 'hidden',
          },
          // 深色模式下的LaTeX样式调整
          ...(theme.palette.mode === 'dark' && {
            '& .katex': {
              color: '#E6E1E5',
            },
            '& .katex-display': {
              background: alpha(theme.palette.background.paper, 0.4),
              borderRadius: 1,
            }
          }),
          '& p': {
            '& > a + a, & > a + img, & > img + a, & > img + img': {
              marginLeft: 1,
              marginTop: 0,
              marginBottom: 0
            },
            // 识别连续的徽章图片链接，将其设置为弹性布局
            '&:has(a > img[src*="img.shields.io"]), &:has(img[src*="img.shields.io"])': {
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              '& > a, & > img': {
                display: 'inline-flex',
                marginTop: '4px',
                marginBottom: '4px'
              },
              '& img': {
                margin: 0
              }
            }
          },
          '& h1': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            pb: 1,
            fontSize: { xs: '1.5rem', sm: '1.8rem' }
          },
          '& h2': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            pb: 1,
            mt: 3,
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          },
          '& h3, h4, h5, h6': {
            mt: 2,
            fontSize: { xs: '1rem', sm: '1.25rem' }
          },
          '& code': {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            padding: '0.2em 0.4em',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '85%'
          },
          '& pre': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.common.black, 0.7) 
              : alpha(theme.palette.common.black, 0.03),
            padding: 2,
            borderRadius: 1,
            overflowX: 'auto',
            '& code': {
              backgroundColor: 'transparent',
              padding: 0,
              fontSize: '90%'
            }
          },
          '& blockquote': {
            borderLeft: `4px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            pl: 2,
            ml: 0,
            color: theme.palette.text.secondary
          },
          '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            my: 2,
            '& th': {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              textAlign: 'left',
              padding: '8px 16px',
              fontWeight: 500
            },
            '& td': {
              padding: '8px 16px',
              borderBottom: `1px solid ${theme.palette.divider}`
            },
            '& tr:nth-of-type(even)': {
              backgroundColor: alpha(theme.palette.primary.main, 0.02)
            }
          },
          '& a': {
            color: theme.palette.primary.main,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline'
            }
          },
          '& ul, & ol': {
            pl: 3
          }
        }}
      >
        {shouldRender && !isThemeChanging && (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]} 
            rehypePlugins={[[rehypeRaw], [rehypeKatex, katexOptions]]}
            components={{
              a: ({ node, ...props }) => (
                <Link 
                  {...props} 
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                />
              ),
              img: ({ node, ...props }) => {
                // 处理图片路径
                let imgSrc = props.src;
                
                if (previewingItem && props.src) {
                  // 使用GitHubService处理图片URL
                  const transformedSrc = GitHubService.transformImageUrl(
                    props.src, 
                    previewingItem.path, 
                    true
                  );
                  imgSrc = transformedSrc || props.src;
                }
                
                // 检查图片是否已经加载过
                const isLoaded = loadedImagesRef.current.has(imgSrc || '');
                
                // 创建懒加载图片
                return (
                  <img 
                    {...props} 
                    src={imgSrc}
                    style={{ maxWidth: '100%', height: 'auto' }}
                    alt={props.alt || '图片'}
                    loading="lazy"
                    className={isLoaded ? 'loaded' : ''}
                    onLoad={(e) => {
                      // 添加loaded类以触发淡入效果
                      e.currentTarget.classList.add('loaded');
                      
                      // 记录已加载的图片，以便主题切换时不再重复加载效果
                      if (imgSrc) {
                        loadedImagesRef.current.add(imgSrc);
                      }
                    }}
                  />
                );
              },
              // 添加代码块支持，改进LaTeX代码块的处理
              code: ({ node, inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isLatexBlock = !inline && (match?.[1] === 'math' || match?.[1] === 'latex' || match?.[1] === 'tex');
                
                // 处理特殊的LaTeX代码块
                if (isLatexBlock) {
                  return (
                    <div className="math math-display" style={{ overflowX: 'auto', padding: '0.5em 0' }}>
                      {String(children).replace(/\n$/, '')}
                    </div>
                  );
                }
                
                // 普通代码块
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {readmeContent}
          </ReactMarkdown>
        )}
        
        {/* 加载中或切换主题时显示 */}
        {(isThemeChanging || !shouldRender) && (
          <Box sx={{ 
            height: '200px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            opacity: 0.7
          }}>
            <CircularProgress size={30} />
          </Box>
        )}
      </Paper>
      
      {/* 添加独立的关闭按钮，样式与PDFPreview一致 */}
      {isFullscreen && onClose && (
        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
          sx={{
            position: 'fixed',
            right: theme.spacing(6),
            bottom: theme.spacing(2),
            borderRadius: theme.shape.borderRadius * 2,
            minWidth: '80px',
            fontWeight: 'bold',
            backgroundColor: theme.palette.mode === 'dark' 
              ? theme.palette.primary.dark 
              : theme.palette.primary.main,
            color: '#fff',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.primary.dark, 0.9) 
                : alpha(theme.palette.primary.main, 0.9),
            },
            zIndex: theme.zIndex.modal + 50
          }}
        >
          关闭
        </Button>
      )}
    </Box>
  );
});

// 添加显示名称以便调试
MarkdownPreview.displayName = 'MarkdownPreview';

export default MarkdownPreview; 