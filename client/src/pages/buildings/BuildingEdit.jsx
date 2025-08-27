import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGetBuildingQuery, useUpdateBuildingMutation } from '../../features/buildings/buildingsApiSlice';
import BuildingForm from '../../components/buildings/BuildingForm';
import { toast } from 'react-toastify';

const BuildingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: buildingData, isLoading, isError, error } = useGetBuildingQuery(id);
  const [updateBuilding, { isLoading: isUpdating }] = useUpdateBuildingMutation();

  const building = buildingData?.data || {};

  const handleSubmit = async (formData) => {
    try {
      const result = await updateBuilding({ id, ...formData }).unwrap();
      toast.success('Building updated successfully');
      navigate(`/buildings/${id}`);
    } catch (error) {
      console.error('Failed to update building:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to update building';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate(`/buildings/${id}`);
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

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Error loading building: {error?.data?.message || 'Building not found'}
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate('/buildings')}
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Back to Buildings
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/buildings/${id}`)}
        sx={{ mb: 2 }}
      >
        Back to Building Details
      </Button>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Building
        </Typography>
        
        <BuildingForm
          initialValues={building}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          isEdit={true}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default BuildingEdit;
