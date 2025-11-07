import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useBuildingContext } from '../../contexts/BuildingContext';

const PhotoUploadDialog = ({ open, onClose, onUploadSuccess }) => {
  const { user } = useAuth();
  const { selectedBuilding } = useBuildingContext();
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [workType, setWorkType] = useState('other');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length + selectedFiles.length > 10) {
      toast.error('Maximum 10 photos allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 10MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles([...selectedFiles, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    if (!selectedBuilding) {
      toast.error('Please select a building first');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append('photos', file);
      });

      formData.append('workerId', user.id);
      formData.append('buildingId', selectedBuilding._id);
      formData.append('title', title || 'Work Progress Photo');
      formData.append('description', description);
      formData.append('notes', notes);
      formData.append('workType', workType);
      if (apartmentNumber) {
        formData.append('apartmentNumber', apartmentNumber);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/work-photos/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Photos uploaded successfully!');
        handleClose();
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setTitle('');
    setDescription('');
    setNotes('');
    setWorkType('other');
    setApartmentNumber('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Upload Work Photos
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* File Upload Button */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="photo-upload-input"
              multiple
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="photo-upload-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ bgcolor: '#00838f', '&:hover': { bgcolor: '#006064' } }}
              >
                Select Photos (Max 10)
              </Button>
            </label>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {selectedFiles.length} photo(s) selected
            </Typography>
          </Box>

          {/* Photo Previews */}
          {previews.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {previews.map((preview, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="150"
                      image={preview}
                      alt={`Preview ${index + 1}`}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardActions>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Photo Details Form */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Apartment 2B - Painting Complete"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Work Type</InputLabel>
                <Select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  label="Work Type"
                >
                  <MenuItem value="painting">Painting</MenuItem>
                  <MenuItem value="cleaning">Cleaning</MenuItem>
                  <MenuItem value="repair">Repair</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="inspection">Inspection</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apartment Number"
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
                placeholder="e.g., 2B, 101, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the work..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, issues, or observations..."
              />
            </Grid>

            {selectedBuilding && (
              <Grid item xs={12}>
                <Chip
                  label={`Building: ${selectedBuilding.name}`}
                  color="primary"
                  variant="outlined"
                />
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
        >
          {uploading ? <CircularProgress size={24} /> : `Upload ${selectedFiles.length} Photo(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PhotoUploadDialog;
