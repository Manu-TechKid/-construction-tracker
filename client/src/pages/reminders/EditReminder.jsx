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
      await updateReminder({
        id,
        ...formData
      }).unwrap();
      
      toast.success('Reminder updated successfully');
      navigate('/reminders');
    } catch (error) {
      console.error('Failed to update reminder:', error);
      toast.error(error?.data?.message || 'Failed to update reminder');
    }
  };

  const handleCancel = (deleted = false) => {
    if (deleted) {
      navigate('/reminders');
    } else {
      navigate(`/reminders/${id}`);
    }
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
