import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Fab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PlayArrow as ClockInIcon,
  Stop as ClockOutIcon,
  Pause as BreakIcon,
  PlayCircle as ResumeIcon,
  CameraAlt as CameraIcon,
  LocationOn as LocationIcon,
  Notes as NotesIcon,
  Timeline as ProgressIcon,
  CheckCircle as CompleteIcon,
  Schedule as TimeIcon,
  PhotoCamera,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useClockInMutation,
  useClockOutMutation,
  useGetWorkerStatusQuery,
  useStartBreakMutation,
  useEndBreakMutation,
  useAddProgressUpdateMutation
} from '../../features/timeTracking/timeTrackingApiSlice';

const EnhancedTimeTracker = ({ workOrderId, buildingId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  // State management
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');
  const [progressDialog, setProgressDialog] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');
  const [breakDialog, setBreakDialog] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  
  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // API hooks
  const { data: statusData, refetch: refetchStatus } = useGetWorkerStatusQuery(user?.id, {
    pollingInterval: 10000, // Poll every 10 seconds
    skip: !user?.id
  });
  
  const [clockIn, { isLoading: isClockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: isClockingOut }] = useClockOutMutation();
  const [startBreak, { isLoading: isStartingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: isEndingBreak }] = useEndBreakMutation();
  const [addProgressUpdate, { isLoading: isAddingProgress }] = useAddProgressUpdateMutation();
  
  const isActive = statusData?.data?.isActive;
  const activeSession = statusData?.data?.activeSession;
  const isPaused = activeSession?.status === 'paused';

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time
  useEffect(() => {
    if (isActive && activeSession?.clockInTime) {
      const startTime = new Date(activeSession.clockInTime);
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
      setBreakTime(activeSession.breakTime * 60 || 0); // Convert minutes to seconds
    } else {
      setElapsedTime(0);
      setBreakTime(0);
    }
  }, [isActive, activeSession, currentTime]);

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocation(loc);
          resolve(loc);
        },
        (error) => {
          let message = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          toast.error(message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Handle photo capture
  const handlePhotoCapture = async (type = 'progress') => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        // Fallback to file input
        fileInputRef.current?.click();
      }
    } catch (error) {
      console.error('Camera access error:', error);
      fileInputRef.current?.click();
    }
  };

  // Capture photo from video
  const captureFromVideo = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotos(prev => [...prev, { file, preview: URL.createObjectURL(blob) }]);
        
        // Stop video stream
        const stream = video.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
      }, 'image/jpeg', 0.8);
    }
  };

  // Handle file input
  const handleFileInput = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        setPhotos(prev => [...prev, { 
          file, 
          preview: URL.createObjectURL(file) 
        }]);
      }
    });
  };

  // Remove photo
  const removePhoto = (index) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle clock in
  const handleClockIn = async () => {
    try {
      const loc = await getCurrentLocation();
      
      const formData = new FormData();
      formData.append('workerId', user.id);
      formData.append('latitude', loc.latitude);
      formData.append('longitude', loc.longitude);
      formData.append('accuracy', loc.accuracy);
      formData.append('notes', notes);
      
      if (workOrderId) formData.append('workOrderId', workOrderId);
      if (buildingId) formData.append('buildingId', buildingId);
      
      photos.forEach((photo, index) => {
        formData.append('photos', photo.file);
      });

      await clockIn(formData).unwrap();
      
      toast.success('Successfully clocked in!');
      setPhotos([]);
      setNotes('');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to clock in');
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    try {
      const loc = await getCurrentLocation();
      
      const formData = new FormData();
      formData.append('workerId', user.id);
      formData.append('latitude', loc.latitude);
      formData.append('longitude', loc.longitude);
      formData.append('accuracy', loc.accuracy);
      formData.append('notes', notes);
      
      photos.forEach((photo, index) => {
        formData.append('photos', photo.file);
      });

      await clockOut(formData).unwrap();
      
      toast.success('Successfully clocked out!');
      setPhotos([]);
      setNotes('');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to clock out');
    }
  };

  // Handle break start
  const handleStartBreak = async () => {
    try {
      const loc = await getCurrentLocation();
      
      await startBreak({
        workerId: user.id,
        reason: breakReason,
        latitude: loc.latitude,
        longitude: loc.longitude
      }).unwrap();
      
      toast.success('Break started');
      setBreakDialog(false);
      setBreakReason('');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to start break');
    }
  };

  // Handle break end
  const handleEndBreak = async () => {
    try {
      await endBreak({ workerId: user.id }).unwrap();
      toast.success('Break ended');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to end break');
    }
  };

  // Handle progress update
  const handleProgressUpdate = async () => {
    try {
      const formData = new FormData();
      formData.append('progress', progressValue);
      formData.append('notes', progressNotes);
      
      photos.forEach((photo, index) => {
        formData.append('photos', photo.file);
      });

      await addProgressUpdate({
        sessionId: activeSession._id,
        data: formData
      }).unwrap();
      
      toast.success('Progress updated!');
      setProgressDialog(false);
      setProgressValue(0);
      setProgressNotes('');
      setPhotos([]);
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update progress');
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Main Time Display */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box textAlign="center">
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Current Time
                </Typography>
                <Typography variant="h3" color="primary">
                  {format(currentTime, 'HH:mm:ss')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {format(currentTime, 'EEEE, MMMM d, yyyy')}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box textAlign="center">
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  {isPaused ? 'Break Time' : 'Work Time'}
                </Typography>
                <Typography variant="h3" color={isPaused ? 'warning.main' : 'success.main'}>
                  {formatTime(isPaused ? breakTime : elapsedTime)}
                </Typography>
                <Chip 
                  label={isActive ? (isPaused ? 'On Break' : 'Working') : 'Not Clocked In'} 
                  color={isActive ? (isPaused ? 'warning' : 'success') : 'default'}
                  icon={isActive ? (isPaused ? <BreakIcon /> : <TimeIcon />) : <TimeIcon />}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {!isActive ? (
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<ClockInIcon />}
                  onClick={handleClockIn}
                  disabled={isClockingIn}
                  sx={{ py: 2 }}
                >
                  {isClockingIn ? 'Clocking In...' : 'Clock In'}
                </Button>
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<ClockOutIcon />}
                    onClick={handleClockOut}
                    disabled={isClockingOut}
                  >
                    Clock Out
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  {!isPaused ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      startIcon={<BreakIcon />}
                      onClick={() => setBreakDialog(true)}
                      disabled={isStartingBreak}
                    >
                      Start Break
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<ResumeIcon />}
                      onClick={handleEndBreak}
                      disabled={isEndingBreak}
                    >
                      End Break
                    </Button>
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ProgressIcon />}
                    onClick={() => setProgressDialog(true)}
                  >
                    Update Progress
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Photos and Notes Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Photos & Notes
          </Typography>
          
          {/* Photo Grid */}
          {photos.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {photos.map((photo, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Box position="relative">
                    <img
                      src={photo.preview}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8
                      }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(255,255,255,0.8)'
                      }}
                      onClick={() => removePhoto(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Add Photo Button */}
          <Button
            variant="outlined"
            startIcon={<CameraIcon />}
            onClick={() => handlePhotoCapture()}
            sx={{ mb: 2, mr: 1 }}
          >
            Add Photo
          </Button>
          
          {/* Notes Field */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about your work..."
          />
        </CardContent>
      </Card>

      {/* Location Status */}
      {location && (
        <Alert severity="info" icon={<LocationIcon />} sx={{ mb: 2 }}>
          Location tracking active - Lat: {location.latitude.toFixed(6)}, 
          Lng: {location.longitude.toFixed(6)}
        </Alert>
      )}

      {/* Hidden Elements */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
      
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        playsInline
      />
      
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* Break Dialog */}
      <Dialog open={breakDialog} onClose={() => setBreakDialog(false)}>
        <DialogTitle>Start Break</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Break Reason"
            value={breakReason}
            onChange={(e) => setBreakReason(e.target.value)}
            placeholder="Lunch, Rest, etc."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBreakDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleStartBreak}
            variant="contained"
            disabled={isStartingBreak}
          >
            Start Break
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={progressDialog} onClose={() => setProgressDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Progress: {progressValue}%</Typography>
            <input
              type="range"
              min="0"
              max="100"
              value={progressValue}
              onChange={(e) => setProgressValue(parseInt(e.target.value))}
              style={{ width: '100%', marginBottom: 16 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Progress Notes"
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              placeholder="Describe the progress made..."
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="outlined"
              startIcon={<CameraIcon />}
              onClick={() => handlePhotoCapture('progress')}
            >
              Add Progress Photo
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleProgressUpdate}
            variant="contained"
            disabled={isAddingProgress}
          >
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedTimeTracker;
