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
        // Format the data correctly for the backend
        const formattedValues = {
          ...values,
          // Ensure apartmentNumber is mapped correctly
          apartmentNumber: values.apartmentNumber || values.apartment,
          // Ensure scheduledDate is properly formatted
          scheduledDate: values.scheduledDate instanceof Date ? values.scheduledDate.toISOString() : values.scheduledDate,
        };

        let workOrderId = id;
        if (isEdit) {
          await updateWorkOrder({ id, ...formattedValues }).unwrap();
        } else {
          const newWorkOrder = await createWorkOrder(formattedValues).unwrap();
          workOrderId = newWorkOrder.data._id;
        }

        // Upload photos asynchronously after navigation to improve perceived performance
        if (newPhotos.length > 0) {
          try {
            // Upload photos in background
            const uploadPromises = newPhotos.map(photo => 
              uploadPhoto({ workOrderId, photo }).unwrap()
                .catch(error => {
                  console.error('Photo upload failed:', { photoName: photo.name, error });
                  // Return null for failed uploads to continue with other photos
                  return null;
                })
            );

            // Track successful and failed uploads
            const results = await Promise.all(uploadPromises);
            const successfulUploads = results.filter(Boolean).length;
            const failedUploads = newPhotos.length - successfulUploads;

            // Show appropriate toast message
            if (successfulUploads > 0 && failedUploads === 0) {
              toast.success(`Successfully uploaded ${successfulUploads} photo(s)`, {
                position: "top-right",
                autoClose: 3000,
              });
            } else if (failedUploads > 0) {
              toast.warning(
                `Uploaded ${successfulUploads} photo(s), failed to upload ${failedUploads} photo(s)`,
                {
                  position: "top-right",
                  autoClose: 5000,
                }
              );
            }
          } catch (error) {
            console.error('Error during photo uploads:', error);
            toast.error('Error uploading some photos. Please try again later.', {
              position: "top-right",
              autoClose: 4000,
            });
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

  const handlePhotoChange = (e) => {
    if (e.target.files) {
      setNewPhotos([...newPhotos, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveNewPhoto = (index) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
  };

  const handleRemoveExistingPhoto = async (photoId) => {
    await deletePhoto({ workOrderId: id, photoId });
    setExistingPhotos(existingPhotos.filter(p => p._id !== photoId));
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
                <Button variant="contained" component="label">
                  Upload Photos
                  <input type="file" hidden multiple onChange={handlePhotoChange} accept="image/*" />
                </Button>
                <Box mt={2} display="flex" flexWrap="wrap" gap={2}>
                  {existingPhotos.map((photo) => (
                    <Box key={photo._id} position="relative">
                      <img src={photo.url} alt="existing" width="100" height="100" style={{ objectFit: 'cover' }} />
                      <Button size="small" onClick={() => handleRemoveExistingPhoto(photo._id)} sx={{ position: 'absolute', top: 0, right: 0 }}>X</Button>
                    </Box>
                  ))}
                  {newPhotos.map((photo, index) => (
                    <Box key={index} position="relative">
                      <img src={URL.createObjectURL(photo)} alt="preview" width="100" height="100" style={{ objectFit: 'cover' }} />
                      <Button size="small" onClick={() => handleRemoveNewPhoto(index)} sx={{ position: 'absolute', top: 0, right: 0 }}>X</Button>
                    </Box>
                  ))}
                </Box>
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
