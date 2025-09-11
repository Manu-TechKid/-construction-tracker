import React from 'react';
import {
  Box,
  Container,
  Typography,
  Alert
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

const WorkerDashboard = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
      </Box>

      <Alert severity="info">
        <Typography variant="h6" gutterBottom>
          Work order functionality is currently under maintenance.
        </Typography>
        <Typography>
          Please check back later for your assignments.
        </Typography>
      </Alert>
    </Container>
  );
};

export default WorkerDashboard;
