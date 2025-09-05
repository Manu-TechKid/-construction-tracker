import React from 'react';
import { Box, Button, Grid, Typography, IconButton } from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';

const PhotoUploadSection = ({ photos = [], onUpload, onDelete, maxPhotos = 10 }) => {
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > maxPhotos) {
      alert(`You can only upload up to ${maxPhotos} photos`);
      return;
    }
    onUpload(files);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Photos
      </Typography>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="photo-upload"
        type="file"
        multiple
        onChange={handleFileChange}
      />
      <label htmlFor="photo-upload">
        <Button
          variant="outlined"
          component="span"
          startIcon={<PhotoCamera />}
          disabled={photos.length >= maxPhotos}
        >
          Upload Photos
        </Button>
      </label>
      <Typography variant="caption" display="block" sx={{ mt: 1, mb: 2 }}>
        {photos.length}/{maxPhotos} photos uploaded
      </Typography>
      
      <Grid container spacing={2}>
        {photos.map((photo, index) => (
          <Grid item key={index} xs={6} sm={4} md={3}>
            <Box
              sx={{
                position: 'relative',
                paddingTop: '100%',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                component="img"
                src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                alt={`Work order photo ${index + 1}`}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <IconButton
                size="small"
                onClick={() => onDelete(index)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PhotoUploadSection;
