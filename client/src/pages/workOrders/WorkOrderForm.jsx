import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useGetBuildingsQuery, useGetBuildingQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useUploadPhotoMutation, useDeletePhotoMutation } from '../../features/uploads/uploadsApiSlice';
import { getPhotoUrl, validatePhotoFile } from '../../utils/photoUtils';
import {
  useCreateWorkOrderMutation,
  useGetWorkOrderQuery,
  useUpdateWorkOrderMutation,
} from '../../features/workOrders/workOrdersApiSlice';

const workSubTypes = {
  maintenance: ['General Maintenance', 'Preventive Maintenance', 'Inspection'],
  repair: ['Plumbing', 'Electrical', 'Structural', 'Appliance'],
  installation: ['New Appliance', 'Fixture Installation', 'System Upgrade'],
};

const WorkOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      block: '',
      apartmentNumber: '',
      workType: '',
      workSubType: '',
      priority: 'medium',
      assignedTo: [],
      estimatedCost: 0,
      actualCost: 0,
      scheduledDate: new Date(),
      status: 'pending',
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Required'),
      description: Yup.string().required('Required'),
      building: Yup.string().required('Required'),
      workType: Yup.string().required('Required'),
      workSubType: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      try {
        const workOrderData = {
          ...values,
          scheduledDate: new Date(values.scheduledDate).toISOString(),
        };

        let workOrderId;
        if (isEdit) {
          const result = await updateWorkOrder({ id, ...workOrderData }).unwrap();
          workOrderId = id;
        } else {
          const result = await createWorkOrder(workOrderData).unwrap();
          workOrderId = result.data._id;
        }
        
        // Upload new photos after work order is created/updated
        if (newPhotos.length > 0) {
          toast.info(`Uploading ${newPhotos.length} photo(s)...`, { autoClose: false, toastId: 'upload-progress' });
          
          try {
            const uploadPromises = newPhotos.map(photo => {
              const formData = new FormData();
              formData.append('photo', photo);
              return uploadPhoto({ workOrderId, photo }).unwrap();
            });
            
            const results = await Promise.all(uploadPromises);
            toast.dismiss('upload-progress');
            toast.success(`Successfully uploaded ${results.length} photo(s)`);
            
            // Add the new photos to existing photos
            const uploadedPhotos = results.map(result => result.data);
            setExistingPhotos(prev => [...prev, ...uploadedPhotos]);
            setNewPhotos([]);
            
          } catch (error) {
            console.error('Error uploading photos:', error);
            toast.dismiss('upload-progress');
            toast.error('Work order saved, but some photos failed to upload');
          }
        }

        // Show success message and redirect immediately
        const message = isEdit ? 'Work order updated successfully!' : 'Work order created successfully!';
        toast.success(message, {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
        });
        
        // Immediate navigation without delay
        navigate('/work-orders', { replace: true });
      } catch (error) {
        console.error('Failed to save work order:', error);
        toast.error('Failed to save work order. Please try again.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    },
  });

  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery({ role: 'worker' });
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, { skip: !isEdit });
  const { data: selectedBuildingData } = useGetBuildingQuery(formik.values.building, { skip: !formik.values.building });

  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const [uploadPhoto, { isLoading: isUploading }] = useUploadPhotoMutation();
  const [deletePhoto] = useDeletePhotoMutation();

  const handlePhotoChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const validFiles = [];
    const invalidFiles = [];
    
    // Validate each file
    files.forEach(file => {
      const validation = validatePhotoFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, error: validation.error });
      }
    });
    
    // Show toast for invalid files
    if (invalidFiles.length > 0) {
      const errorMessage = `Couldn't upload ${invalidFiles.length} file(s). ${invalidFiles[0].error}`;
      toast.error(errorMessage, { autoClose: 5000 });
    }
    
    // Add valid files to the new photos
    if (validFiles.length > 0) {
      setNewPhotos(prev => [...prev, ...validFiles]);
    }
    
    // Reset file input
    e.target.value = null;
  };

  const handleRemoveNewPhoto = (index) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    toast.info('Photo removed from upload queue');
  };
  
  const handleRemoveExistingPhoto = async (photoId) => {
    try {
      await deletePhoto({ workOrderId: id, photoId });
      setExistingPhotos(existingPhotos.filter(p => p._id !== photoId));
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('Failed to remove photo. Please try again.');
    }
  };

  useEffect(() => {
    if (isEdit && workOrderData?.data) {
      // Exclude fields that are not part of the form to avoid warnings
      const { _id, __v, createdAt, updatedAt, ...formData } = workOrderData.data;
      
      // Ensure all form fields have proper values
      const safeFormData = {
        title: formData.title || '',
        description: formData.description || '',
        building: formData.building?._id || formData.building || '',
        block: formData.block || '',
        apartmentNumber: formData.apartmentNumber || '',
        workType: formData.workType || '',
        workSubType: formData.workSubType || '',
        priority: formData.priority || 'medium',
        assignedTo: formData.assignedTo?.map(a => a.worker?._id || a.worker) || [],
        estimatedCost: formData.estimatedCost || 0,
        actualCost: formData.actualCost || 0,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : new Date(),
        status: formData.status || 'pending'
      };
      
      formik.setValues(safeFormData);

      if (workOrderData.data.photos) {
        setExistingPhotos(workOrderData.data.photos);
      }
    }
  }, [isEdit, workOrderData]);

  if (isLoadingWorkOrder || isLoadingBuildings || isLoadingUsers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{isEdit ? 'Edit Work Order' : 'Create Work Order'}</Typography>
        <Button variant="outlined" onClick={() => navigate('/work-orders')}>
          Back to Work Orders
        </Button>
      </Box>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Work Order Details" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField fullWidth id="title" name="title" label="Title" value={formik.values.title} onChange={formik.handleChange} error={formik.touched.title && Boolean(formik.errors.title)} helperText={formik.touched.title && formik.errors.title} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth id="description" name="description" label="Description" multiline rows={4} value={formik.values.description} onChange={formik.handleChange} error={formik.touched.description && Boolean(formik.errors.description)} helperText={formik.touched.description && formik.errors.description} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Location & Type" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Building</InputLabel>
                      <Select id="building" name="building" value={formik.values.building} onChange={formik.handleChange}>
                        {buildingsData?.data?.buildings?.map((building) => (
                          <MenuItem key={building._id} value={building._id}>
                            {building.serviceManager ? `${building.name} - [${building.serviceManager}]` : building.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth disabled={!formik.values.building}>
                      <InputLabel>Block</InputLabel>
                      <Select id="block" name="block" value={formik.values.block} onChange={formik.handleChange}>
                        {[...new Set(selectedBuildingData?.data?.apartments?.map(a => a.block) ?? [])].map((block) => (
                          <MenuItem key={block} value={block}>{block}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth disabled={!formik.values.block}>
                      <InputLabel>Apartment</InputLabel>
                      <Select id="apartmentNumber" name="apartmentNumber" value={formik.values.apartmentNumber} onChange={formik.handleChange}>
                        {selectedBuildingData?.data?.apartments?.filter(a => a.block === formik.values.block)?.map((apartment) => (
                            <MenuItem key={apartment._id} value={apartment.number}>
                              {apartment.number}
                            </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Work Type</InputLabel>
                      <Select id="workType" name="workType" value={formik.values.workType} onChange={formik.handleChange}>
                        <MenuItem value="maintenance">Maintenance</MenuItem>
                        <MenuItem value="repair">Repair</MenuItem>
                        <MenuItem value="installation">Installation</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!formik.values.workType}>
                      <InputLabel>Work Sub-Type</InputLabel>
                      <Select id="workSubType" name="workSubType" value={formik.values.workSubType} onChange={formik.handleChange}>
                        {formik.values.workType && workSubTypes[formik.values.workType]?.map(subType => (
                          <MenuItem key={subType} value={subType}>{subType}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Photos" />
              <Divider />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={isCreating || isUpdating}
                  >
                    Upload Photos
                    <input 
                      type="file" 
                      hidden 
                      multiple 
                      onChange={handlePhotoChange} 
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                  </Button>
                  {newPhotos.length > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      {newPhotos.length} photo(s) ready to upload
                    </Typography>
                  )}
                </Box>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {existingPhotos.map((photo) => {
                    const photoUrl = getPhotoUrl(photo);
                    return (
                      <Grid item key={photo._id} xs={6} sm={4} md={3}>
                        <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                          <Box
                            component="img"
                            src={photoUrl || '/img/placeholder.jpg'}
                            alt="Work order"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid #e0e0e0',
                              '&:hover': {
                                cursor: 'pointer',
                                opacity: 0.9,
                              }
                            }}
                            onError={(e) => {
                              console.error('Error loading image:', photo.url);
                              e.target.src = '/img/placeholder.jpg';
                            }}
                            onClick={() => {
                              // TODO: Open photo in lightbox/modal
                              console.log('View photo:', photo._id);
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveExistingPhoto(photo._id);
                            }}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              '&:hover': {
                                backgroundColor: '#fff',
                              },
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </Box>
                      </Grid>
                    );
                  })}
                  
                  {newPhotos.map((photo, index) => (
                    <Grid item key={`new-${index}`} xs={6} sm={4} md={3}>
                      <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                        <Box
                          component="img"
                          src={URL.createObjectURL(photo)}
                          alt="New upload preview"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px dashed #1976d2',
                            opacity: 0.9,
                            '&:hover': {
                              opacity: 1,
                            }
                          }}
                        />
                        <Chip
                          label="New"
                          size="small"
                          color="primary"
                          sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            fontSize: '0.6rem',
                            height: 20,
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(25, 118, 210, 0.9)',
                            color: '#fff',
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveNewPhoto(index);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              backgroundColor: '#fff',
                            },
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                  
                  <Grid item xs={6} sm={4} md={3}>
                    <Button
                      component="label"
                      variant="outlined"
                      sx={{
                        width: '100%',
                        height: '100%',
                        minHeight: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        borderStyle: 'dashed',
                        '&:hover': {
                          borderStyle: 'dashed',
                          backgroundColor: 'rgba(25, 118, 210, 0.04)'
                        }
                      }}
                      disabled={isCreating || isUpdating}
                    >
                      <CloudUploadIcon />
                      <Typography variant="caption" textAlign="center">
                        {newPhotos.length > 0 ? 'Add More' : 'Add Photos'}
                      </Typography>
                      <input 
                        type="file" 
                        hidden 
                        multiple 
                        onChange={handlePhotoChange} 
                        accept="image/jpeg,image/png,image/gif,image/webp"
                      />
                    </Button>
                  </Grid>
                </Grid>
                
                {newPhotos.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`${newPhotos.length} photo(s) ready to upload`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Button 
                      size="small" 
                      onClick={() => setNewPhotos([])}
                      disabled={isCreating || isUpdating}
                    >
                      Clear All
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Assignment & Priority" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Scheduled Date"
                        value={formik.values.scheduledDate}
                        onChange={(newValue) => formik.setFieldValue('scheduledDate', newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select id="priority" name="priority" value={formik.values.priority} onChange={formik.handleChange}>
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="urgent">Urgent</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select id="status" name="status" value={formik.values.status} onChange={formik.handleChange}>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="on_hold">On Hold</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth id="estimatedCost" name="estimatedCost" label="Estimated Cost" type="number" value={formik.values.estimatedCost} onChange={formik.handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth id="actualCost" name="actualCost" label="Actual Cost" type="number" value={formik.values.actualCost} onChange={formik.handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Assign To</InputLabel>
                      <Select multiple id="assignedTo" name="assignedTo" value={formik.values.assignedTo} onChange={formik.handleChange}>
                        {usersData?.data?.users?.map((user) => (
                            <MenuItem key={user._id} value={user._id}>{user.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" type="submit" disabled={isCreating || isUpdating}>
            {isCreating || isUpdating ? <CircularProgress size={24} /> : (isEdit ? 'Save Changes' : 'Create Work Order')}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default WorkOrderForm;
