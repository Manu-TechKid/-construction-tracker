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

  // Handle both response formats: { data: building } or { data: { data: building } }
  const building = buildingData?.data?.data || buildingData?.data || {};

  const handleSubmit = async (formData) => {
    try {
      await updateBuilding({ id, ...formData }).unwrap();
      toast.success('✅ Building updated successfully! All changes have been saved.');
      navigate(`/buildings/${id}`);
    } catch (error) {
      console.error('Failed to update building:', error);
      console.error('Error data:', error?.data);
      console.error('Error status:', error?.status);
      
      const backendMessage = error?.data?.message || error?.message || 'Failed to update building';
      let errorMessage = backendMessage;

      // Handle validation errors from backend
      if (error?.data?.message && error.data.message.includes('Validation error:')) {
        errorMessage = error.data.message;
      }

      if (error?.status === 404) {
        toast.error('❌ Building not found. It may have been deleted by another user.');
      } else if (error?.status === 400) {
        toast.error(`❌ ${errorMessage}`);
      } else if (error?.status === 500) {
        toast.error('❌ Server error while updating building. Please try again or contact support.');
      } else if (backendMessage === 'Something went very wrong!') {
        toast.error('❌ Unexpected server error while updating building. Please try again or contact support.');
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        toast.error('❌ A building with this name already exists. Please choose a different name.');
      } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        toast.error(`❌ ${errorMessage}`);
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        toast.error('🌐 Network error. Please check your connection and try again.');
      } else {
        toast.error(`❌ Failed to update building: ${errorMessage}`);
      }
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
            Error loading building: {error?.data?.message || error?.message || 'Building not found'}
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

  // Add check for empty building data
  if (!isLoading && (!building || Object.keys(building).length === 0)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Building data not found or empty
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
