import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  EventNote as NoteIcon,
  Schedule as PendingIcon,
  EventBusy as PostponedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetNotesQuery } from '../../features/notes/notesApiSlice';
import { formatDate } from '../../utils/dateUtils';

const PendingNotes = () => {
  const navigate = useNavigate();
  const { data: notesData, isLoading, error } = useGetNotesQuery({ 
    status: 'pending,postponed',
    limit: 10 
  });

  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (notesData?.data?.notes) {
      setNotes(notesData.data.notes);
    }
  }, [notesData]);
  const pendingNotes = notes.filter(note => note.status === 'pending');
  const postponedNotes = notes.filter(note => note.status === 'postponed');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <PendingIcon fontSize="small" sx={{ color: '#ff9800' }} />;
      case 'postponed':
        return <PostponedIcon fontSize="small" sx={{ color: '#f44336' }} />;
      default:
        return <NoteIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'postponed':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card elevation={3}>
        <CardHeader
          title="Pending & Postponed Notes"
          titleTypographyProps={{ variant: 'h6' }}
          avatar={<NoteIcon />}
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevation={3}>
        <CardHeader
          title="Pending & Postponed Notes"
          titleTypographyProps={{ variant: 'h6' }}
          avatar={<NoteIcon />}
        />
        <Divider />
        <CardContent>
          <Alert severity="error">
            Error loading notes: {error?.data?.message || 'Unknown error'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardHeader
        title="Pending & Postponed Notes"
        titleTypographyProps={{ variant: 'h6' }}
        avatar={<NoteIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`${pendingNotes.length} Pending`} 
              color="warning" 
              size="small" 
            />
            <Chip 
              label={`${postponedNotes.length} Postponed`} 
              color="error" 
              size="small" 
            />
          </Box>
        }
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {notes.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No pending or postponed notes
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notes.map((note, index) => (
              <React.Fragment key={note._id}>
                {index > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => navigate('/notes')}>
                    <Box
                      sx={{
                        width: 4,
                        height: '100%',
                        bgcolor: note.color || '#1976d2',
                        mr: 2,
                        borderRadius: 1,
                        minHeight: 60,
                      }}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {getStatusIcon(note.status)}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {note.title}
                          </Typography>
                          <Chip
                            label={note.status}
                            color={getStatusColor(note.status)}
                            size="small"
                            sx={{ ml: 'auto' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {note.content}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            {note.building?.name && (
                              <Chip
                                label={note.building.name}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {note.type && (
                              <Chip
                                label={note.type}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {note.visitDate && (
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(note.visitDate)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingNotes;
