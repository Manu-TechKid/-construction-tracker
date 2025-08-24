import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreateReminderMutation } from '../../features/reminders/remindersApiSlice';
import ReminderForm from '../../components/reminders/ReminderForm';
import { toast } from 'react-toastify';

const CreateReminder = () => {
  const navigate = useNavigate();
  const [createReminder, { isLoading }] = useCreateReminderMutation();

  const handleSubmit = async (formData) => {
    try {
      const result = await createReminder(formData).unwrap();
      toast.success('Reminder created successfully');
      navigate(`/reminders/${result.data.reminder._id}`);
    } catch (error) {
      console.error('Failed to create reminder:', error);
      toast.error(error?.data?.message || 'Failed to create reminder');
    }
  };

  const handleCancel = () => {
    navigate('/reminders');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back to Reminders
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Create New Reminder
          </Typography>
        </Box>
        
        <ReminderForm
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={handleCancel}
        />
      </Box>
    </Container>
  );
};

export default CreateReminder;
