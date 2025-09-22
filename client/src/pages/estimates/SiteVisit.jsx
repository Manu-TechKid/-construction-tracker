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
    isLoading: buildingLoading 
  } = useGetBuildingQuery(buildingId);

  const { 
    data: sitePhotos = [], 
    isLoading: photosLoading,
    refetch: refetchPhotos
  } = useGetSitePhotosQuery(buildingId);

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

  if (buildingLoading || photosLoading) {
    return <LoadingSpinner />;
  }

  if (!building) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Building not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link 
            color="inherit" 
            href="/buildings" 
            onClick={(e) => {
              e.preventDefault();
              navigate('/buildings');
            }}
          >
            Buildings
          </Link>
          <Link 
            color="inherit" 
            href={`/buildings/${buildingId}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/buildings/${buildingId}`);
            }}
          >
            {building.name}
          </Link>
          <Typography color="text.primary">Site Visit</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Site Visit - {building.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip 
                icon={<LocationIcon />} 
                label={building.address} 
                variant="outlined" 
              />
              <Chip 
                icon={<TimeIcon />} 
                label={formatDate(new Date())} 
                variant="outlined" 
              />
            </Box>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/buildings/${buildingId}`)}
          >
            Back to Building
          </Button>
        </Box>
      </Box>

      {/* Visit Type Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visit Type
        </Typography>
        <Grid container spacing={2}>
          {visitTypes.map((type) => (
            <Grid item xs={12} md={4} key={type.value}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: visitType === type.value ? 2 : 1,
                  borderColor: visitType === type.value ? `${type.color}.main` : 'divider'
                }}
                onClick={() => setVisitType(type.value)}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: `${type.color}.main`, mb: 1 }}>
                    {type.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {type.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {type.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Photos by Type */}
      {visitTypes.map((type) => {
        const photos = getPhotosByType(type.value);
        return (
          <Paper key={type.value} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ color: `${type.color}.main` }}>
                  {type.icon}
                </Box>
                <Typography variant="h6">
                  {type.label} Photos ({photos.length})
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color={type.color}
                startIcon={<PhotoCamera />}
                onClick={() => {
                  setVisitType(type.value);
                  setSelectedPhoto(null);
                  setShowAnnotator(true);
                }}
              >
                Take {type.label} Photo
              </Button>
            </Box>

            {photos.length === 0 ? (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 4, 
                  color: 'text.secondary',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <PhotoCamera sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  No {type.label.toLowerCase()} photos yet
                </Typography>
                <Typography variant="body2">
                  Take your first {type.label.toLowerCase()} photo to get started
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {photos.map((photo) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={photo.annotatedPhoto || photo.originalPhoto}
                        alt="Site photo"
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {formatDate(photo.timestamp)}
                        </Typography>
                        {photo.notes && (
                          <Typography variant="body2" noWrap>
                            {photo.notes}
                          </Typography>
                        )}
                        {photo.annotations && photo.annotations.length > 0 && (
                          <Chip 
                            label={`${photo.annotations.length} annotations`}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                      <CardActions>
                        <Tooltip title="View/Edit">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedPhoto(photo);
                              setVisitType(photo.mode);
                              setShowAnnotator(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        );
      })}

      {/* Photo Annotator Dialog */}
      <Dialog 
        open={showAnnotator} 
        onClose={() => setShowAnnotator(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <PhotoAnnotator
            buildingId={buildingId}
            mode={visitType}
            initialPhoto={selectedPhoto?.originalPhoto}
            onSave={handlePhotoSave}
          />
        </DialogContent>
      </Dialog>

      {/* Start Visit Dialog */}
      <Dialog open={showVisitDialog} onClose={() => setShowVisitDialog(false)}>
        <DialogTitle>Start New {visitTypes.find(t => t.value === visitType)?.label} Visit</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Visit Notes"
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            placeholder="Add notes about this visit..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVisitDialog(false)}>Cancel</Button>
          <Button onClick={handleStartNewVisit} variant="contained">
            Start Visit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setShowVisitDialog(true)}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default SiteVisit;
