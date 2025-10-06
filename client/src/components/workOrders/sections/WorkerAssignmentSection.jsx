import React from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { workerStatusOptions } from '../utils/validationSchema';

const WorkerAssignmentSection = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  workers = []
}) => {
  const handleWorkerAssignment = (index, field, value) => {
    const updatedWorkers = [...values.assignedTo];
    updatedWorkers[index] = { ...updatedWorkers[index], [field]: value };
    setFieldValue('assignedTo', updatedWorkers);
  };

  const addWorkerAssignment = () => {
    setFieldValue('assignedTo', [
      ...values.assignedTo,
      { worker: '', status: 'pending', notes: '', timeSpent: { hours: 0, minutes: 0 }, materials: [] }
    ]);
  };

  const removeWorkerAssignment = (index) => {
    const updatedWorkers = [...values.assignedTo];
    updatedWorkers.splice(index, 1);
    setFieldValue('assignedTo', updatedWorkers);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Assigned Workers
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {values.assignedTo.map((assignment, index) => (
        <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Worker *</InputLabel>
                <Select
                  value={assignment.worker || ''}
                  onChange={(e) => handleWorkerAssignment(index, 'worker', e.target.value)}
                  label="Worker *"
                >
                  {workers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {worker.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={assignment.status || 'pending'}
                  onChange={(e) => handleWorkerAssignment(index, 'status', e.target.value)}
                  label="Status"
                >
                  {workerStatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Notes"
                value={assignment.notes || ''}
                onChange={(e) => handleWorkerAssignment(index, 'notes', e.target.value)}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton 
                onClick={() => removeWorkerAssignment(index)}
                color="error"
                aria-label="remove worker"
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}
      
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={addWorkerAssignment}
        sx={{ mt: 1 }}
      >
        Add Worker
      </Button>
    </Box>
  );
};

export default WorkerAssignmentSection;
