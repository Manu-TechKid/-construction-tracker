import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

const ProgressTracker = ({ workOrderId, notes = [], onAddNote, onUpdateNote, onDeleteNote }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    type: 'progress',
    title: '',
    description: '',
    priority: 'medium',
  });

  const noteTypes = {
    progress: { label: 'Progress Update', color: 'primary', icon: <CheckCircleIcon /> },
    incident: { label: 'Incident', color: 'error', icon: <WarningIcon /> },
    info: { label: 'Information', color: 'info', icon: <InfoIcon /> },
  };

  const priorities = {
    low: { label: 'Low', color: 'success' },
    medium: { label: 'Medium', color: 'warning' },
    high: { label: 'High', color: 'error' },
  };

  const handleOpenDialog = (note = null) => {
    if (note) {
      setEditingNote(note);
      setNoteForm({
        type: note.type,
        title: note.title,
        description: note.description,
        priority: note.priority,
      });
    } else {
      setEditingNote(null);
      setNoteForm({
        type: 'progress',
        title: '',
        description: '',
        priority: 'medium',
      });
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingNote(null);
    setNoteForm({
      type: 'progress',
      title: '',
      description: '',
      priority: 'medium',
    });
  };

  const handleSubmit = () => {
    const noteData = {
      ...noteForm,
      workOrderId,
      timestamp: new Date(),
      author: 'Current User', // This would come from auth context
    };

    if (editingNote) {
      onUpdateNote(editingNote._id, noteData);
    } else {
      onAddNote(noteData);
    }

    handleCloseDialog();
  };

  const handleDelete = (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(noteId);
    }
  };

  const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center">
            <TimelineIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Progress & Incidents</Typography>
          </Box>
        }
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Note
          </Button>
        }
      />
      <CardContent>
        {sortedNotes.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <TimelineIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1">
              No progress updates or incidents recorded yet.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ mt: 2 }}
            >
              Add First Note
            </Button>
          </Box>
        ) : (
          <List>
            {sortedNotes.map((note, index) => (
              <React.Fragment key={note._id || index}>
                <ListItem alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: theme.palette[noteTypes[note.type]?.color || 'primary'].main,
                      mr: 2,
                      width: 32,
                      height: 32,
                    }}
                  >
                    {noteTypes[note.type]?.icon}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {note.title}
                        </Typography>
                        <Chip
                          label={noteTypes[note.type]?.label}
                          size="small"
                          color={noteTypes[note.type]?.color}
                          variant="outlined"
                        />
                        <Chip
                          label={priorities[note.priority]?.label}
                          size="small"
                          color={priorities[note.priority]?.color}
                          variant="filled"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.primary" paragraph>
                          {note.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(note.timestamp), 'MMM dd, yyyy - HH:mm')} by {note.author}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleOpenDialog(note)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDelete(note._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sortedNotes.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>

      {/* Add/Edit Note Dialog */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNote ? 'Edit Note' : 'Add Progress Note'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              label="Note Type"
              value={noteForm.type}
              onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
              margin="normal"
              SelectProps={{ native: true }}
            >
              {Object.entries(noteTypes).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.label}
                </option>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Title"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={noteForm.description}
              onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              required
            />

            <TextField
              select
              fullWidth
              label="Priority"
              value={noteForm.priority}
              onChange={(e) => setNoteForm({ ...noteForm, priority: e.target.value })}
              margin="normal"
              SelectProps={{ native: true }}
            >
              {Object.entries(priorities).map(([key, priority]) => (
                <option key={key} value={key}>
                  {priority.label}
                </option>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!noteForm.title || !noteForm.description}
          >
            {editingNote ? 'Update' : 'Add'} Note
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ProgressTracker;
