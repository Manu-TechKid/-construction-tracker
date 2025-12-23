import React, { useState, useEffect, useRef } from 'react';
import { Button, Box, Typography, CircularProgress, Chip, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useGetUserTimeLogStatusQuery, useClockInMutation, useClockOutMutation } from '../../features/time-logs/timeLogsApiSlice';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import { AccessTime, CheckCircleOutline, HighlightOff } from '@mui/icons-material';

const ClockInOut = () => {
  const { data: statusData, isLoading: isStatusLoading, refetch } = useGetUserTimeLogStatusQuery();
  const [clockIn, { isLoading: isClockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: isClockingOut }] = useClockOutMutation();
  const [location, setLocation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDialogLoading, setDialogLoading] = useState(false);
  const sigCanvas = useRef({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude],
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.warn('Could not get location. Clock-in/out will not have location data.');
        }
      );
    }
  }, []);

  const handleClockIn = async (signature) => {
    const payload = { signature };
    if (location) {
      payload.location = location;
    }
    await clockIn(payload).unwrap();
    toast.success('Successfully clocked in!');
    refetch();
  };

  const handleClockOut = async (signature) => {
    const payload = { signature };
    if (location) {
      payload.location = location;
    }
    await clockOut(payload).unwrap();
    toast.success('Successfully clocked out!');
    refetch();
  };

  if (isStatusLoading) {
    return <CircularProgress size={24} />;
  }

  const isClockedIn = statusData?.data?.status === 'clock-in';
  
  const clearSignature = () => {
    sigCanvas.current.clear();
  };

  const handleConfirm = async () => {
    if (sigCanvas.current.isEmpty()) {
      toast.error('Please provide a signature.');
      return;
    }

    setDialogLoading(true);

    try {
      const signature = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

      if (isClockedIn) {
        await handleClockOut(signature);
      } else {
        await handleClockIn(signature);
      }
      
      setDialogOpen(false); // Close dialog only on success
    } catch (err) {
      // Errors are already toasted in handleClockIn/handleClockOut
      console.error('Failed to clock in/out:', err);
      toast.error(err.data?.message || 'An unexpected error occurred.');
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Chip
        icon={isClockedIn ? <CheckCircleOutline /> : <HighlightOff />}
        label={isClockedIn ? 'Clocked In' : 'Clocked Out'}
        color={isClockedIn ? 'success' : 'default'}
        variant="outlined"
        size="small"
      />
      <Button
        variant="contained"
        size="small"
        startIcon={(isClockingIn || isClockingOut) ? <CircularProgress size={20} color="inherit" /> : <AccessTime />}
        onClick={() => setDialogOpen(true)}
        disabled={isClockingIn || isClockingOut}
        sx={{
          backgroundColor: isClockedIn ? '#f44336' : '#4caf50',
          color: 'white',
          '&:hover': {
            backgroundColor: isClockedIn ? '#d32f2f' : '#388e3c',
          },
        }}
      >
        {isClockedIn ? 'Clock Out' : 'Clock In'}
      </Button>
      <Dialog open={dialogOpen} onClose={() => isDialogLoading ? null : setDialogOpen(false)}>
        <DialogTitle>Signature</DialogTitle>
        <DialogContent>
          <Box sx={{ border: '1px solid #ccc', borderRadius: '4px' }}>
            <SignatureCanvas
              ref={sigCanvas}
              penColor='black'
              canvasProps={{ width: 400, height: 200, className: 'sigCanvas' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isDialogLoading}>Cancel</Button>
          <Button onClick={clearSignature} disabled={isDialogLoading}>Clear</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={isDialogLoading}>
            {isDialogLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClockInOut;
