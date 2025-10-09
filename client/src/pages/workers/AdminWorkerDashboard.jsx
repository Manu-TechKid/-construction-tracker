import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const AdminWorkerDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Fetch all workers
  const {
    data: usersData,
    isLoading,
    error,
    refetch
  } = useGetUsersQuery({
    role: 'worker',
    isActive: true,
    approvalStatus: 'approved'
  });

  const workers = usersData?.data?.users || [];

  const handleMenuClick = (event, worker) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorker(worker);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorker(null);
  };

  const handleViewTimeTracking = (worker) => {
    navigate(`/time-tracking?worker=${worker._id}`);
    handleMenuClose();
  };

  const handleViewEmploymentLetter = (worker) => {
    navigate(`/employment/letter/${worker._id}`);
    handleMenuClose();
  };

  const handleViewProfile = (worker) => {
    navigate(`/workers/${worker._id}`);
    handleMenuClose();
  };

  // Check admin permission
  if (!hasPermission(['admin', 'manager'])) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to access this page.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load workers. {error?.data?.message || 'Please try again later.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Admin Worker Management</Typography>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          onClick={() => navigate('/workers')}
        >
          Manage Workers
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Workers
                  </Typography>
                  <Typography variant="h4">{workers.length}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Available Workers
                  </Typography>
                  <Typography variant="h4">
                    {workers.filter(w => w.workerProfile?.status === 'available').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    On Assignment
                  </Typography>
                  <Typography variant="h4">
                    {workers.filter(w => w.workerProfile?.status === 'busy').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <AssessmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Unavailable
                  </Typography>
                  <Typography variant="h4">
                    {workers.filter(w => w.workerProfile?.status === 'unavailable').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="All Workers" />
            <Tab label="Weekly Hours" />
            <Tab label="Employment Letters" />
          </Tabs>
        </Box>

        <CardContent>
          {/* All Workers Tab */}
          {tabValue === 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Skills</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow key={worker._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={worker.photo}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {worker.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {worker._id.slice(-6)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{worker.email}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {worker.phone || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {worker.workerProfile?.skills?.slice(0, 3).map((skill) => (
                            <Chip key={skill} label={skill} size="small" variant="outlined" />
                          ))}
                          {worker.workerProfile?.skills?.length > 3 && (
                            <Chip
                              label={`+${worker.workerProfile.skills.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={worker.workerProfile?.status || 'unknown'}
                          size="small"
                          color={
                            worker.workerProfile?.status === 'available'
                              ? 'success'
                              : worker.workerProfile?.status === 'busy'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {worker.workerProfile?.paymentType === 'hourly'
                            ? `$${worker.workerProfile?.hourlyRate || '0'}/hr`
                            : `$${worker.workerProfile?.contractRate || '0'} (contract)`}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, worker)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="textSecondary">No workers found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Weekly Hours Tab */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Weekly Hours Summary
              </Typography>
              <Button
                variant="contained"
                startIcon={<ScheduleIcon />}
                onClick={() => navigate('/time-tracking')}
                sx={{ mb: 2 }}
              >
                View Full Time Tracking
              </Button>
              <Alert severity="info" sx={{ mt: 2 }}>
                Click "View Full Time Tracking" to see detailed weekly hours for all workers.
              </Alert>
            </Box>
          )}

          {/* Employment Letters Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Employment Reference Letters
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {workers.map((worker) => (
                  <Grid item xs={12} sm={6} md={4} key={worker._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar src={worker.photo}>
                            <PersonIcon />
                          </Avatar>
                          <Typography variant="body1" fontWeight="medium">
                            {worker.name}
                          </Typography>
                        </Box>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<DescriptionIcon />}
                          onClick={() => handleViewEmploymentLetter(worker)}
                        >
                          Generate Letter
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewProfile(selectedWorker)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleViewTimeTracking(selectedWorker)}>
          <ListItemIcon>
            <ScheduleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Time Tracking</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleViewEmploymentLetter(selectedWorker)}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Employment Letter</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AdminWorkerDashboard;
