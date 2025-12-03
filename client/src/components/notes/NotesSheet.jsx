import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfWeek, endOfWeek, isWithinInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
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
  const [filterWeekDate, setFilterWeekDate] = useState(new Date());
  const [filterDay, setFilterDay] = useState(null);
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
    workersText: '',
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

  // Fetch all notes and let the client-side filters handle display
  const { data: notesData, isLoading, isError, refetch } = useGetNotesQuery();
  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();
  const [updateNote, { isLoading: isUpdating }] = useUpdateNoteMutation();
  const [deleteNote, { isLoading: isDeleting }] = useDeleteNoteMutation();

  useEffect(() => {
    console.log('Notes Debug: Raw API response:', notesData);
    if (notesData) {
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

  useEffect(() => {
    // Sync filter with globally selected building for consistency
    if (selectedBuilding?._id) {
      setFilterBuilding(selectedBuilding._id);
    } else {
      setFilterBuilding('');
    }
  }, [selectedBuilding?._id]);

  const currentWeekRange = useMemo(() => {
    const start = startOfWeek(filterWeekDate, { weekStartsOn: 1 });
    start.setHours(0, 0, 0, 0);
    const end = endOfWeek(filterWeekDate, { weekStartsOn: 1 });
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [filterWeekDate]);

  const weekLabel = useMemo(() => {
    return `${format(currentWeekRange.start, 'MMM dd')} - ${format(currentWeekRange.end, 'MMM dd, yyyy')}`;
  }, [currentWeekRange]);

  const filteredNotes = useMemo(() => {
    const hideProcessed = !showProcessed && !filterBuilding && !selectedBuilding;

    return (notes || []).filter((note) => {
      const buildingId = typeof note.building === 'object' ? note.building?._id : note.building;

      if (filterBuilding && buildingId !== filterBuilding) {
        return false;
      }

      const visitDate = note.visitDate ? new Date(note.visitDate) : null;
      if (visitDate && !isWithinInterval(visitDate, { start: currentWeekRange.start, end: currentWeekRange.end })) {
        return false;
      }

      if (filterDay && visitDate && !isSameDay(visitDate, filterDay)) {
        return false;
      }

      if (hideProcessed && (note.processedToWorkOrder || note.status === 'processed')) {
        return false;
      }

      return true;
    });
  }, [notes, filterBuilding, currentWeekRange, filterDay, showProcessed, selectedBuilding]);

  const buildingOptions = useMemo(() => {
    if (buildings.length) {
      return buildings;
    }
    // Fallback to any buildings present in the notes payload
    const map = new Map();
    notes.forEach((note) => {
      if (note.building && typeof note.building === 'object') {
        map.set(note.building._id, note.building);
      }
    });
    return Array.from(map.values());
  }, [buildings, notes]);

  const groupedNotes = useMemo(() => {
    const groups = new Map();

    filteredNotes.forEach((note) => {
      const buildingData = typeof note.building === 'object' ? note.building : null;
      const buildingId = buildingData?._id || note.building || 'unknown';

      if (!groups.has(buildingId)) {
        let name = 'Unknown Building';
        if (buildingData?.name) {
          name = buildingData.name;
        } else {
          const option = buildingOptions.find((b) => b._id === buildingId);
          if (option?.name) {
            name = option.name;
          }
        }

        groups.set(buildingId, { name, notes: [] });
      }

      groups.get(buildingId).notes.push(note);
    });

    return Array.from(groups.entries())
      .map(([buildingId, value]) => ({ buildingId, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredNotes, buildingOptions]);

  const shouldGroupByBuilding = !filterBuilding && !selectedBuilding;

  const handleWeekNavigation = (direction) => {
    setFilterDay(null);
    setFilterWeekDate((prev) => {
      const newDate = direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return new Date(newDate);
    });
  };

  const handleOpenDialog = (note = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        ...note,
        visitDate: note.visitDate ? new Date(note.visitDate) : new Date(),
        building: typeof note.building === 'object' ? note.building?._id : note.building || '',
        workers: note.workers || [],
        workersText: (note.workers || []).join(', '),
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
        workersText: '',
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
      workersText: '',
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
      const workersArray = formData.workersText
        ? formData.workersText
            .split(',')
            .map((worker) => worker.trim())
            .filter((worker) => worker.length > 0)
        : [];

      const noteData = {
        title: formData.title.trim() || formData.content.trim().substring(0, 50) + (formData.content.trim().length > 50 ? '...' : ''), // Use title if provided, otherwise generate from content
        content: formData.content.trim(),
        building: formData.building,
        type: formData.type === 'visit' ? 'visit' : formData.type || 'general', // Ensure 'visit' is handled
        priority: formData.priority || 'medium',
        status: 'active',
        visitDate: formData.visitDate,
        workers: workersArray,
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

  const getBuildingName = (note) => {
    if (note.building && typeof note.building === 'object') {
      return note.building.name || 'Unknown Building';
    }
    const building = buildingOptions.find((b) => b._id === note.building);
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
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Building</InputLabel>
                  <Select
                    value={filterBuilding}
                    label="Filter by Building"
                    onChange={(e) => setFilterBuilding(e.target.value)}
                  >
                    <MenuItem value="">All Buildings</MenuItem>
                    {buildingOptions.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    Week of
                  </Typography>
                  <IconButton size="small" onClick={() => handleWeekNavigation('prev')}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {weekLabel}
                  </Typography>
                  <IconButton size="small" onClick={() => handleWeekNavigation('next')}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                  <DatePicker
                    label="Jump to Week"
                    value={filterWeekDate}
                    onChange={(newValue) => {
                      if (newValue) {
                        setFilterDay(null);
                        setFilterWeekDate(newValue);
                      }
                    }}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 180 }
                      }
                    }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <DatePicker
                    label="Filter by Day"
                    value={filterDay}
                    onChange={(newValue) => setFilterDay(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      }
                    }}
                  />
                  {filterDay && (
                    <Button size="small" onClick={() => setFilterDay(null)}>
                      Clear Day
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant={showProcessed ? 'contained' : 'outlined'}
                    onClick={() => setShowProcessed(!showProcessed)}
                  >
                    {showProcessed ? 'Hide Processed' : 'Show Processed'}
                  </Button>
                </Box>
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

        {filteredNotes.length === 0 && (selectedBuilding || filterBuilding) ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <NoteIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Notes Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start documenting your visits, estimates, and inspections for this building.
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
          <>
            {groupedNotes.map((group) => (
              <Box key={group.buildingId} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <BuildingIcon color="primary" fontSize="small" />
                  <Typography variant="h6" component="h2">
                    {group.name}
                  </Typography>
                  <Chip label={`${group.notes.length} note${group.notes.length === 1 ? '' : 's'}`} size="small" />
                </Box>

                <Grid container spacing={3}>
                  {group.notes.map((note) => {
                    const typeConfig = getTypeConfig(note.type);
                    const priorityConfig = getPriorityConfig(note.priority);
                    const scheduledDate = note.visitDate ? new Date(note.visitDate) : null;
                    const createdDate = note.createdAt ? new Date(note.createdAt) : null;

                    return (
                      <Grid item xs={12} md={6} lg={4} key={note._id || note.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="h6" gutterBottom noWrap sx={{ flexGrow: 1 }}>
                                {note.title}
                              </Typography>
                              <Chip
                                icon={note.processedToWorkOrder || note.status === 'processed' ? <CheckCircleIcon /> : undefined}
                                label={note.processedToWorkOrder || note.status === 'processed' ? 'Processed' : 'Pending'}
                                color={note.processedToWorkOrder || note.status === 'processed' ? 'success' : 'error'}
                                size="small"
                              />
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                              {group.name}
                            </Typography>

                            {scheduledDate && (
                              <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                                Scheduled: {format(scheduledDate, 'MMM dd, yyyy hh:mm a')}
                              </Typography>
                            )}

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
                                  {!(note.processedToWorkOrder || note.status === 'processed') && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleMarkAsProcessed(note._id)}
                                      disabled={isUpdating}
                                      color="success"
                                      title="Mark as Processed"
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

                            <Box sx={{ mt: 2 }}>
                              {createdDate && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Created: {format(createdDate, 'MMM dd, yyyy hh:mm a')}
                                </Typography>
                              )}
                              {!scheduledDate && !createdDate && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  No date provided
                                </Typography>
                              )}
                            </Box>

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
              </Box>
            ))}
          </>
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
                  value={formData.workersText}
                  onChange={(e) => setFormData({
                    ...formData,
                    workersText: e.target.value,
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
