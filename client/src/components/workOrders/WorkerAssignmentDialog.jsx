import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useAssignWorkersMutation } from '../../features/workOrders/workOrdersApiSlice';
import { toast } from 'react-toastify';

const WorkerAssignmentDialog = ({ 
  open, 
  onClose, 
  workOrder, 
  onAssignmentComplete 
}) => {
  const { data: workersData, isLoading: loadingWorkers } = useGetWorkersQuery();
  const [assignWorkers, { isLoading: assigning }] = useAssignWorkersMutation();
  
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Extract workers from API response
  const workers = workersData?.data?.workers || workersData?.data || [];
  const activeWorkers = workers.filter(worker => worker.status === 'active');

  // Initialize with existing assignments
  useEffect(() => {
    if (workOrder?.assignedTo) {
      setSelectedWorkers(workOrder.assignedTo.map(assignment => ({
        workerId: assignment.worker._id || assignment.worker,
        workerName: assignment.worker.name || 'Unknown Worker',
        status: assignment.status || 'pending',
        notes: assignment.notes || ''
      })));
    }
  }, [workOrder]);

  const handleWorkerSelect = (workerId) => {
    const worker = activeWorkers.find(w => w._id === workerId);
    if (!worker) return;

    const isAlreadySelected = selectedWorkers.some(sw => sw.workerId === workerId);
    
    if (isAlreadySelected) {
      setSelectedWorkers(prev => prev.filter(sw => sw.workerId !== workerId));
    } else {
      setSelectedWorkers(prev => [...prev, {
        workerId: worker._id,
        workerName: worker.name,
        status: 'pending',
        notes: ''
      }]);
    }
  };

  const handleAssignmentSubmit = async () => {
    if (selectedWorkers.length === 0) {
      toast.error('Please select at least one worker');
      return;
    }

    try {
      const assignmentData = {
        id: workOrder._id,
        workers: selectedWorkers.map(sw => ({
          worker: sw.workerId,
          notes: assignmentNotes,
          status: 'pending'
        })),
        scheduledDate: scheduledDate || null
      };

      await assignWorkers(assignmentData).unwrap();
      toast.success(`Successfully assigned ${selectedWorkers.length} worker(s) to work order`);
      onAssignmentComplete?.();
      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
      toast.error(error?.data?.message || 'Failed to assign workers');
    }
  };

  const getWorkerSkillsChips = (worker) => {
    return worker.skills?.slice(0, 3).map(skill => (
      <Chip
        key={skill}
        label={skill.replace('_', ' ').toUpperCase()}
        size="small"
        variant="outlined"
        sx={{ mr: 0.5, mb: 0.5 }}
      />
    ));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon />
          <Typography variant="h6">
            Assign Workers to Work Order
          </Typography>
        </Box>
        {workOrder && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {workOrder.workType?.toUpperCase()} - {workOrder.workSubType} 
            {workOrder.building?.name && ` at ${workOrder.building.displayName || workOrder.building.name}`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Workers ({selectedWorkers.length})
          </Typography>
          
          {selectedWorkers.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {selectedWorkers.map((sw) => (
                <Chip
                  key={sw.workerId}
                  avatar={<Avatar><PersonIcon /></Avatar>}
                  label={sw.workerName}
                  onDelete={() => handleWorkerSelect(sw.workerId)}
                  color="primary"
                  variant="filled"
                />
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No workers selected. Choose workers from the list below.
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Available Workers
          </Typography>
          
          {loadingWorkers ? (
            <Typography>Loading workers...</Typography>
          ) : (
            <Grid container spacing={2}>
              {activeWorkers.map((worker) => {
                const isSelected = selectedWorkers.some(sw => sw.workerId === worker._id);
                
                return (
                  <Grid item xs={12} sm={6} key={worker._id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleWorkerSelect(worker._id)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ mr: 1, bgcolor: isSelected ? 'primary.main' : 'grey.400' }}>
                            <PersonIcon />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {worker.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {worker.email}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            color={isSelected ? 'primary' : 'default'}
                          >
                            {isSelected ? <RemoveIcon /> : <AddIcon />}
                          </IconButton>
                        </Box>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Skills:
                          </Typography>
                          <Box>
                            {getWorkerSkillsChips(worker)}
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary">
                          Rate: ${worker.hourlyRate || 'N/A'}/hr
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Assignment Notes"
              multiline
              rows={3}
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              placeholder="Add instructions or notes for the assigned workers..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Scheduled Date"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="When should this work be completed?"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAssignmentSubmit}
          disabled={assigning || selectedWorkers.length === 0}
          startIcon={<ScheduleIcon />}
        >
          {assigning ? 'Assigning...' : `Assign ${selectedWorkers.length} Worker(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkerAssignmentDialog;
