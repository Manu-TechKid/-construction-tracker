import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetReminderQuery, useUpdateReminderMutation } from '../../features/reminders/remindersApiSlice';
import ReminderForm from '../../components/reminders/ReminderForm';
import { toast } from 'react-toastify';
import { Box, Button, Container, Typography, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const EditReminder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  
  const { 
    data: reminderData, 
    isLoading: isLoadingReminder, 
    isError, 
    error 
  } = useGetReminderQuery(id);
  
  const [updateReminder, { isLoading: isUpdating }] = useUpdateReminderMutation();

  useEffect(() => {
    if (reminderData?.data?.reminder) {
      const { reminder } = reminderData.data;
      setInitialValues({
        title: reminder.title,
        description: reminder.description,
        building: reminder.building?._id || reminder.building,
        apartment: reminder.apartment || '',
        dueDate: new Date(reminder.dueDate),
        status: reminder.status,
        priority: reminder.priority,
        category: reminder.category || 'other',
        notes: reminder.notes || [],
        photos: reminder.photos || []
      });
    }
  }, [reminderData]);

  const handleSubmit = async (formData) => {
    try {
      // Format the data before sending
      const updateData = {
        ...formData,
        dueDate: formData.dueDate.toISOString(), // Ensure proper date format
        // Ensure building is sent as ID only
        building: typeof formData.building === 'object' ? formData.building._id : formData.building,
        // Filter out any empty strings or null values
        ...Object.fromEntries(
          Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
        )
      };

      const result = await updateReminder({
        id,
        ...updateData
      }).unwrap();
      
      if (result.success) {
        toast.success('Reminder updated successfully!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Navigate back to reminders list after showing the success message
        setTimeout(() => {
          navigate('/reminders', { replace: true });
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to update reminder:', error);
      const errorMessage = error?.data?.message || 
                         error?.error || 
                         'Failed to update reminder. Please try again.';
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleCancel = (deleted = false) => {
    navigate('/reminders');
  };

  if (isLoadingReminder || !initialValues) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error">
          {error?.data?.message || 'Failed to load reminder'}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back to Reminder
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Edit Reminder
          </Typography>
        </Box>
        
        <ReminderForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          isEdit={true}
          onCancel={handleCancel}
        />
      </Box>
    </Container>
  );
};

export default EditReminder;
