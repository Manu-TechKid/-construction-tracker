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
  Fab,
  Tabs,
  Tab,
  AppBar
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
  Share,
  ViewModule as GridIcon,
  ViewList as ListIcon
} from '@mui/icons-material';
import { useGetBuildingQuery } from '../../features/buildings/buildingsApiSlice';
import {
  useGetSitePhotosQuery,
  useCreateSitePhotoMutation,
  useUpdateSitePhotoMutation,
  useDeleteSitePhotoMutation
} from '../../features/photos/photosApiSlice';
import PhotoAnnotator from '../../components/photos/PhotoAnnotator';
import PhotoGallery from '../../components/photos/PhotoGallery';
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
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' or 'annotator'

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

      // Show success message
      alert('Photo saved successfully!');

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
      let errorMessage = 'Failed to save photo';
      if (error.status === 'FETCH_ERROR' || error.message?.includes('fetch')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication error. Please refresh the page and log in again.';
      } else if (error.status === 403) {
        errorMessage = 'Permission denied. You do not have permission to save photos.';
      } else if (error.status === 413) {
        errorMessage = 'File too large. Please use a smaller image.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else {
        errorMessage = error.data?.message || error.message || 'Failed to save photo';
      }

      alert(errorMessage);
      throw new Error(errorMessage);
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

      {/* Visit Type Selection */}
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

      {/* Main Content with Tabs */}
      <Paper sx={{ mb: 3 }}>
        <AppBar position="static" color="default" elevation={1}>
          <Tabs
            value={viewMode}
            onChange={(e, newValue) => setViewMode(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab
              value="gallery"
              label="Photo Gallery"
              icon={<GridIcon />}
              iconPosition="start"
            />
            <Tab
              value="annotator"
              label="Take Photo"
              icon={<PhotoCamera />}
              iconPosition="start"
            />
          </Tabs>
        </AppBar>

        {/* Gallery View */}
        {viewMode === 'gallery' && (
          <PhotoGallery
            buildingId={buildingId}
            onPhotoSelect={(photo) => {
              setSelectedPhoto(photo);
              setViewMode('annotator');
            }}
            onAddPhoto={() => setViewMode('annotator')}
          />
        )}

        {/* Photo Annotator View */}
        {viewMode === 'annotator' && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Photo Annotation Tool
              </Typography>
              <Button
                variant="outlined"
                startIcon={<GridIcon />}
                onClick={() => setViewMode('gallery')}
              >
                Back to Gallery
              </Button>
            </Box>

            <PhotoAnnotator
              buildingId={buildingId}
              mode={visitType}
              initialPhoto={selectedPhoto?.originalPhoto}
              onSave={handlePhotoSave}
              onCancel={() => setViewMode('gallery')}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SiteVisit;
