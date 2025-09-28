import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Schedule as TimeIcon,
  Person as PersonIcon,
  Business as BuildingIcon,
  Assignment as TaskIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  PhotoCamera as PhotoIcon,
  Notes as NotesIcon,
  Timeline as StatsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { toast } from 'react-toastify';
import {
  useGetTimeSessionsQuery,
  useGetPendingApprovalsQuery,
  useApproveTimeSessionMutation,
  useGetTimeStatsQuery,
  useDeleteTimeSessionMutation
} from '../../features/timeTracking/timeTrackingApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const TimeTrackingManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workerId: '',
    buildingId: '',
    status: ''
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // API queries
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useGetTimeSessionsQuery(filters);
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useGetPendingApprovalsQuery();
  const { data: statsData, isLoading: statsLoading } = useGetTimeStatsQuery(filters);
  const { data: usersData } = useGetUsersQuery({ role: 'worker' });
  const { data: buildingsData } = useGetBuildingsQuery();

  // Mutations
  const [approveTimeSession, { isLoading: isApproving }] = useApproveTimeSessionMutation();
  const [deleteTimeSession, { isLoading: isDeleting }] = useDeleteTimeSessionMutation();

  const workers = usersData?.data?.users || [];
  const buildings = buildingsData?.data?.buildings || [];
  const sessions = sessionsData?.data?.sessions || [];
  const pendingApprovals = pendingData?.data?.sessions || [];
  const stats = statsData?.data || {};

  // Helper functions
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'In Progress';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    return `${hours}h ${minutes}m`;
  };

  const getWorkerName = (workerRef) => {
    // If populated object
    if (workerRef && typeof workerRef === 'object') {
      return workerRef.name || workerRef.email || 'Unknown Worker';
    }
    // If ID, look up from workers list
    const worker = workers.find(w => w._id === workerRef);
    return worker?.name || worker?.email || 'Unknown Worker';
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b._id === buildingId);
    return building?.name || 'No Building';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'paused': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Event handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApproval = async (sessionId, approved, reason = '') => {
    try {
      await approveTimeSession({
        sessionId,
        approved,
        rejectionReason: reason
      }).unwrap();
      
      toast.success(`Time session ${approved ? 'approved' : 'rejected'} successfully`);
      setApprovalDialog(false);
      setRejectionReason('');
      refetchPending();
      refetchSessions();
    } catch (error) {
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} time session`);
    }
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setDetailsDialog(true);
  };

  const handleDelete = async (sessionId) => {
    try {
      const confirmed = window.confirm('Delete this time session? This action cannot be undone.');
      if (!confirmed) return;
      await deleteTimeSession(sessionId).unwrap();
      toast.success('Time session deleted');
      refetchSessions();
      refetchPending();
    } catch (e) {
      toast.error('Failed to delete time session');
    }
  };

  const exportToCSV = () => {
    const csvData = sessions.map(session => ({
      Worker: getWorkerName(session.worker),
      Building: getBuildingName(session.building),
      'Clock In': format(parseISO(session.clockInTime), 'yyyy-MM-dd HH:mm'),
      'Clock Out': session.clockOutTime ? format(parseISO(session.clockOutTime), 'yyyy-MM-dd HH:mm') : 'In Progress',
      Duration: formatDuration(session.clockInTime, session.clockOutTime),
      Status: session.status,
      'Break Time': `${session.breakTime || 0} min`,
      Notes: session.notes || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracking-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Statistics cards
  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main` }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Time Tracking Management
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                refetchSessions();
                refetchPending();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={exportToCSV}
              disabled={sessions.length === 0}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Sessions"
              value={stats.activeSessions || 0}
              icon={<TimeIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Hours Today"
              value={`${stats.totalHoursToday || 0}h`}
              icon={<StatsIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Approvals"
              value={pendingApprovals.length}
              icon={<TaskIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Workers Clocked In"
              value={stats.workersActive || 0}
              icon={<PersonIcon />}
              color="info"
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Worker</InputLabel>
                  <Select
                    value={filters.workerId}
                    label="Worker"
                    onChange={(e) => handleFilterChange('workerId', e.target.value)}
                  >
                    <MenuItem value="">All Workers</MenuItem>
                    {workers.map((worker) => (
                      <MenuItem key={worker._id} value={worker._id}>
                        {worker.name || worker.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={filters.buildingId}
                    label="Building"
                    onChange={(e) => handleFilterChange('buildingId', e.target.value)}
                  >
                    <MenuItem value="">All Buildings</MenuItem>
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="paused">Paused</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="All Sessions" />
            <Tab 
              label={
                <Badge badgeContent={pendingApprovals.length} color="error">
                  Pending Approvals
                </Badge>
              } 
            />
          </Tabs>
        </Box>

        {/* Content */}
        {selectedTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Time Sessions
              </Typography>
              {sessionsLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Worker</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Clock In</TableCell>
                        <TableCell>Clock Out</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Break Time</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session._id}>
                          <TableCell>{getWorkerName(session.worker)}</TableCell>
                          <TableCell>{getBuildingName(session.building)}</TableCell>
                          <TableCell>
                            {format(parseISO(session.clockInTime), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>
                            {session.clockOutTime 
                              ? format(parseISO(session.clockOutTime), 'MMM dd, HH:mm')
                              : 'In Progress'
                            }
                          </TableCell>
                          <TableCell>
                            {formatDuration(session.clockInTime, session.clockOutTime)}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={session.status} 
                              color={getStatusColor(session.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{session.breakTime || 0} min</TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewDetails(session)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {session.photos && session.photos.length > 0 && (
                              <Tooltip title="Has Photos">
                                <IconButton size="small">
                                  <PhotoIcon color="primary" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {session.notes && (
                              <Tooltip title="Has Notes">
                                <IconButton size="small">
                                  <NotesIcon color="primary" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDelete(session._id)}
                                disabled={isDeleting}
                                sx={{ ml: 1 }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Approvals
              </Typography>
              {pendingLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : pendingApprovals.length === 0 ? (
                <Alert severity="info">No pending approvals</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Worker</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingApprovals.map((session) => (
                        <TableRow key={session._id}>
                          <TableCell>{getWorkerName(session.worker)}</TableCell>
                          <TableCell>{getBuildingName(session.building)}</TableCell>
                          <TableCell>
                            {format(parseISO(session.clockInTime), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {formatDuration(session.clockInTime, session.clockOutTime)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<ApproveIcon />}
                              color="success"
                              onClick={() => handleApproval(session._id, true)}
                              disabled={isApproving}
                              sx={{ mr: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              startIcon={<RejectIcon />}
                              color="error"
                              onClick={() => {
                                setSelectedSession(session);
                                setApprovalDialog(true);
                              }}
                              disabled={isApproving}
                            >
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Session Details Dialog */}
        <Dialog 
          open={detailsDialog} 
          onClose={() => setDetailsDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Time Session Details</DialogTitle>
          <DialogContent>
            {selectedSession && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Worker</Typography>
                  <Typography>{getWorkerName(selectedSession.worker)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Building</Typography>
                  <Typography>{getBuildingName(selectedSession.building)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Clock In Time</Typography>
                  <Typography>
                    {format(parseISO(selectedSession.clockInTime), 'MMM dd, yyyy HH:mm:ss')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Clock Out Time</Typography>
                  <Typography>
                    {selectedSession.clockOutTime 
                      ? format(parseISO(selectedSession.clockOutTime), 'MMM dd, yyyy HH:mm:ss')
                      : 'Still active'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Total Duration</Typography>
                  <Typography>
                    {formatDuration(selectedSession.clockInTime, selectedSession.clockOutTime)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Break Time</Typography>
                  <Typography>{selectedSession.breakTime || 0} minutes</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedSession.status} 
                    color={getStatusColor(selectedSession.status)}
                  />
                </Grid>
                {selectedSession.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Notes</Typography>
                    <Typography>{selectedSession.notes}</Typography>
                  </Grid>
                )}
                {selectedSession.location && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Location</Typography>
                    <Typography>
                      Clock In: {selectedSession.location.clockIn?.latitude}, {selectedSession.location.clockIn?.longitude}
                      {selectedSession.location.clockOut && (
                        <><br />Clock Out: {selectedSession.location.clockOut.latitude}, {selectedSession.location.clockOut.longitude}</>
                      )}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
          <DialogTitle>Reject Time Session</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Rejection Reason"
              fullWidth
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => handleApproval(selectedSession?._id, false, rejectionReason)}
              color="error"
              disabled={!rejectionReason.trim() || isApproving}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TimeTrackingManagement;
