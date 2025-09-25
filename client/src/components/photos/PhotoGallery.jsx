import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Fab,
  Tooltip,
  Alert,
  Snackbar,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Skeleton,
  Menu,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Add as AddIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  MoreVert as MoreIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { useGetSitePhotosQuery, useDeleteSitePhotoMutation } from '../../features/photos/photosApiSlice';
import { format } from 'date-fns';
import PhotoComparison from './PhotoComparison';

const PhotoGallery = ({ buildingId, onPhotoSelect, onAddPhoto }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [filterMode, setFilterMode] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: photosData, isLoading, error, refetch } = useGetSitePhotosQuery({
    buildingId,
    mode: filterMode === 'all' ? undefined : filterMode
  });

  const [deletePhoto] = useDeleteSitePhotoMutation();

  const photos = photosData?.data?.photos || [];

  const getModeColor = (mode) => {
    switch (mode) {
      case 'estimate': return 'primary';
      case 'inspection': return 'warning';
      case 'progress': return 'success';
      default: return 'default';
    }
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'estimate': return 'Estimate';
      case 'inspection': return 'Inspection';
      case 'progress': return 'Progress';
      default: return 'Other';
    }
  };

  const handlePhotoClick = (photo) => {
    if (onPhotoSelect) {
      onPhotoSelect(photo);
    } else {
      setSelectedPhoto(photo);
    }
  };

  const handleEditPhoto = (photo) => {
    setSelectedPhoto(photo);
    setEditDialogOpen(true);
  };

  const handleDeletePhoto = (photo) => {
    setSelectedPhoto(photo);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deletePhoto(selectedPhoto._id).unwrap();
      setSnackbar({
        open: true,
        message: 'Photo deleted successfully',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setSelectedPhoto(null);
      refetch();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete photo',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return null;

    let photoPath = photo.originalPhoto || photo.annotatedPhoto;
    if (!photoPath) return null;

    // If it's already a full URL, validate it
    if (typeof photoPath === 'string' && photoPath.startsWith('http')) {
      try {
        new URL(photoPath);
        return photoPath;
      } catch {
        return null;
      }
    }

    // Clean up the path
    const cleanPath = photoPath
      .replace(/^[\/\\]+/, '')
      .replace(/\/+/g, '/')
      .replace(/^api\/v1\//i, '')
      .replace(/^uploads\//i, '')
      .replace(/^\//, '');

    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    const cleanApiUrl = apiUrl
      .replace(/\/api\/v1\/api\/v1/g, '/api/v1')
      .replace(/\/+$/, '');

    return `${cleanApiUrl}/uploads/site-photos/${cleanPath}`;
  };

  const PhotoCard = ({ photo }) => {
    const photoUrl = getPhotoUrl(photo);

    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 3
          }
        }}
        onClick={() => handlePhotoClick(photo)}
      >
        <Box sx={{ position: 'relative', pt: '56.25%' }}>
          {photoUrl ? (
            <CardMedia
              component="img"
              image={photoUrl}
              alt={photo.notes || 'Site photo'}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: photoUrl ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'grey.200',
              color: 'grey.600'
            }}
          >
            <PhotoIcon sx={{ fontSize: 48 }} />
          </Box>
        </Box>

        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Chip
              label={getModeLabel(photo.mode)}
              color={getModeColor(photo.mode)}
              size="small"
            />
            <Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPhoto(photo);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto(photo);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Typography variant="body2" color="textSecondary" gutterBottom>
            {format(new Date(photo.timestamp), 'MMM dd, yyyy HH:mm')}
          </Typography>

          {photo.notes && (
            <Typography variant="body2" sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {photo.notes}
            </Typography>
          )}

          {photo.annotations && photo.annotations.length > 0 && (
            <Typography variant="caption" color="textSecondary">
              {photo.annotations.length} annotation{photo.annotations.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Site Photos</Typography>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load photos. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Site Photos ({photos.length})
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filterMode}
              label="Filter"
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="estimate">Estimates</MenuItem>
              <MenuItem value="inspection">Inspections</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
            </Select>
          </FormControl>

          {/* View Mode Toggle */}
          <Tooltip title="Grid View">
            <IconButton
              onClick={() => setViewMode('grid')}
              color={viewMode === 'grid' ? 'primary' : 'default'}
            >
              <GridViewIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="List View">
            <IconButton
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
            >
              <ListViewIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Compare Photos">
            <IconButton
              onClick={() => setComparisonDialogOpen(true)}
              disabled={photos.length < 2}
            >
              <CompareIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddPhoto}
            >
              Add Photo
          </Button>
        </Box>
      </Box>

      {photos.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: 'grey.50'
          }}
        >
          <PhotoIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No photos yet
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>
            Take your first photo to start documenting this building
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddPhoto}
          >
            Add First Photo
          </Button>
        </Paper>
      ) : (
        <ImageList
          cols={viewMode === 'grid' ? 3 : 1}
          gap={16}
          sx={{
            '& .MuiImageListItem-root': {
              borderRadius: 2,
              overflow: 'hidden'
            }
          }}
        >
          {photos.map((photo) => (
            <ImageListItem key={photo._id}>
              <PhotoCard photo={photo} />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Edit Photo Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Photo</DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={selectedPhoto.notes || ''}
                onChange={(e) => setSelectedPhoto({ ...selectedPhoto, notes: e.target.value })}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={selectedPhoto.mode}
                  label="Type"
                  onChange={(e) => setSelectedPhoto({ ...selectedPhoto, mode: e.target.value })}
                >
                  <MenuItem value="estimate">Estimate</MenuItem>
                  <MenuItem value="inspection">Inspection</MenuItem>
                  <MenuItem value="progress">Progress</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Photo</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this photo? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Comparison Dialog */}
      <PhotoComparison
        photos={photos}
        open={comparisonDialogOpen}
        onClose={() => setComparisonDialogOpen(false)}
      />
    </Box>
  );
};

export default PhotoGallery;
