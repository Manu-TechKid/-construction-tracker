import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Checkbox,
  ListItemButton,
  Divider,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';

export default function WorkerSelectionDialog({
  open,
  onClose,
  onSave,
  assignedWorkers = [],
  maxAssignments = 5
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [notes, setNotes] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState({});
  
  // Fetch workers with search filter
  const { data: workersData, isLoading } = useGetWorkersQuery(
    { search: searchTerm, status: 'active' },
    { skip: !open } // Skip query when dialog is closed
  );
  
  const workers = workersData?.data?.workers || [];
  
  // Initialize selected workers when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedWorkers(assignedWorkers.map(w => w.worker?._id || w.worker));
      
      // Initialize assignment notes
      const initialNotes = {};
      assignedWorkers.forEach(assignment => {
        if (assignment.worker) {
          initialNotes[assignment.worker._id || assignment.worker] = assignment.notes || '';
        }
      });
      setAssignmentNotes(initialNotes);
    }
  }, [open, assignedWorkers]);

  const handleToggleWorker = (workerId) => {
    setSelectedWorkers(prev => {
      if (prev.includes(workerId)) {
        return prev.filter(id => id !== workerId);
      } else if (prev.length < maxAssignments) {
        return [...prev, workerId];
      }
      return prev;
    });
  };

  const handleNotesChange = (workerId, value) => {
    setAssignmentNotes(prev => ({
      ...prev,
      [workerId]: value
    }));
  };

  const handleSave = () => {
    const assignments = selectedWorkers.map(workerId => ({
      worker: workerId,
      notes: assignmentNotes[workerId] || '',
      status: 'pending',
      assignedAt: new Date().toISOString()
    }));
    
    onSave(assignments);
    onClose();
  };

  const isWorkerSelected = (workerId) => selectedWorkers.includes(workerId);
  const isMaxSelected = selectedWorkers.length >= maxAssignments && selectedWorkers.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <span>Assign Workers</span>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="textSecondary">
          Select up to {maxAssignments} workers to assign to this work order
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search workers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
          sx={{ mb: 2 }}
        />
        
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        ) : workers.length === 0 ? (
          <Box textAlign="center" p={3}>
            <Typography color="textSecondary">
              {searchTerm ? 'No workers found matching your search' : 'No workers available'}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {workers.map((worker) => (
              <React.Fragment key={worker._id}>
                <ListItem
                  secondaryAction={
                    <Box display="flex" alignItems="center">
                      {isWorkerSelected(worker._id) && (
                        <Chip 
                          icon={<CheckCircleIcon fontSize="small" />}
                          label="Assigned"
                          size="small"
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                      )}
                      <Checkbox
                        edge="end"
                        checked={isWorkerSelected(worker._id)}
                        onChange={() => handleToggleWorker(worker._id)}
                        disabled={!isWorkerSelected(worker._id) && isMaxSelected}
                      />
                    </Box>
                  }
                  disablePadding
                >
                  <ListItemButton onClick={() => handleToggleWorker(worker._id)}>
                    <ListItemAvatar>
                      <Avatar>
                        {worker.name ? worker.name.charAt(0).toUpperCase() : <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={worker.name}
                      secondary={
                        <>
                          <Box component="span" display="block">{worker.email}</Box>
                          {worker.skills && worker.skills.length > 0 && (
                            <Box component="span" display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                              {worker.skills.slice(0, 3).map((skill, idx) => (
                                <Chip 
                                  key={idx} 
                                  label={skill} 
                                  size="small" 
                                  variant="outlined"
                                />
                              ))}
                              {worker.skills.length > 3 && (
                                <Tooltip title={worker.skills.slice(3).join(', ')}>
                                  <Chip 
                                    label={`+${worker.skills.length - 3} more`} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                
                {isWorkerSelected(worker._id) && (
                  <Box pl={4} pr={2} pb={2}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      variant="outlined"
                      size="small"
                      placeholder={`Add notes for ${worker.name}...`}
                      value={assignmentNotes[worker._id] || ''}
                      onChange={(e) => handleNotesChange(worker._id, e.target.value)}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                )}
                
                <Divider component="li" sx={{ my: 1 }} />
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={selectedWorkers.length === 0}
        >
          Assign {selectedWorkers.length} {selectedWorkers.length === 1 ? 'Worker' : 'Workers'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
