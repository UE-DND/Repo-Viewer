import React, { useEffect, useState } from 'react';
import { Box, Typography, Link, Container, useTheme } from '@mui/material';
import { GitHubService } from '../../../services/github';

interface VersionInfo {
  sha: string;
  message: string;
  date: string;
}

const Footer: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const currentYear = new Date().getFullYear();
  const theme = useTheme();
  
  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const latestCommit = await GitHubService.getLatestCommit();
        setVersionInfo(latestCommit);
      } catch (error) {
        console.error('获取版本信息失败:', error);
      }
    };
    
    fetchVersionInfo();
  }, []);
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 2.5, 
        px: 2, 
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: theme.palette.mode === 'light' ? '#FFFBFE' : '#1C1B1F',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, 
          gap: { xs: 1, sm: 0 },
          alignItems: 'center' 
        }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }} /> {/* 左侧空白占位 */}
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              textAlign: { xs: 'center', sm: 'center' },
              fontSize: '0.75rem',
              order: { xs: 2, sm: 1 }
            }}
          >
            <Link 
              color="inherit" 
              href="https://github.com/UE-DND/Repo-Viewer" 
              target="_blank" 
              rel="noopener"
              sx={{ 
                textDecoration: 'none',
                transition: 'color 0.2s ease-in-out',
                '&:hover': { 
                  color: theme.palette.primary.main,
                  textDecoration: 'none'
                }
              }}
            >
              Repo-Viewer
            </Link>
            {versionInfo && (
              <> · {versionInfo.sha.substring(0, 7)} - {versionInfo.message.split('\n')[0]}</>
            )}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              textAlign: { xs: 'center', sm: 'right' },
              fontSize: '0.75rem',
              order: { xs: 1, sm: 2 }
            }}
          >
            © {currentYear} <Link 
              color="inherit" 
              href="https://github.com/UE-DND" 
              target="_blank" 
              rel="noopener"
              sx={{ 
                textDecoration: 'none',
                transition: 'color 0.2s ease-in-out',
                '&:hover': { 
                  color: theme.palette.primary.main,
                  textDecoration: 'none'
                }
              }}
            >UE-DND</Link> · Released under GNU AGPL 3.0
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 