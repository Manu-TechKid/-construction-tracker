import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Tab,
  Tabs,
  Paper,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Work as WorkIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { 
  useGetAllWorkLogsQuery, 
  useGetWorkLogStatsQuery,
  useAddAdminFeedbackMutation 
} from '../../features/workLogs/workLogsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import WorkLogList from '../../components/workLogs/WorkLogList';


const AdminWorkLogs = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState({
    workerId: '',
    buildingId: '',
    status: '',
    startDate: null,
    endDate: null,
  });
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    workLog: null,
    feedback: '',
    status: 'reviewed'
  });

  const { hasPermission } = useAuth();

  const [addAdminFeedback, { isLoading: isAddingFeedback }] = useAddAdminFeedbackMutation();

  // Data queries
  const { data: workLogsData, isLoading: isLoadingLogs, refetch: refetchLogs } = useGetAllWorkLogsQuery(filters);
  const { data: statsData, refetch: refetchStats } = useGetWorkLogStatsQuery(filters);
  const { data: usersData } = useGetUsersQuery();
  const { data: buildingsData } = useGetBuildingsQuery();

  // Extract data
  const workLogs = workLogsData?.data?.workLogs || [];
  const stats = statsData?.data?.stats || {
    totalLogs: 0,
    pendingLogs: 0,
    reviewedLogs: 0,
    approvedLogs: 0,
    needsRevisionLogs: 0
  };
  const workers = usersData?.data?.users?.filter(user => user.role === 'worker') || [];
  const buildings = buildingsData?.data?.buildings || [];

  // Quick date filters
  const setQuickDateFilter = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = endDate = now;
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = endDate = null;
    }

    setFilters(prev => ({ ...prev, startDate, endDate }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      workerId: '',
      buildingId: '',
      status: '',
      startDate: null,
      endDate: null,
    });
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackDialog.workLog) return;

    try {
      await addAdminFeedback({
        id: feedbackDialog.workLog._id,
        feedback: feedbackDialog.feedback,
        status: feedbackDialog.status
      }).unwrap();

      toast.success('Feedback added successfully');
      setFeedbackDialog({ open: false, workLog: null, feedback: '', status: 'reviewed' });
      refetchLogs();
      refetchStats();
    } catch (error) {
      toast.error('Failed to add feedback');
    }
  };

  const openFeedbackDialog = (workLog) => {
    setFeedbackDialog({
      open: true,
      workLog,
      feedback: workLog.adminFeedback || '',
      status: workLog.status || 'reviewed'
    });
  };

  // Filter work logs by tab
  const getFilteredLogs = () => {
    switch (selectedTab) {
      case 1: return workLogs.filter(log => log.status === 'pending');
      case 2: return workLogs.filter(log => log.status === 'reviewed');
      case 3: return workLogs.filter(log => log.status === 'approved');
      case 4: return workLogs.filter(log => log.status === 'needs_revision');
      default: return workLogs;
    }
  };

  if (!hasPermission('manage:workLogs')) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          You don't have permission to access work logs management.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Work Logs Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and manage worker daily reports
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            refetchLogs();
            refetchStats();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <WorkIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {stats.totalLogs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Logs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                {stats.pendingLogs}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                {stats.reviewedLogs}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Reviewed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                {stats.approvedLogs}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'error.main', mx: 'auto', mb: 1 }}>
                {stats.needsRevisionLogs}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Needs Revision
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <FilterIcon />
            <Typography variant="h6">Filters</Typography>
          </Box>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Worker</InputLabel>
                <Select
                  value={filters.workerId}
                  onChange={(e) => handleFilterChange('workerId', e.target.value)}
                  label="Worker"
                >
                  <MenuItem value="">All Workers</MenuItem>
                  {workers.map(worker => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {worker.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Building</InputLabel>
                <Select
                  value={filters.buildingId}
                  onChange={(e) => handleFilterChange('buildingId', e.target.value)}
                  label="Building"
                >
                  <MenuItem value="">All Buildings</MenuItem>
                  {buildings.map(building => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="reviewed">Reviewed</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="needs_revision">Needs Revision</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                fullWidth
                size="small"
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {/* Quick Date Filters */}
          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            <Chip 
              label="Today" 
              onClick={() => setQuickDateFilter('today')}
              variant="outlined"
              size="small"
            />
            <Chip 
              label="This Week" 
              onClick={() => setQuickDateFilter('week')}
              variant="outlined"
              size="small"
            />
            <Chip 
              label="This Month" 
              onClick={() => setQuickDateFilter('month')}
              variant="outlined"
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All (${workLogs.length})`} />
          <Tab label={`Pending (${stats.pendingLogs})`} />
          <Tab label={`Reviewed (${stats.reviewedLogs})`} />
          <Tab label={`Approved (${stats.approvedLogs})`} />
          <Tab label={`Needs Revision (${stats.needsRevisionLogs})`} />
        </Tabs>
      </Paper>

      {/* Work Logs List */}
      {isLoadingLogs ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <WorkLogList 
          workLogs={getFilteredLogs()} 
          onRefresh={() => {
            refetchLogs();
            refetchStats();
          }}
          showAdminActions={true}
          onFeedback={openFeedbackDialog}
        />
      )}

      {/* Feedback Dialog */}
      <Dialog 
        open={feedbackDialog.open} 
        onClose={() => setFeedbackDialog({ open: false, workLog: null, feedback: '', status: 'reviewed' })}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Provide Feedback - {feedbackDialog.workLog?.worker?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={feedbackDialog.status}
                  onChange={(e) => setFeedbackDialog(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="reviewed">Reviewed</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="needs_revision">Needs Revision</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Feedback"
                value={feedbackDialog.feedback}
                onChange={(e) => setFeedbackDialog(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Provide feedback on the work completed, quality, or any corrections needed..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setFeedbackDialog({ open: false, workLog: null, feedback: '', status: 'reviewed' })}
            disabled={isAddingFeedback}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFeedbackSubmit} 
            variant="contained"
            disabled={isAddingFeedback}
            startIcon={isAddingFeedback ? <CircularProgress size={20} /> : <FeedbackIcon />}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminWorkLogs;
