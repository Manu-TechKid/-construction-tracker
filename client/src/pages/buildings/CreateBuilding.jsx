import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreateBuildingMutation } from '../../features/buildings/buildingsApiSlice';
import BuildingForm from '../../components/buildings/BuildingForm';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';

const CreateBuilding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createBuilding, { isLoading }] = useCreateBuildingMutation();

  const handleSubmit = async (formData) => {
    try {
      // Add administrator (current user) to the form data
      const submitData = {
        ...formData,
        administrator: user?._id || user?.id
      };
      
      const result = await createBuilding(submitData).unwrap();
      toast.success('Building created successfully');
      navigate('/buildings');
    } catch (error) {
      console.error('Failed to create building:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to create building';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate('/buildings');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/buildings')}
        sx={{ mb: 2 }}
      >
        Back to Buildings
      </Button>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Add New Building
        </Typography>
        
        <BuildingForm
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default CreateBuilding;
