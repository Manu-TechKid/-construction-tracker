import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery,
  Fab,
  ImageList,
  ImageListItem
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon,
  PhotoCamera as PhotoIcon,
  Notes as NotesIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Business as BuildingIcon,
  Timeline as ProgressIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetPendingApprovalsQuery,
  useApproveTimeSessionMutation,
  useGetTimeSessionsQuery
} from '../../features/timeTracking/timeTrackingApiSlice';

const ProjectsPendingApproval = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, canViewCosts } = useAuth();
  
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    workerId: '',
    buildingId: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(1);
  
  // API hooks
  const { 
    data: pendingData, 
    isLoading: isPendingLoading, 
    refetch: refetchPending 
  } = useGetPendingApprovalsQuery({ page, limit: 10 });
  
  const { 
    data: approvedData, 
    isLoading: isApprovedLoading 
  } = useGetTimeSessionsQuery({ 
    isApproved: true, 
    page, 
    limit: 10,
    ...filters 
  });
  
  const [approveTimeSession, { isLoading: isApproving }] = useApproveTimeSessionMutation();
  
  const pendingSessions = pendingData?.data?.sessions || [];
  const approvedSessions = approvedData?.data?.sessions || [];
  
  // Handle approval
  const handleApprove = async (sessionId, approved) => {
    try {
      await approveTimeSession({
        sessionId,
        approved,
        rejectionReason: approved ? '' : rejectionReason
      }).unwrap();
      
      toast.success(approved ? 'Time session approved!' : 'Time session rejected!');
      setApprovalDialog(false);
      setRejectionReason('');
      setSelectedSession(null);
      refetchPending();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to process approval');
    }
  };

  // Format duration
  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Calculate total cost (only for admins/managers)
  const calculateCost = (session) => {
    if (!canViewCosts() || !session.worker?.workerProfile?.hourlyRate) {
      return null;
    }
    const rate = session.worker.workerProfile.hourlyRate;
    const cost = session.totalHours * rate;
    return cost.toFixed(2);
  };

  // Session Card Component
  const SessionCard = ({ session, showActions = true }) => {
    const cost = calculateCost(session);
    
    return (
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Worker Info */}
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {session.worker?.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {session.worker?.email}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Time Info */}
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <TimeIcon color="action" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body1">
                    {formatDuration(session.totalHours)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {format(new Date(session.clockInTime), 'MMM d, yyyy HH:mm')} - 
                    {session.clockOutTime && format(new Date(session.clockOutTime), 'HH:mm')}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Work Order Info */}
            {session.workOrder && (
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" mb={1}>
                  <WorkIcon color="action" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="body1">
                      {session.workOrder.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Work Order
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            
            {/* Building Info */}
            {session.building && (
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" mb={1}>
                  <BuildingIcon color="action" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="body1">
                      {session.building.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {session.building.address}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            
            {/* Cost Info (Admin/Manager only) */}
            {cost && (
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h6" color="primary">
                    ${cost}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                    Total Cost
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {/* Status Chips */}
            <Grid item xs={12}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip 
                  label={session.status} 
                  color={session.status === 'completed' ? 'success' : 'default'}
                  size="small"
                />
                {session.breakTime > 0 && (
                  <Chip 
                    label={`${Math.round(session.breakTime)}m break`}
                    color="warning"
                    size="small"
                  />
                )}
                {session.photos?.length > 0 && (
                  <Chip 
                    icon={<PhotoIcon />}
                    label={`${session.photos.length} photos`}
                    size="small"
                  />
                )}
                {session.progressUpdates?.length > 0 && (
                  <Chip 
                    icon={<ProgressIcon />}
                    label={`${session.progressUpdates.length} updates`}
                    size="small"
                  />
                )}
              </Box>
            </Grid>
            
            {/* Notes */}
            {session.notes && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  <NotesIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {session.notes}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
        
        {showActions && (
          <CardActions>
            <Button
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => {
                setSelectedSession(session);
                setDetailsDialog(true);
              }}
            >
              View Details
            </Button>
            {selectedTab === 0 && (
              <>
                <Button
                  size="small"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleApprove(session._id, true)}
                  disabled={isApproving}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => {
                    setSelectedSession(session);
                    setApprovalDialog(true);
                  }}
                  disabled={isApproving}
                >
                  Reject
                </Button>
              </>
            )}
          </CardActions>
        )}
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Projects Pending Approval
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            refetchPending();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab 
            label={
              <Badge badgeContent={pendingSessions.length} color="error">
                Pending Approval
              </Badge>
            } 
          />
          <Tab label="Approved Sessions" />
          <Tab label="Statistics" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Box>
          {isPendingLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : pendingSessions.length === 0 ? (
            <Alert severity="info">
              No time sessions pending approval.
            </Alert>
          ) : (
            pendingSessions.map((session) => (
              <SessionCard key={session._id} session={session} />
            ))
          )}
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          {isApprovedLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : approvedSessions.length === 0 ? (
            <Alert severity="info">
              No approved sessions found.
            </Alert>
          ) : (
            approvedSessions.map((session) => (
              <SessionCard key={session._id} session={session} showActions={false} />
            ))
          )}
        </Box>
      )}

      {selectedTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error">
                    {pendingSessions.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Approval
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {approvedSessions.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Approved Today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {canViewCosts() && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        ${pendingSessions.reduce((total, session) => {
                          const cost = calculateCost(session);
                          return total + (cost ? parseFloat(cost) : 0);
                        }, 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Pending Cost
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        ${approvedSessions.reduce((total, session) => {
                          const cost = calculateCost(session);
                          return total + (cost ? parseFloat(cost) : 0);
                        }, 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Approved Cost
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      )}

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Time Session Details
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box>
              {/* Basic Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Worker</Typography>
                  <Typography variant="body1">{selectedSession.worker?.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
                  <Typography variant="body1">{formatDuration(selectedSession.totalHours)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Clock In</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedSession.clockInTime), 'MMM d, yyyy HH:mm:ss')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Clock Out</Typography>
                  <Typography variant="body1">
                    {selectedSession.clockOutTime ? 
                      format(new Date(selectedSession.clockOutTime), 'MMM d, yyyy HH:mm:ss') : 
                      'Still active'
                    }
                  </Typography>
                </Grid>
              </Grid>

              {/* Location Info */}
              {selectedSession.location && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Location Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Clock In Location</Typography>
                      <Typography variant="body2">
                        Lat: {selectedSession.location.clockIn?.latitude?.toFixed(6)}<br/>
                        Lng: {selectedSession.location.clockIn?.longitude?.toFixed(6)}<br/>
                        Accuracy: {selectedSession.location.clockIn?.accuracy}m
                      </Typography>
                    </Grid>
                    {selectedSession.location.clockOut && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="textSecondary">Clock Out Location</Typography>
                        <Typography variant="body2">
                          Lat: {selectedSession.location.clockOut?.latitude?.toFixed(6)}<br/>
                          Lng: {selectedSession.location.clockOut?.longitude?.toFixed(6)}<br/>
                          Accuracy: {selectedSession.location.clockOut?.accuracy}m
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Photos */}
              {selectedSession.photos && selectedSession.photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Photos</Typography>
                  <ImageList cols={isMobile ? 2 : 4} gap={8}>
                    {selectedSession.photos.map((photo, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={photo.url}
                          alt={photo.description || `Photo ${index + 1}`}
                          loading="lazy"
                          style={{ height: 120, objectFit: 'cover' }}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}

              {/* Progress Updates */}
              {selectedSession.progressUpdates && selectedSession.progressUpdates.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Progress Updates</Typography>
                  <List>
                    {selectedSession.progressUpdates.map((update, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={`${update.progress}% - ${update.notes}`}
                          secondary={format(new Date(update.timestamp), 'MMM d, yyyy HH:mm')}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Notes */}
              {selectedSession.notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Notes</Typography>
                  <Typography variant="body1">{selectedSession.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
          {selectedSession && selectedTab === 0 && (
            <>
              <Button
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => {
                  setDetailsDialog(false);
                  handleApprove(selectedSession._id, true);
                }}
                disabled={isApproving}
              >
                Approve
              </Button>
              <Button
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  setDetailsDialog(false);
                  setApprovalDialog(true);
                }}
                disabled={isApproving}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Reject Time Session</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => handleApprove(selectedSession?._id, false)}
            disabled={isApproving || !rejectionReason.trim()}
          >
            Reject Session
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectsPendingApproval;
