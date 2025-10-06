import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreateWorkerMutation } from '../../features/workers/workersApiSlice';
import WorkerForm from '../../components/workers/WorkerForm';
import { toast } from 'react-toastify';

const CreateWorker = () => {
  const navigate = useNavigate();
  const [createWorker, { isLoading }] = useCreateWorkerMutation();

  const handleSubmit = async (formData) => {
    try {
      const result = await createWorker(formData).unwrap();
      toast.success('Worker created successfully');
      navigate(`/workers/${result.data.worker._id}`);
    } catch (error) {
      console.error('Failed to create worker:', error);
      toast.error(error?.data?.message || 'Failed to create worker');
    }
  };

  const handleCancel = () => {
    navigate('/workers');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/workers')}
        sx={{ mb: 2 }}
      >
        Back to Workers
      </Button>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Add New Worker
        </Typography>
        
        <WorkerForm
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default CreateWorker;
