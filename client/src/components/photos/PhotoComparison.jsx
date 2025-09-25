import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  IconButton,
  Chip,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  Compare as CompareIcon,
  SwapHoriz as SwapIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const PhotoComparison = ({ photos, open, onClose }) => {
  const [selectedPhotos, setSelectedPhotos] = useState([null, null]);
  const [comparisonMode, setComparisonMode] = useState('side-by-side'); // 'side-by-side', 'overlay', 'difference'
  const [zoom, setZoom] = useState(1);
  const [syncZoom, setSyncZoom] = useState(true);

  useEffect(() => {
    if (photos && photos.length >= 2) {
      setSelectedPhotos([photos[0], photos[1]]);
    }
  }, [photos]);

  const handlePhotoSelect = (index, photo) => {
    const newSelection = [...selectedPhotos];
    newSelection[index] = photo;
    setSelectedPhotos(newSelection);
  };

  const handleSwapPhotos = () => {
    setSelectedPhotos([selectedPhotos[1], selectedPhotos[0]]);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
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

  const PhotoCard = ({ photo, index, isSelected, onSelect }) => {
    const photoUrl = getPhotoUrl(photo);

    return (
      <Card
        sx={{
          height: '100%',
          cursor: 'pointer',
          border: isSelected ? '3px solid' : '1px solid',
          borderColor: isSelected ? 'primary.main' : 'divider',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 2
          }
        }}
        onClick={() => onSelect(index, photo)}
      >
        <Box sx={{ position: 'relative', pt: '56.25%', backgroundColor: 'grey.100' }}>
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
            <CompareIcon sx={{ fontSize: 48 }} />
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Chip
              label={getModeLabel(photo.mode)}
              color={getModeColor(photo.mode)}
              size="small"
            />
            {isSelected && (
              <Chip
                label={`Selected ${index === 0 ? 'Left' : 'Right'}`}
                color="primary"
                size="small"
              />
            )}
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
        </Box>
      </Card>
    );
  };

  const ComparisonView = () => {
    const [leftPhoto, rightPhoto] = selectedPhotos;

    if (!leftPhoto || !rightPhoto) {
      return (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
          backgroundColor: 'grey.50',
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: 1
        }}>
          <Typography color="textSecondary">
            Select two photos to compare
          </Typography>
        </Box>
      );
    }

    const leftUrl = getPhotoUrl(leftPhoto);
    const rightUrl = getPhotoUrl(rightPhoto);

    return (
      <Box sx={{ position: 'relative' }}>
        <Grid container spacing={2} sx={{ height: 500 }}>
          <Grid item xs={6}>
            <Box sx={{ position: 'relative', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ p: 1, backgroundColor: 'grey.100' }}>
                {getModeLabel(leftPhoto.mode)} - {format(new Date(leftPhoto.timestamp), 'MMM dd, yyyy')}
              </Typography>
              {leftUrl ? (
                <img
                  src={leftUrl}
                  alt="Left comparison"
                  style={{
                    width: '100%',
                    height: 'calc(100% - 40px)',
                    objectFit: 'contain',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left'
                  }}
                />
              ) : (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'calc(100% - 40px)',
                  backgroundColor: 'grey.200'
                }}>
                  <CompareIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box sx={{ position: 'relative', height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ p: 1, backgroundColor: 'grey.100' }}>
                {getModeLabel(rightPhoto.mode)} - {format(new Date(rightPhoto.timestamp), 'MMM dd, yyyy')}
              </Typography>
              {rightUrl ? (
                <img
                  src={rightUrl}
                  alt="Right comparison"
                  style={{
                    width: '100%',
                    height: 'calc(100% - 40px)',
                    objectFit: 'contain',
                    transform: `scale(${syncZoom ? zoom : 1})`,
                    transformOrigin: 'top left'
                  }}
                />
              ) : (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'calc(100% - 40px)',
                  backgroundColor: 'grey.200'
                }}>
                  <CompareIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Photo Comparison</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={comparisonMode === 'side-by-side' ? 'contained' : 'outlined'}
              onClick={() => setComparisonMode('side-by-side')}
            >
              Side by Side
            </Button>
            <Button
              size="small"
              variant={comparisonMode === 'overlay' ? 'contained' : 'outlined'}
              onClick={() => setComparisonMode('overlay')}
            >
              Overlay
            </Button>
            <IconButton onClick={handleSwapPhotos} disabled={!selectedPhotos[0] || !selectedPhotos[1]}>
              <SwapIcon />
            </IconButton>
            <IconButton onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
            <Typography variant="body2" sx={{ alignSelf: 'center', mx: 1 }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Photo Selection Panel */}
          <Grid item xs={3} sx={{ borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto' }}>
            <Typography variant="subtitle1" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              Select Photos to Compare
            </Typography>

            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Left Photo:
              </Typography>
              <Grid container spacing={1}>
                {photos.map((photo, index) => (
                  <Grid item xs={12} key={photo._id}>
                    <PhotoCard
                      photo={photo}
                      index={0}
                      isSelected={selectedPhotos[0]?._id === photo._id}
                      onSelect={handlePhotoSelect}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider />

            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Right Photo:
              </Typography>
              <Grid container spacing={1}>
                {photos.map((photo, index) => (
                  <Grid item xs={12} key={photo._id}>
                    <PhotoCard
                      photo={photo}
                      index={1}
                      isSelected={selectedPhotos[1]?._id === photo._id}
                      onSelect={handlePhotoSelect}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          {/* Comparison View */}
          <Grid item xs={9}>
            <ComparisonView />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="textSecondary">
          Zoom: {Math.round(zoom * 100)}% |
          Sync: {syncZoom ? 'Enabled' : 'Disabled'}
        </Typography>
      </DialogActions>
    </Dialog>
  );
};

export default PhotoComparison;
