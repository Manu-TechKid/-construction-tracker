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
  
  console.log('SiteVisit component loaded, buildingId:', buildingId);
  
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
  
  console.log('Building data:', { building, buildingLoading, buildingError });

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
      if (selectedPhoto) {
        // Update existing photo
        await updateSitePhoto({
          id: selectedPhoto.id,
          ...photoData
        }).unwrap();
        console.log('Photo updated successfully!');
      } else {
        // Create new photo
        await createSitePhoto(photoData).unwrap();
        console.log('Photo saved successfully!');
      }
      
      setShowAnnotator(false);
      setSelectedPhoto(null);
      refetchPhotos();
    } catch (error) {
      console.error('Failed to save photo');
      console.error('Error saving photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await deleteSitePhoto(photoId).unwrap();
        console.log('Photo deleted successfully!');
        refetchPhotos();
      } catch (error) {
        console.error('Failed to delete photo');
        console.error('Error deleting photo:', error);
      }
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
      {/* Debug Info */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Debug: Building ID: {buildingId}, Building loaded: {building ? 'Yes' : 'No'}
        {buildingError && `, Error: ${buildingError.message || 'Unknown error'}`}
      </Alert>
      
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Site Visit - {building?.name || 'Loading...'}
        </Typography>
        
        <Button
          variant="contained"
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
        <Typography variant="h6" gutterBottom>
          Photos {photosLoading && '(Loading...)'}
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowAnnotator(true)}
          sx={{ mb: 2 }}
        >
          Take Photo & Annotate
        </Button>
        
        {sitePhotos && sitePhotos.length > 0 ? (
          <Typography>Found {sitePhotos.length} photos</Typography>
        ) : (
          <Typography color="text.secondary">No photos yet</Typography>
        )}
      </Paper>

      {/* Photo Annotator Dialog */}
      {showAnnotator && (
        <Dialog 
          open={showAnnotator} 
          onClose={() => setShowAnnotator(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Photo Annotation</DialogTitle>
          <DialogContent>
            <Typography>Photo annotator will be loaded here</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAnnotator(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SiteVisit;
