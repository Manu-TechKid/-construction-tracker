import { Box, Container, Paper, Typography } from '@mui/material';

const AuthLayout = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" color="primary" gutterBottom>
            Construction Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your construction projects efficiently
          </Typography>
        </Box>
        <Paper
          elevation={2}
          sx={{
            p: 3,
            borderRadius: 2,
            width: '100%',
          }}
        >
          {children}
        </Paper>
      </Box>
    </Box>
  );
};

export default AuthLayout;
