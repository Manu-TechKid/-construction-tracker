import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import photoService from '../../services/photoService';

const PhotoUpload = ({ photos = [], onPhotosChange, maxPhotos = 10, workOrderId = null }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [caption, setCaption] = useState('');
  const [photoType, setPhotoType] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    
    setUploading(true);
    setError('');
    
    try {
      const newPhotos = [];
      
      for (const file of acceptedFiles) {
        // Validate file
        photoService.validateFile(file);
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        
        const photo = {
          id: Date.now() + Math.random(),
          file,
          url: previewUrl,
          caption: '',
          type: 'other',
          uploadedAt: new Date().toISOString(),
          isUploaded: false
        };
        
        newPhotos.push(photo);
      }
      
      const updatedPhotos = [...photos, ...newPhotos].slice(0, maxPhotos);
      onPhotosChange(updatedPhotos);
      
    } catch (error) {
      console.error('Photo upload error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }, [photos, onPhotosChange, maxPhotos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: maxPhotos - photos.length,
    disabled: photos.length >= maxPhotos || uploading
  });

  const handleDeletePhoto = async (photo) => {
    try {
      if (workOrderId && photo.isUploaded && photo._id) {
        // Delete from server
        await photoService.deleteWorkOrderPhoto(workOrderId, photo._id);
      }
      
      // Remove from local state
      const updatedPhotos = photos.filter(p => p.id !== photo.id);
      onPhotosChange(updatedPhotos);
      
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Delete photo error:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleEditPhoto = (photo) => {
    setEditingPhoto(photo);
    setCaption(photo.caption || '');
    setPhotoType(photo.type || 'other');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    const updatedPhotos = photos.map(photo =>
      photo.id === editingPhoto.id
        ? { ...photo, caption, type: photoType }
        : photo
    );
    onPhotosChange(updatedPhotos);
    setEditDialogOpen(false);
    setEditingPhoto(null);
    toast.success('Photo updated successfully');
  };

  const getPhotoTypeColor = (type) => {
    switch (type) {
      case 'before':
        return 'primary';
      case 'during':
        return 'warning';
      case 'after':
        return 'success';
      case 'issue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPhotoTypeLabel = (type) => {
    switch (type) {
      case 'before':
        return 'Before';
      case 'during':
        return 'During';
      case 'after':
        return 'After';
      case 'issue':
        return 'Issue';
      default:
        return 'Other';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Photo Documentation
      </Typography>

      {/* Upload Area */}
      {photos.length < maxPhotos && (
        <Card 
          sx={{ 
            mb: 2, 
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            backgroundColor: isDragActive ? 'action.hover' : 'transparent',
            cursor: 'pointer'
          }}
        >
          <CardContent>
            <Box
              {...getRootProps()}
              sx={{
                textAlign: 'center',
                py: 3,
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {isDragActive ? 'Drop photos here' : 'Upload Photos'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Drag & drop photos here, or click to select files
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Supports: JPEG, PNG, GIF, WebP (Max {maxPhotos} photos)
              </Typography>
              {uploading && (
                <CircularProgress sx={{ mt: 2 }} />
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Photos Grid */}
      {photos.length > 0 && (
        <Grid container spacing={2}>
          {photos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} key={photo.id}>
              <Card>
                  <Box sx={{ position: 'relative' }}>
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Work order photo'}
                      style={{
                        width: '100%',
                        height: 200,
                        objectFit: 'contain',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        padding: '4px',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.backgroundColor = '#f8f9fa';
                        e.target.parentElement.style.border = '2px dashed #dee2e6';
                        e.target.parentElement.style.height = '200px';
                        e.target.parentElement.style.display = 'flex';
                        e.target.parentElement.style.alignItems = 'center';
                        e.target.parentElement.style.justifyContent = 'center';
                        e.target.parentElement.innerHTML = '<span style="color: #6c757d;">Image not available</span>';
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: 1,
                        p: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleEditPhoto(photo)}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                            transform: 'scale(1.1)',
                            boxShadow: 2,
                          },
                          width: 32,
                          height: 32,
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePhoto(photo)}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                            transform: 'scale(1.1)',
                            boxShadow: 2,
                          },
                          width: 32,
                          height: 32,
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                      }}
                    >
                      <Chip
                        label={getPhotoTypeLabel(photo.type)}
                        color={getPhotoTypeColor(photo.type)}
                        size="small"
                        sx={{
                          fontWeight: 'medium',
                          '& .MuiChip-label': {
                            px: 1,
                          }
                        }}
                      />
                    </Box>
                  </Box>
                  <CardContent sx={{ pt: 1, pb: 2, '&:last-child': { pb: 2 } }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        minHeight: '2.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                      }}
                    >
                      {photo.caption || 'No caption'}
                    </Typography>
                    {photo.uploadedAt && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {format(new Date(photo.uploadedAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    )}
                  </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {photos.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <PhotoIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No photos uploaded yet
          </Typography>
          <Typography variant="body2">
            Upload photos to document the work progress
          </Typography>
        </Box>
      )}

      {/* Edit Photo Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Photo Details</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              margin="normal"
              multiline
              rows={2}
              placeholder="Add a description for this photo..."
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Photo Type</InputLabel>
              <Select
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}
                label="Photo Type"
              >
                <MenuItem value="before">Before Work</MenuItem>
                <MenuItem value="during">During Work</MenuItem>
                <MenuItem value="after">After Work</MenuItem>
                <MenuItem value="issue">Issue/Problem</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoUpload;
