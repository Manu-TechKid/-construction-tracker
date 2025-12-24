import React, { useState, useEffect } from 'react';
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
  Badge
} from '@mui/material';
import {
  Schedule as TimeIcon,
  Person as PersonIcon,
  Assignment as TaskIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Delete as DeleteIcon,
  Assessment as StatsIcon,
  PhotoCamera as PhotoIcon,
  Notes as NotesIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { toast } from 'react-toastify';
import WeeklyHoursReport from '../../components/timeTracking/WeeklyHoursReport';
import PaymentReport from '../../components/timeTracking/PaymentReport';
import {
  useGetTimeSessionsQuery,
  useGetPendingApprovalsQuery,
  useApproveTimeSessionMutation,
  useDeleteTimeSessionMutation,
  useGetTimeStatsQuery
} from '../../features/timeTracking/timeTrackingApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const TimeTrackingManagement = () => {
  
  // State
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState({
    workerId: '',
    buildingId: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [autoRefresh] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionDialog, setCorrectionDialog] = useState(false);
  const [correctedHours, setCorrectedHours] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [hourlyRateDialog, setHourlyRateDialog] = useState(false);
  const [workerRates, setWorkerRates] = useState([]);
  
  // API calls
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useGetTimeSessionsQuery(filters);
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useGetPendingApprovalsQuery();
  const { data: statsData } = useGetTimeStatsQuery(filters);
  const { data: usersData } = useGetUsersQuery({ role: 'worker' });
  const { data: buildingsData } = useGetBuildingsQuery();
  
  const [approveTimeSession, { isLoading: isApproving }] = useApproveTimeSessionMutation();
  const [deleteTimeSession, { isLoading: isDeleting }] = useDeleteTimeSessionMutation();
  
  const sessions = sessionsData?.data?.sessions || [];
  const pendingApprovals = pendingData?.data?.sessions || [];
  const stats = statsData?.data?.stats || {};
  const workers = usersData?.data?.users || [];
  const buildings = buildingsData?.data?.buildings || [];

  // Auto-refresh effect for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchSessions();
      refetchPending();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refetchSessions, refetchPending]);

  // Helper functions
  const formatDuration = (startTime, endTime, correctedHours = null) => {
    if (!startTime || !endTime) return 'In Progress';
    
    // If corrected hours exist, use them instead of calculated duration
    if (correctedHours !== null && correctedHours !== undefined) {
      const hours = Math.floor(correctedHours);
      const minutes = Math.round((correctedHours - hours) * 60);
      return `${hours}h ${minutes}m (Corrected)`;
    }
    
    // Otherwise calculate from clock in/out times
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

  const getBuildingName = (building) => {
    // Handle both populated building object and building ID
    if (typeof building === 'object' && building?.name) {
      return building.name;
    }
    if (typeof building === 'string') {
      const buildingObj = buildings.find(b => b._id === building);
      return buildingObj?.name || 'No Building';
    }
    return 'No Building';
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

  const handleCorrectHours = (session) => {
    setSelectedSession(session);
    setCorrectedHours(session.correctedHours || session.totalHours || '');
    setCorrectionReason(session.correctionReason || '');
    setCorrectionDialog(true);
  };

  const handleConfirmCorrection = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1';
      const response = await fetch(`${apiUrl}/time-tracking/sessions/${selectedSession._id}/correct-hours`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          correctedHours: parseFloat(correctedHours),
          correctionReason: correctionReason.trim(),
          hourlyRate: selectedSession.hourlyRate || 0
        })
      });

      if (response.ok) {
        toast.success('Hours corrected successfully');
        setCorrectionDialog(false);
        setCorrectedHours('');
        setCorrectionReason('');
        refetchSessions();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to correct hours');
      }
    } catch (error) {
      toast.error('Failed to correct hours');
    }
  };

  const handleSetHourlyRates = () => {
    // Initialize worker rates from current workers
    const initialRates = workers.map(worker => ({
      workerId: worker._id,
      workerName: worker.name || worker.email,
      hourlyRate: worker.workerProfile?.hourlyRate || 0
    }));
    setWorkerRates(initialRates);
    setHourlyRateDialog(true);
  };

  const handleSaveHourlyRates = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1';
      const response = await fetch(`${apiUrl}/time-tracking/hourly-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          workerRates: workerRates.map(({ workerId, hourlyRate }) => ({ workerId, hourlyRate }))
        })
      });

      if (response.ok) {
        toast.success('Hourly rates updated successfully');
        setHourlyRateDialog(false);
        refetchSessions();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update hourly rates');
      }
    } catch (error) {
      toast.error('Failed to update hourly rates');
    }
  };

  const handleViewPaymentReport = () => {
    setSelectedTab(3); // Navigate to Payment Report tab
    toast.info('Switched to Payment Report tab');
  };

  const exportToCSV = () => {
    const csvData = sessions.map(session => ({
      Worker: getWorkerName(session.worker),
      Building: getBuildingName(session.building),
      'Clock In': format(parseISO(session.clockInTime), 'yyyy-MM-dd HH:mm'),
      'Clock Out': session.clockOutTime ? format(parseISO(session.clockOutTime), 'yyyy-MM-dd HH:mm') : 'In Progress',
      Duration: formatDuration(session.clockInTime, session.clockOutTime, session.correctedHours),
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
          <Box display="flex" gap={2} flexWrap="wrap">
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
              variant="outlined"
              startIcon={<MoneyIcon />}
              onClick={handleSetHourlyRates}
              color="primary"
            >
              Set Hourly Rates
            </Button>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              onClick={handleViewPaymentReport}
              color="secondary"
            >
              Payment Report
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
                <Badge badgeContent={pendingData?.results || 0} color="error">
                  Pending Approvals
                </Badge>
              } 
            />
            <Tab label="Weekly Hours" />
            <Tab label="Payment Report" />
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
                        <TableCell>Apartment</TableCell>
                        <TableCell>Work Type</TableCell>
                        <TableCell>Clock In</TableCell>
                        <TableCell>Clock Out</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Hourly Rate</TableCell>
                        <TableCell>Payment</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session._id}>
                          <TableCell>{getWorkerName(session.worker)}</TableCell>
                          <TableCell>{getBuildingName(session.building)}</TableCell>
                          <TableCell>
                            {session.apartmentNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {session.workType || 'General'}
                          </TableCell>
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
                            <Box>
                              {formatDuration(session.clockInTime, session.clockOutTime, session.correctedHours)}
                              {session.correctedHours && (
                                <Chip 
                                  label="Corrected" 
                                  size="small" 
                                  color="warning" 
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            ${session.hourlyRate || 0}/hr
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              ${session.calculatedPay?.toFixed(2) || '0.00'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={session.status} 
                              color={getStatusColor(session.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleViewDetails(session)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Correct Hours">
                                <IconButton 
                                  size="small" 
                                  color="warning"
                                  onClick={() => handleCorrectHours(session)}
                                  disabled={session.status === 'active'}
                                >
                                  <TimeIcon />
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
                              {session.correctedHours && (
                                <Tooltip title={`Hours corrected: ${session.correctionReason}`}>
                                  <IconButton size="small">
                                    <MoneyIcon color="warning" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Delete">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDelete(session._id)}
                                  disabled={isDeleting}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
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
                            {formatDuration(session.clockInTime, session.clockOutTime, session.correctedHours)}
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

        {selectedTab === 2 && (
          <WeeklyHoursReport />
        )}

        {selectedTab === 3 && (
          <PaymentReport />
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
                    {formatDuration(selectedSession.clockInTime, selectedSession.clockOutTime, selectedSession.correctedHours)}
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

        {/* Hour Correction Dialog */}
        <Dialog open={correctionDialog} onClose={() => setCorrectionDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Correct Hours for {selectedSession && getWorkerName(selectedSession.worker)}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Original Hours: {selectedSession?.totalHours || 0}h
                    {selectedSession?.correctedHours && (
                      <><br />Previously Corrected: {selectedSession.correctedHours}h</>
                    )}
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    autoFocus
                    label="Corrected Hours"
                    type="number"
                    fullWidth
                    value={correctedHours}
                    onChange={(e) => setCorrectedHours(e.target.value)}
                    inputProps={{ min: 0, max: 24, step: 0.25 }}
                    helperText="Enter the correct number of hours (0-24)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Correction Reason"
                    fullWidth
                    multiline
                    rows={3}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Explain why the hours are being corrected..."
                    helperText="Required: Minimum 5 characters"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCorrectionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleConfirmCorrection}
              variant="contained"
              color="warning"
              disabled={!correctedHours || !correctionReason.trim() || correctionReason.trim().length < 5}
            >
              Correct Hours
            </Button>
          </DialogActions>
        </Dialog>

        {/* Hourly Rates Dialog */}
        <Dialog open={hourlyRateDialog} onClose={() => setHourlyRateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Set Hourly Rates for Workers</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Set the hourly rate for each worker. This will be used to calculate payments for future time sessions.
              </Alert>
              <Grid container spacing={2}>
                {workerRates.map((worker, index) => (
                  <Grid item xs={12} sm={6} key={worker.workerId}>
                    <TextField
                      label={worker.workerName}
                      type="number"
                      fullWidth
                      value={worker.hourlyRate}
                      onChange={(e) => {
                        const newRates = [...workerRates];
                        newRates[index].hourlyRate = parseFloat(e.target.value) || 0;
                        setWorkerRates(newRates);
                      }}
                      inputProps={{ min: 0, step: 0.25 }}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                      }}
                      helperText="Per hour rate"
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHourlyRateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveHourlyRates}
              variant="contained"
              color="primary"
            >
              Save Rates
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TimeTrackingManagement;
