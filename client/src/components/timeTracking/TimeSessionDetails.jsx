import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Avatar,
  Divider,
  Card,
  CardContent,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Business as BuildingIcon,
  Schedule as TimeIcon,
  PhotoCamera as PhotoIcon,
  Notes as NotesIcon,
  Timeline as ProgressIcon,
  Coffee as BreakIcon,
  LocationOn as LocationIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInMinutes } from 'date-fns';

const TimeSessionDetails = ({ open, onClose, session }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoDialog, setPhotoDialog] = useState(false);

  if (!session) return null;

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'In Progress';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalMinutes = differenceInMinutes(end, start);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return format(parseISO(timeString), 'MMM d, yyyy HH:mm');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'paused': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const viewPhoto = (photoUrl) => {
    setSelectedPhoto(photoUrl);
    setPhotoDialog(true);
  };

  const getAllPhotos = () => {
    const photos = [];
    
    // Clock-in photos
    if (session.photos && session.photos.length > 0) {
      session.photos.forEach(photo => {
        photos.push({
          url: typeof photo === 'string' ? photo : photo.url,
          type: photo.type || 'session',
          description: photo.description || 'Session photo',
          timestamp: session.clockInTime
        });
      });
    }

    // Progress update photos
    if (session.progressUpdates && session.progressUpdates.length > 0) {
      session.progressUpdates.forEach(update => {
        if (update.photos && update.photos.length > 0) {
          update.photos.forEach(photoUrl => {
            photos.push({
              url: photoUrl,
              type: 'progress',
              description: `Progress: ${update.progress}% - ${update.notes || 'No notes'}`,
              timestamp: update.timestamp || session.clockInTime,
              progress: update.progress
            });
          });
        }
      });
    }

    return photos;
  };

  const allPhotos = getAllPhotos();

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Time Session Details</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" />
                    Worker Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Worker</Typography>
                    <Typography variant="body1">
                      {session.worker?.name || session.worker?.email || 'Unknown Worker'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Building</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildingIcon fontSize="small" />
                      {session.building?.name || 'No Building Assigned'}
                    </Typography>
                    {session.building?.address && (
                      <Typography variant="body2" color="text.secondary">
                        {session.building.address}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={session.status} 
                      color={getStatusColor(session.status)}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Time Information */}
            <Grid item xs={12} md={6}>
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon color="primary" />
                    Time Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Clock In</Typography>
                    <Typography variant="body1">{formatTime(session.clockInTime)}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Clock Out</Typography>
                    <Typography variant="body1">
                      {session.clockOutTime ? formatTime(session.clockOutTime) : 'Still Active'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Total Duration</Typography>
                    <Typography variant="body1">
                      {formatDuration(session.clockInTime, session.clockOutTime)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Break Time</Typography>
                    <Typography variant="body1">{session.breakTime || 0} minutes</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Photos Section */}
            {allPhotos.length > 0 && (
              <Grid item xs={12}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhotoIcon color="primary" />
                      Photos ({allPhotos.length})
                    </Typography>
                    
                    <ImageList cols={isMobile ? 2 : 4} gap={8}>
                      {allPhotos.map((photo, index) => (
                        <ImageListItem key={index}>
                          <img
                            src={photo.url.startsWith('http') ? photo.url : `${process.env.REACT_APP_API_URL || '/api/v1'}${photo.url}`}
                            alt={photo.description}
                            style={{ height: 120, objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => viewPhoto(photo.url)}
                            loading="lazy"
                          />
                          <ImageListItemBar
                            title={photo.type === 'progress' ? `Progress: ${photo.progress}%` : 'Session Photo'}
                            subtitle={photo.description}
                            actionIcon={
                              <IconButton
                                sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                onClick={() => viewPhoto(photo.url)}
                              >
                                <ViewIcon />
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Notes Section */}
            {session.notes && (
              <Grid item xs={12}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NotesIcon color="primary" />
                      Notes
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {session.notes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Progress Updates */}
            {session.progressUpdates && session.progressUpdates.length > 0 && (
              <Grid item xs={12}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ProgressIcon color="primary" />
                      Progress Updates ({session.progressUpdates.length})
                    </Typography>
                    
                    {session.progressUpdates.map((update, index) => (
                      <Accordion key={index}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Chip 
                              label={`${update.progress || 0}%`} 
                              color="primary" 
                              size="small" 
                            />
                            <Typography variant="body2">
                              {update.notes || 'No notes provided'}
                            </Typography>
                            {update.photos && update.photos.length > 0 && (
                              <Chip 
                                icon={<PhotoIcon />} 
                                label={`${update.photos.length} photos`} 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {update.notes && (
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {update.notes}
                            </Typography>
                          )}
                          {update.photos && update.photos.length > 0 && (
                            <ImageList cols={isMobile ? 2 : 3} gap={4}>
                              {update.photos.map((photoUrl, photoIndex) => (
                                <ImageListItem key={photoIndex}>
                                  <img
                                    src={photoUrl.startsWith('http') ? photoUrl : `${process.env.REACT_APP_API_URL || '/api/v1'}${photoUrl}`}
                                    alt={`Progress photo ${photoIndex + 1}`}
                                    style={{ height: 100, objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => viewPhoto(photoUrl)}
                                    loading="lazy"
                                  />
                                </ImageListItem>
                              ))}
                            </ImageList>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Breaks */}
            {session.breaks && session.breaks.length > 0 && (
              <Grid item xs={12}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BreakIcon color="primary" />
                      Breaks ({session.breaks.length})
                    </Typography>
                    
                    <List dense>
                      {session.breaks.map((breakItem, index) => (
                        <ListItem key={index}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.main' }}>
                              <BreakIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={breakItem.reason || 'Break'}
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  Start: {formatTime(breakItem.startTime)}
                                </Typography>
                                {breakItem.endTime && (
                                  <Typography variant="body2">
                                    End: {formatTime(breakItem.endTime)} 
                                    ({breakItem.duration || 0} minutes)
                                  </Typography>
                                )}
                                {!breakItem.endTime && (
                                  <Chip label="Active Break" color="warning" size="small" />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Location Information */}
            {(session.location?.clockIn || session.location?.clockOut) && (
              <Grid item xs={12}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon color="primary" />
                      Location Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {session.location.clockIn && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="success.main">Clock In Location</Typography>
                          <Typography variant="body2">
                            Lat: {session.location.clockIn.latitude?.toFixed(6)}<br />
                            Lng: {session.location.clockIn.longitude?.toFixed(6)}<br />
                            Accuracy: {session.location.clockIn.accuracy || 'N/A'}m
                          </Typography>
                        </Grid>
                      )}
                      {session.location.clockOut && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="error.main">Clock Out Location</Typography>
                          <Typography variant="body2">
                            Lat: {session.location.clockOut.latitude?.toFixed(6)}<br />
                            Lng: {session.location.clockOut.longitude?.toFixed(6)}<br />
                            Accuracy: {session.location.clockOut.accuracy || 'N/A'}m
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={photoDialog} onClose={() => setPhotoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Photo View</Typography>
          <IconButton onClick={() => setPhotoDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={selectedPhoto.startsWith('http') ? selectedPhoto : `${process.env.REACT_APP_API_URL || '/api/v1'}${selectedPhoto}`}
                alt="Full size view"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimeSessionDetails;
