import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  IconButton,
  Divider,
  CircularProgress,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  building: Yup.string().required('Building is required'),
  type: Yup.string().oneOf(['building', 'apartment']).default('building'),
  apartment: Yup.object().when('type', {
    is: 'apartment',
    then: (schema) => schema.shape({
      number: Yup.string().required('Apartment number is required'),
      _id: Yup.string().required('Apartment ID is required')
    }),
    otherwise: (schema) => schema.nullable()
  }),
  dueDate: Yup.date().required('Due date is required').min(new Date(), 'Due date must be in the future'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string().required('Priority is required'),
  category: Yup.string().required('Category is required'),
  notes: Yup.array(),
  photos: Yup.array(),
});

const ReminderForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onCancel,
}) => {
  // Get apartment and building from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const buildingId = searchParams.get('building');
  const apartmentId = searchParams.get('apartmentId');
  const reminderType = searchParams.get('type') || 'building';
  
  // Set initial values based on URL params if not provided
  const initialValues = {
    title: '',
    description: '',
    building: buildingId || '',
    type: reminderType,
    apartment: null,
    dueDate: null,
    priority: 'medium',
    category: 'maintenance',
    status: 'pending',
    notes: [],
    ...initialValuesProp
  };
  
  // If we have an apartment ID in the URL but not in initial values, try to find it
  const [apartmentData, setApartmentData] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  
  // Fetch buildings for the dropdown
  const { data: buildingsData } = useGetBuildingsQuery();
  
  useEffect(() => {
    if (apartmentId && buildingsData?.data?.buildings && !initialValues.apartment?._id) {
      const building = buildingsData.data.buildings.find(b => b._id === buildingId);
      if (building?.apartments) {
        const apartment = building.apartments.find(a => a._id === apartmentId);
        if (apartment) {
          setApartmentData({
            number: apartment.number,
            _id: apartment._id
          });
        }
      }
    }
  }, [apartmentId, buildingsData, buildingId]);
  const [photos, setPhotos] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      ...initialValues,
      // If we have apartment data from URL, use it
      ...(apartmentData && {
        apartment: apartmentData,
        type: 'apartment'
      })
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        // Create a proper JSON payload
        const payload = {
          title: values.title,
          description: values.description,
          building: values.building,
          type: values.type || 'building',
          dueDate: values.dueDate,
          priority: values.priority,
          category: values.category,
          status: values.status || 'pending',
          notes: values.notes || []
        };

        // Add apartment data if type is apartment
        if (values.type === 'apartment' && values.apartment) {
          payload.apartment = values.apartment;
        }
        
        console.log('Submitting reminder payload:', payload);
        await onSubmit(payload);
      } catch (error) {
        console.error('Form submission error:', error);
        setSubmitting(false);
        // Don't throw here, let the parent handle the error
      }
    },
  });

  // Handle photo upload
  const handlePhotoUpload = (event) => {
    const newPhotos = Array.from(event.target.files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  // Handle photo deletion
  const handlePhotoDelete = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  // Add a new note
  const handleAddNote = () => {
    if (noteText.trim()) {
      formik.setFieldValue('notes', [
        ...formik.values.notes,
        { text: noteText, createdAt: new Date() }
      ]);
      setNoteText('');
    }
  };

  // Remove a note
  const handleRemoveNote = (index) => {
    const newNotes = [...formik.values.notes];
    newNotes.splice(index, 1);
    formik.setFieldValue('notes', newNotes);
  };

  // Handle delete confirmation
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    onCancel(true); // Pass true to indicate deletion
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, [photos]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reminder Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                      <Typography component="legend" variant="subtitle2" gutterBottom>
                        Reminder Type
                      </Typography>
                      <Box display="flex" gap={2}>
                        <Button
                          variant={formik.values.type === 'building' ? 'contained' : 'outlined'}
                          onClick={() => {
                            formik.setFieldValue('type', 'building');
                            formik.setFieldValue('apartment', null);
                          }}
                          fullWidth
                        >
                          Building-wide
                        </Button>
                        <Button
                          variant={formik.values.type === 'apartment' ? 'contained' : 'outlined'}
                          onClick={() => formik.setFieldValue('type', 'apartment')}
                          fullWidth
                          disabled={!formik.values.building}
                        >
                          Apartment-specific
                        </Button>
                      </Box>
                    </FormControl>
                  </Grid>

                  {formik.values.type === 'apartment' && selectedBuilding?.apartments?.length > 0 && (
                    <Grid item xs={12}>
                      <FormControl fullWidth error={formik.touched.apartment && Boolean(formik.errors.apartment)}>
                        <InputLabel id="apartment-label">Apartment *</InputLabel>
                        <Select
                          labelId="apartment-label"
                          id="apartment"
                          name="apartment"
                          value={formik.values.apartment?._id || ''}
                          onChange={(e) => {
                            const apartmentId = e.target.value;
                            const selectedApartment = selectedBuilding.apartments.find(a => a._id === apartmentId);
                            formik.setFieldValue('apartment', {
                              _id: selectedApartment._id,
                              number: selectedApartment.number
                            });
                          }}
                          onBlur={formik.handleBlur}
                          label="Apartment *"
                          disabled={!!apartmentId} // Disable if apartment is set from URL
                        >
                          {selectedBuilding?.apartments?.map((apartment) => (
                            <MenuItem key={apartment._id} value={apartment._id}>
                              {apartment.number} {apartment.name ? `- ${apartment.name}` : ''}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {formik.touched.apartment && formik.errors.apartment}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Photos
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="photo-upload"
                        multiple
                        type="file"
                        onChange={handlePhotoUpload}
                      />
                      <label htmlFor="photo-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<PhotoCameraIcon />}
                          fullWidth
                          sx={{ mb: 2 }}
                        >
                          Upload Photos
                        </Button>
                      </label>
                    </Box>
                    
                    {photos.length > 0 && (
                      <Grid container spacing={2}>
                        {photos.map((photo, index) => (
                          <Grid item xs={6} sm={4} md={3} key={index}>
                            <Paper
                              sx={{
                                position: 'relative',
                                paddingTop: '100%',
                                overflow: 'hidden',
                                borderRadius: 1,
                              }}
                            >
                              <Box
                                component="img"
                                src={photo.preview}
                                alt={`Photo ${index + 1}`}
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
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                  },
                                }}
                                onClick={() => handlePhotoDelete(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="title"
                      name="title"
                      label="Title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      error={formik.touched.title && Boolean(formik.errors.title)}
                      helperText={formik.touched.title && formik.errors.title}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="description"
                      name="description"
                      label="Description"
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      variant="outlined"
                      margin="normal"
                      multiline
                      rows={4}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={formik.touched.building && Boolean(formik.errors.building)}>
                      <InputLabel id="building-label">Building *</InputLabel>
                      <Select
                        labelId="building-label"
                        id="building"
                        name="building"
                        value={formik.values.building}
                        onChange={(e) => {
                          formik.handleChange(e);
                          const selected = buildingsData?.data?.buildings?.find(b => b._id === e.target.value);
                          setSelectedBuilding(selected);
                          // Reset apartment when building changes
                          if (formik.values.type === 'apartment') {
                            formik.setFieldValue('apartment', null);
                          }
                        }}
                        onBlur={formik.handleBlur}
                        label="Building *"
                        disabled={!!buildingId} // Disable if building is set from URL
                      >
                        {buildingsData?.data?.buildings?.map((building) => (
                          <MenuItem key={building._id} value={building._id}>
                            {building.serviceManager ? `${building.name} - [${building.serviceManager}]` : building.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {formik.touched.building && formik.errors.building}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  
                  {/* Apartment field removed - handled by apartment selection above */}
                  
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Due Date"
                      value={formik.values.dueDate}
                      onChange={(date) => formik.setFieldValue('dueDate', date)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                          helperText={formik.touched.dueDate && formik.errors.dueDate}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth 
                      variant="outlined" 
                      margin="normal"
                      error={formik.touched.status && Boolean(formik.errors.status)}
                    >
                      <InputLabel id="status-label">Status</InputLabel>
                      <Select
                        labelId="status-label"
                        id="status"
                        name="status"
                        value={formik.values.status}
                        onChange={formik.handleChange}
                        label="Status"
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in-progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="overdue">Overdue</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth 
                      variant="outlined" 
                      margin="normal"
                      error={formik.touched.priority && Boolean(formik.errors.priority)}
                    >
                      <InputLabel id="priority-label">Priority</InputLabel>
                      <Select
                        labelId="priority-label"
                        id="priority"
                        name="priority"
                        value={formik.values.priority}
                        onChange={formik.handleChange}
                        label="Priority"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth 
                      variant="outlined" 
                      margin="normal"
                      error={formik.touched.category && Boolean(formik.errors.category)}
                    >
                      <InputLabel id="category-label">Category</InputLabel>
                      <Select
                        labelId="category-label"
                        id="category"
                        name="category"
                        value={formik.values.category}
                        onChange={formik.handleChange}
                        label="Category"
                      >
                        <MenuItem value="maintenance">Maintenance</MenuItem>
                        <MenuItem value="inspection">Inspection</MenuItem>
                        <MenuItem value="repair">Repair</MenuItem>
                        <MenuItem value="update">Update</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Notes Section */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Box display="flex" mb={2}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    margin="normal"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    sx={{ ml: 2, mt: 2 }}
                  >
                    Add
                  </Button>
                </Box>
                
                <List>
                  {formik.values.notes?.map((note, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            {note.createdBy?.name?.charAt(0) || 'U'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={note.text}
                          secondary={
                            <>
                              {new Date(note.createdAt).toLocaleString()}
                              {note.createdBy?.name && ` • ${note.createdBy.name}`}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveNote(index)}
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < formik.values.notes.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                  
                  {formik.values.notes?.length === 0 && (
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                      No notes added yet
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : null
                    }
                  >
                    {isSubmitting ? 'Saving...' : 'Save Reminder'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    onClick={() => onCancel(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  
                  {isEdit && (
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={handleDeleteClick}
                      disabled={isSubmitting}
                      startIcon={<DeleteIcon />}
                    >
                      Delete Reminder
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reminder Details
                </Typography>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Created: {new Date().toLocaleDateString()}
                  </Typography>
                  {isEdit && (
                    <Typography variant="body2" color="textSecondary">
                      Last Updated: {new Date().toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </form>
        
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Delete Reminder
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Are you sure you want to delete this reminder? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ReminderForm;
