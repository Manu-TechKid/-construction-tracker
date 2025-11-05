import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Note as NoteIcon,
  Business as BuildingIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  useGetNotesQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation
} from '../../features/notes/notesApiSlice';
import { toast } from 'react-toastify';

const NotesSheet = () => {
  const { selectedBuilding, buildings } = useBuildingContext();
  const { hasPermission } = useAuth();
  const [notes, setNotes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterWeek, setFilterWeek] = useState(null);
  const [showProcessed, setShowProcessed] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'visit',
    building: '',
    visitDate: new Date(),
    estimateAmount: '',
    priority: 'medium',
    workers: [],
  });

  const noteTypes = [
    { value: 'visit', label: 'Building Visit', color: 'primary' },
    { value: 'estimate', label: 'Estimate', color: 'success' },
    { value: 'inspection', label: 'Inspection', color: 'warning' },
    { value: 'meeting', label: 'Meeting', color: 'info' },
    { value: 'general', label: 'General Note', color: 'default' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
  ];

  const { data: notesData, isLoading, isError, refetch } = useGetNotesQuery({
    building: selectedBuilding?._id
  });
  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();
  const [updateNote, { isLoading: isUpdating }] = useUpdateNoteMutation();
  const [deleteNote, { isLoading: isDeleting }] = useDeleteNoteMutation();

  useEffect(() => {
    console.log('Notes Debug: Raw API response:', notesData);
    if (notesData) {
      // Handle both array and object response structures
      let notesArray = [];
      if (Array.isArray(notesData)) {
        notesArray = notesData;
      } else if (notesData.data?.notes) {
        notesArray = notesData.data.notes;
      } else if (notesData.notes) {
        notesArray = notesData.notes;
      } else if (notesData.data && Array.isArray(notesData.data)) {
        notesArray = notesData.data;
      }
      
      console.log('Notes Debug: Extracted notes array:', notesArray);
      setNotes(notesArray);
    }
  }, [notesData]);

  // Filter notes by building, week, and processed status
  const filteredNotes = (notes || []).filter(note => {
    // Filter by building if selected
    if (filterBuilding && note.building !== filterBuilding) {
      return false;
    }
    
    // Filter by week if selected
    if (filterWeek) {
      const noteWeekStart = note.weekStart ? new Date(note.weekStart) : null;
      if (!noteWeekStart || noteWeekStart.getTime() !== filterWeek.getTime()) {
        return false;
      }
    }
    
    // Filter by processed status
    if (!showProcessed && note.processedToWorkOrder) {
      return false;
    }
    
    return true;
  });

  const handleOpenDialog = (note = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        ...note,
        visitDate: new Date(note.visitDate),
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        type: 'visit',
        building: selectedBuilding?._id || '',
        visitDate: new Date(),
        estimateAmount: '',
        priority: 'medium',
        workers: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      type: 'visit',
      building: '',
      visitDate: new Date(),
      estimateAmount: '',
      priority: 'medium',
      workers: [],
    });
  };

  const handleSaveNote = async () => {
    if (!formData.content.trim()) {
      toast.error('Please enter a note');
      return;
    }

    if (!formData.building) {
      toast.error('Please select a building');
      return;
    }

    try {
      const noteData = {
        title: formData.title.trim() || formData.content.trim().substring(0, 50) + (formData.content.trim().length > 50 ? '...' : ''), // Use title if provided, otherwise generate from content
        content: formData.content.trim(),
        building: formData.building,
        type: formData.type === 'visit' ? 'visit' : formData.type || 'general', // Ensure 'visit' is handled
        priority: formData.priority || 'medium',
        status: 'active',
        visitDate: formData.visitDate,
        workers: formData.workers || [],
        estimateAmount: formData.estimateAmount || null
      };

      console.log('Saving note with data:', noteData);

      if (editingNote) {
        await updateNote({ id: editingNote._id || editingNote.id, ...noteData }).unwrap();
        toast.success('Note updated successfully');
      } else {
        const result = await createNote(noteData).unwrap();
        console.log('Note created successfully:', result);
        // Add the new note to the local state immediately
        if (result?.data?.note) {
          setNotes(prevNotes => [result.data.note, ...prevNotes]);
        }
      }
      handleCloseDialog();
      // Force refetch to ensure UI is updated
      if (refetch) {
        refetch();
      }
      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error(error?.data?.message || 'Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(noteId);
        toast.success('Note deleted successfully');
      } catch (error) {
        console.error('Error deleting note:', error);
        toast.error('Failed to delete note');
      }
    }
  };

  const handleMarkAsProcessed = async (noteId) => {
    try {
      await updateNote({ 
        id: noteId, 
        processedToWorkOrder: true,
        status: 'processed'
      }).unwrap();
      toast.success('Note marked as processed');
      refetch();
    } catch (error) {
      console.error('Error marking note as processed:', error);
      toast.error('Failed to mark note as processed');
    }
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b._id === buildingId);
    return building?.name || 'Unknown Building';
  };

  const getTypeConfig = (type) => {
    return noteTypes.find(t => t.value === type) || noteTypes[0];
  };

  const getPriorityConfig = (priority) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  if (!hasPermission(['create:notes', 'read:notes'])) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          You don't have permission to access notes
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Failed to load notes</Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NoteIcon color="primary" />
            <Typography variant="h4" component="h1">
              Notes Sheet
            </Typography>
            {selectedBuilding && (
              <Chip
                icon={<BuildingIcon />}
                label={selectedBuilding.name}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          
          {hasPermission(['create:notes']) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={!selectedBuilding}
            >
              Add Note
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Building</InputLabel>
                  <Select
                    value={filterBuilding}
                    label="Filter by Building"
                    onChange={(e) => setFilterBuilding(e.target.value)}
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
              <Grid item xs={12} sm={4}>
                <DateTimePicker
                  label="Filter by Week Start"
                  value={filterWeek}
                  onChange={(newValue) => setFilterWeek(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  views={['year', 'month', 'day']}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl component="fieldset">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Show Processed:</Typography>
                    <Button
                      size="small"
                      variant={showProcessed ? 'contained' : 'outlined'}
                      onClick={() => setShowProcessed(!showProcessed)}
                    >
                      {showProcessed ? 'Yes' : 'No'}
                    </Button>
                  </Box>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {!selectedBuilding && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <BuildingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select a Building
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a building from the selector above to view and create notes for that building.
              </Typography>
            </CardContent>
          </Card>
        )}

        {filteredNotes.length === 0 && selectedBuilding ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <NoteIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Notes Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start documenting your visits, estimates, and inspections for {selectedBuilding.name}.
              </Typography>
              {hasPermission(['create:notes']) && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Create First Note
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredNotes.map((note) => {
              const typeConfig = getTypeConfig(note.type);
              const priorityConfig = getPriorityConfig(note.priority);
              
              return (
                <Grid item xs={12} md={6} lg={4} key={note.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" gutterBottom noWrap sx={{ flexGrow: 1 }}>
                          {note.title}
                        </Typography>
                        {note.processedToWorkOrder && (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Processed"
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <BuildingIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {getBuildingName(note.building)}
                        </Typography>
                      </Box>
                      
                      {note.workers && note.workers.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Workers:</strong> {note.workers.join(', ')}
                        </Typography>
                      )}
                      
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {note.content}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={typeConfig.label}
                            color={typeConfig.color}
                            size="small"
                          />
                          <Chip
                            label={priorityConfig.label}
                            color={priorityConfig.color}
                            size="small"
                          />
                        </Box>
                        
                        {hasPermission(['update:notes', 'delete:notes']) && (
                          <Box>
                            {!note.processedToWorkOrder && (
                              <IconButton
                                size="small"
                                onClick={() => handleMarkAsProcessed(note._id)}
                                disabled={isUpdating}
                                color="success"
                                title="Mark as Processed to Work Order"
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(note)}
                              disabled={isUpdating}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteNote(note._id)}
                              disabled={isDeleting}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                        {(() => {
                          try {
                            const date = note.createdAt || note.visitDate;
                            if (!date) return 'No date';
                            
                            const parsedDate = new Date(date);
                            if (isNaN(parsedDate.getTime())) return 'Invalid date';
                            
                            return format(parsedDate, 'MMM dd, yyyy HH:mm');
                          } catch (error) {
                            console.error('Date formatting error:', error, 'Date value:', note.createdAt || note.visitDate);
                            return 'Invalid date';
                          }
                        })()}
                      </Typography>
                      
                      {note.estimateAmount && (
                        <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>
                          Estimate: ${parseFloat(note.estimateAmount).toLocaleString()}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Add Note FAB for mobile */}
        {hasPermission(['create:notes']) && selectedBuilding && (
          <Fab
            color="primary"
            aria-label="add note"
            onClick={() => handleOpenDialog()}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', md: 'none' },
            }}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Add/Edit Note Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingNote ? 'Edit Note' : 'Add New Note'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Visit to check plumbing issues"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Note Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Note Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {noteTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {priorities.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={formData.building}
                    label="Building"
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Visit Date & Time"
                  value={formData.visitDate}
                  onChange={(newValue) => setFormData({ ...formData, visitDate: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  disablePast={false}
                  disableFuture={false}
                  minDate={null}
                  maxDate={null}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Workers (comma-separated)"
                  value={formData.workers.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    workers: e.target.value.split(',').map(w => w.trim()).filter(w => w) 
                  })}
                  placeholder="e.g., John Doe, Jane Smith"
                  helperText="Enter worker names separated by commas"
                />
              </Grid>
              
              {formData.type === 'estimate' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estimate Amount ($)"
                    type="number"
                    value={formData.estimateAmount}
                    onChange={(e) => setFormData({ ...formData, estimateAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Describe what you observed, what needs to be done, materials needed, etc..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNote} 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={isCreating || isUpdating}
            >
              {editingNote ? 'Update' : 'Save'} Note
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default NotesSheet;
