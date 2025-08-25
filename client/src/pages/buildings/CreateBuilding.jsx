import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreateBuildingMutation } from '../../features/buildings/buildingsApiSlice';
import BuildingForm from '../../components/buildings/BuildingForm';
import { toast } from 'react-toastify';

const CreateBuilding = () => {
  const navigate = useNavigate();
  const [createBuilding, { isLoading }] = useCreateBuildingMutation();

  const handleSubmit = async (formData) => {
    try {
      const result = await createBuilding(formData).unwrap();
      toast.success('Building created successfully');
      navigate(`/buildings/${result.data.building._id}`);
    } catch (error) {
      console.error('Failed to create building:', error);
      toast.error(error?.data?.message || 'Failed to create building');
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
