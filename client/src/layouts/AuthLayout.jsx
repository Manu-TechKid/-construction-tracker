import { Box, Paper, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../components/common/ErrorBoundary';

const AuthLayout = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: theme.palette.grey[100],
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}>
            Construction Tracker
          </Typography>
          <Typography variant="subtitle1" sx={{ color: theme.palette.text.secondary }}>
            Manage your construction projects efficiently
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
          <ErrorBoundary>
            {children ? children : <Outlet />}
          </ErrorBoundary>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            © {new Date().getFullYear()} Construction Tracker. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
