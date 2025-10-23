import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Feedback as FeedbackIcon,
  Photo as PhotoIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useDeleteWorkLogMutation, useAddAdminFeedbackMutation } from '../../features/workLogs/workLogsApiSlice';
import WorkLogForm from './WorkLogForm';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'reviewed': return 'info';
    case 'approved': return 'success';
    case 'needs_revision': return 'error';
    default: return 'default';
  }
};

const WorkLogList = ({ workLogs = [], onRefresh, showAdminActions = false, onFeedback }) => {
  const { user, hasPermission } = useAuth();
  const [deleteWorkLog] = useDeleteWorkLogMutation();
  const [addAdminFeedback] = useAddAdminFeedbackMutation();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('reviewed');

  const handleMenuClick = (event, workLog) => {
    setAnchorEl(event.currentTarget);
    setSelectedLog(workLog);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLog(null);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedLog) return;
    
    if (window.confirm('Are you sure you want to delete this work log?')) {
      try {
        await deleteWorkLog(selectedLog._id).unwrap();
        toast.success('Work log deleted successfully');
        onRefresh?.();
      } catch (error) {
        toast.error('Failed to delete work log');
      }
    }
    handleMenuClose();
  };

  const handleFeedback = () => {
    if (onFeedback && showAdminActions) {
      onFeedback(selectedLog);
      handleMenuClose();
    } else {
      setFeedback(selectedLog?.adminFeedback || '');
      setFeedbackStatus(selectedLog?.status || 'reviewed');
      setFeedbackDialogOpen(true);
      handleMenuClose();
    }
  };

  const submitFeedback = async () => {
    if (!selectedLog) return;
    
    try {
      await addAdminFeedback({
        id: selectedLog._id,
        feedback,
        status: feedbackStatus
      }).unwrap();
      toast.success('Feedback added successfully');
      setFeedbackDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to add feedback');
    }
  };

  if (!workLogs || workLogs.length === 0) {
    return (
      <Alert severity="info">
        No work logs found. Complete some time sessions and create work logs to track your daily progress.
      </Alert>
    );
  }

  return (
    <Box>
      {workLogs.map((workLog) => (
        <Card key={workLog._id} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                {/* Header */}
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <BuildIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {format(new Date(workLog.date), 'MMMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {workLog.building?.name || 'General Work'} • {workLog.worker?.name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={workLog.status?.replace('_', ' ').toUpperCase()} 
                    color={getStatusColor(workLog.status)}
                    size="small"
                  />
                </Box>

                {/* Work Completed */}
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Work Completed:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {workLog.workCompleted}
                  </Typography>
                </Box>

                {/* Issues */}
                {workLog.issues && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Issues Encountered:
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ whiteSpace: 'pre-wrap' }}>
                      {workLog.issues}
                    </Typography>
                  </Box>
                )}

                {/* Materials Used */}
                {workLog.materialsUsed && workLog.materialsUsed.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Materials Used:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {workLog.materialsUsed.map((material, index) => (
                        <Chip
                          key={index}
                          label={`${material.item}: ${material.quantity} ${material.unit}`}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Photos */}
                {workLog.photos && workLog.photos.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Progress Photos:
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PhotoIcon color="primary" />
                      <Typography variant="body2">
                        {workLog.photos.length} photo(s) attached
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Time Session Info */}
                {workLog.timeSession && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">
                      Time Session: {workLog.timeSession.totalHours?.toFixed(1) || 0} hours
                      {workLog.timeSession.clockInTime && (
                        ` • ${format(new Date(workLog.timeSession.clockInTime), 'HH:mm')}`
                      )}
                      {workLog.timeSession.clockOutTime && (
                        ` - ${format(new Date(workLog.timeSession.clockOutTime), 'HH:mm')}`
                      )}
                    </Typography>
                  </Box>
                )}

                {/* Admin Feedback */}
                {workLog.adminFeedback && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Alert severity="info">
                      <Typography variant="subtitle2" gutterBottom>
                        Admin Feedback:
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {workLog.adminFeedback}
                      </Typography>
                      {workLog.adminFeedbackAt && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          By {workLog.adminFeedbackBy?.name} on {format(new Date(workLog.adminFeedbackAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      )}
                    </Alert>
                  </>
                )}
              </Box>

              {/* Actions Menu */}
              <IconButton onClick={(e) => handleMenuClick(e, workLog)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {(selectedLog?.worker?._id === user?.id || hasPermission('update:workLogs')) && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        
        {(hasPermission('manage:workLogs') || showAdminActions) && (
          <MenuItem onClick={handleFeedback}>
            <FeedbackIcon sx={{ mr: 1 }} />
            Add Feedback
          </MenuItem>
        )}
        
        {(selectedLog?.worker?._id === user?.id || hasPermission('delete:workLogs')) && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Edit Dialog */}
      {editDialogOpen && selectedLog && (
        <WorkLogForm
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          timeSession={selectedLog.timeSession}
          workLog={selectedLog}
          isEdit={true}
        />
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Admin Feedback</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={feedbackStatus}
                  onChange={(e) => setFeedbackStatus(e.target.value)}
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
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback on the work completed, quality, or any corrections needed..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button onClick={submitFeedback} variant="contained">
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkLogList;
