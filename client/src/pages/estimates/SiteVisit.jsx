import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Breadcrumbs,
  Link,
  Fab
} from '@mui/material';
import {
  PhotoCamera,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  Assignment as EstimateIcon,
  Build as InspectionIcon,
  TrendingUp as ProgressIcon,
  ArrowBack,
  Save,
  Share
} from '@mui/icons-material';
// import { toast } from 'react-toastify';
import { useGetBuildingQuery } from '../../features/buildings/buildingsApiSlice';
import { 
  useGetSitePhotosQuery,
  useCreateSitePhotoMutation,
  useUpdateSitePhotoMutation,
  useDeleteSitePhotoMutation
} from '../../features/photos/photosApiSlice';
import PhotoAnnotator from '../../components/photos/PhotoAnnotator';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SiteVisit = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  
  
  const [visitType, setVisitType] = useState('estimate');
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [currentVisit, setCurrentVisit] = useState(null);

  const { 
    data: building, 
    isLoading: buildingLoading,
    error: buildingError 
  } = useGetBuildingQuery(buildingId);
  

  const { 
    data: sitePhotos = [], 
    isLoading: photosLoading,
    error: photosError,
    refetch: refetchPhotos
  } = useGetSitePhotosQuery(buildingId, {
    skip: !buildingId
  });

  const [createSitePhoto] = useCreateSitePhotoMutation();
  const [updateSitePhoto] = useUpdateSitePhotoMutation();
  const [deleteSitePhoto] = useDeleteSitePhotoMutation();

  const visitTypes = [
    { 
      value: 'estimate', 
      label: 'Estimate', 
      icon: <EstimateIcon />,
      color: 'primary',
      description: 'Cost estimation and planning'
    },
    { 
      value: 'inspection', 
      label: 'Inspection', 
      icon: <InspectionIcon />,
      color: 'warning',
      description: 'Quality control and compliance check'
    },
    { 
      value: 'progress', 
      label: 'Progress', 
      icon: <ProgressIcon />,
      color: 'success',
      description: 'Work progress documentation'
    }
  ];

  const handlePhotoSave = async (photoData) => {
    try {
      console.log('Saving photo with data:', photoData);

      const result = await createSitePhoto(photoData).unwrap();
      console.log('Photo saved successfully:', result);

      // Refresh the photos list
      refetchPhotos();

      // Close the annotator dialog
      setShowAnnotator(false);
      setSelectedPhoto(null);

      // Reset form if needed
      if (!selectedPhoto) {
        setVisitType('estimate'); // Reset to default
      }

      return result;
    } catch (error) {
      console.error('Error saving photo:', error);

      // Enhanced error handling
      if (error.status === 'FETCH_ERROR' || error.message?.includes('fetch')) {
        throw new Error('Network error: Please check your internet connection and try again');
      } else if (error.status === 401) {
        throw new Error('Authentication error: Please refresh the page and log in again');
      } else if (error.status === 403) {
        throw new Error('Permission denied: You do not have permission to save photos');
      } else if (error.status === 413) {
        throw new Error('File too large: Please use a smaller image');
      } else if (error.status >= 500) {
        throw new Error('Server error: Please try again in a few moments');
      } else {
        throw new Error(error.data?.message || error.message || 'Failed to save photo');
      }
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      await deleteSitePhoto(photoId).unwrap();
      refetchPhotos();
      console.log('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting photo: ' + (error.data?.message || error.message || 'Unknown error'));
    }
  };

  const handleStartNewVisit = () => {
    setCurrentVisit({
      buildingId,
      type: visitType,
      startTime: new Date().toISOString(),
      notes: visitNotes,
      photos: []
    });
    setShowVisitDialog(false);
    setShowAnnotator(true);
  };

  const getPhotosByType = (type) => {
    return sitePhotos.filter(photo => photo.mode === type);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (buildingLoading) {
    return <LoadingSpinner />;
  }

  if (!building) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Building not found</Alert>
      </Box>
    );
  }

  if (photosError) {
    console.error('Photos API Error:', photosError);
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Site Visit - {building?.name || 'Loading...'}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {building?.address}
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/buildings/${buildingId}`)}
          sx={{ mb: 2 }}
        >
          Back to Building
        </Button>
      </Box>

      {/* Simple Visit Type Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visit Type: {visitType}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant={visitType === 'estimate' ? 'contained' : 'outlined'}
            onClick={() => setVisitType('estimate')}
          >
            Estimate
          </Button>
          <Button 
            variant={visitType === 'inspection' ? 'contained' : 'outlined'}
            onClick={() => setVisitType('inspection')}
          >
            Inspection
          </Button>
          <Button 
            variant={visitType === 'progress' ? 'contained' : 'outlined'}
            onClick={() => setVisitType('progress')}
          >
            Progress
          </Button>
        </Box>
      </Paper>

      {/* Photo Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Photos {photosLoading && '(Loading...)'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PhotoCamera />}
            onClick={() => setShowAnnotator(true)}
          >
            Take Photo & Annotate
          </Button>
        </Box>
        
        {sitePhotos && sitePhotos.length > 0 ? (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {sitePhotos.map((photo, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo._id || index}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.annotatedPhoto || photo.originalPhoto}
                    alt="Site photo"
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Chip 
                      label={photo.mode || visitType}
                      size="small"
                      color="primary"
                      sx={{ mb: 1 }}
                    />
                    {photo.notes && (
                      <Typography variant="body2" noWrap>
                        {photo.notes}
                      </Typography>
                    )}
                    {photo.annotations && photo.annotations.length > 0 && (
                      <Chip 
                        label={`${photo.annotations.length} annotations`}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small"
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setShowAnnotator(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small"
                      color="error"
                      onClick={() => handleDeletePhoto(photo._id)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <PhotoCamera sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              No photos yet
            </Typography>
            <Typography variant="body2">
              Take your first photo to get started with site documentation
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Photo Annotator Dialog */}
      {showAnnotator && (
        <Dialog 
          open={showAnnotator} 
          onClose={() => setShowAnnotator(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: { height: '90vh' }
          }}
        >
          <DialogTitle>
            Photo Annotation - {visitType.charAt(0).toUpperCase() + visitType.slice(1)}
            <Button
              onClick={() => setShowAnnotator(false)}
              sx={{ float: 'right' }}
              color="inherit"
            >
              Close
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '100%' }}>
            <PhotoAnnotator
              buildingId={buildingId}
              mode={visitType}
              initialPhoto={selectedPhoto?.originalPhoto}
              onSave={handlePhotoSave}
              onCancel={() => setShowAnnotator(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default SiteVisit;
