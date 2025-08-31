import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGetWorkerQuery, useUpdateWorkerMutation } from '../../features/workers/workersApiSlice';
import WorkerForm from '../../components/workers/WorkerForm';
import { toast } from 'react-toastify';

const EditWorker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: workerData, isLoading, error } = useGetWorkerQuery(id);
  const [updateWorker, { isLoading: isUpdating }] = useUpdateWorkerMutation();

  const worker = workerData?.data?.worker;

  const handleSubmit = async (formData) => {
    try {
      await updateWorker({ id, ...formData }).unwrap();
      toast.success('Worker updated successfully');
      navigate(`/workers`);
    } catch (error) {
      console.error('Failed to update worker:', error);
      toast.error(error?.data?.message || 'Failed to update worker');
    }
  };

  const handleCancel = () => {
    navigate('/workers');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error loading worker: {error?.data?.message || error?.message}
        </Alert>
      </Container>
    );
  }

  if (!worker) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Worker not found
        </Alert>
      </Container>
    );
  }

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
          Edit Worker: {worker.name}
        </Typography>
        
        <WorkerForm
          initialValues={{
            name: worker.name || '',
            email: worker.email || '',
            phone: worker.phone || '',
            skills: worker.skills || [],
            hourlyRate: worker.hourlyRate || 0,
            status: worker.status || 'active'
          }}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          isEdit={true}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default EditWorker;
