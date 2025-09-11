import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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

const WorkOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, { skip: !isEdit });
  const { data: selectedBuildingData } = useGetBuildingQuery(formik.values.building, { skip: !formik.values.building });

  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const [uploadPhoto, { isLoading: isUploading }] = useUploadPhotoMutation();
  const [deletePhoto] = useDeletePhotoMutation();
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);

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
        let workOrderId = id;
        if (isEdit) {
          await updateWorkOrder({ id, ...values }).unwrap();
        } else {
          const newWorkOrder = await createWorkOrder(values).unwrap();
          workOrderId = newWorkOrder.data._id;
        }

        if (newPhotos.length > 0) {
          for (const photo of newPhotos) {
            await uploadPhoto({ workOrderId, photo }).unwrap();
          }
        }

        navigate('/work-orders');
      } catch (error) {
        console.error('Failed to save work order:', error);
      }
    },
  });

  useEffect(() => {
    if (isEdit && workOrderData) {
      formik.setValues(workOrderData.data);
      if (workOrderData.data.photos) {
        setExistingPhotos(workOrderData.data.photos);
      }
    }
  }, [isEdit, workOrderData, formik]);

  if (isLoadingWorkOrder) return <CircularProgress />;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>{isEdit ? 'Edit Work Order' : 'Create Work Order'}</Typography>
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
                        {buildingsData?.data?.buildings.map((building) => (
                          <MenuItem key={building._id} value={building._id}>{building.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth disabled={!formik.values.building}>
                      <InputLabel>Block</InputLabel>
                      <Select id="block" name="block" value={formik.values.block} onChange={formik.handleChange}>
                        {[...new Set(selectedBuildingData?.data?.apartments.map(a => a.block))].map((block) => (
                          <MenuItem key={block} value={block}>{block}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth disabled={!formik.values.block}>
                      <InputLabel>Apartment</InputLabel>
                      <Select id="apartmentNumber" name="apartmentNumber" value={formik.values.apartmentNumber} onChange={formik.handleChange}>
                        {selectedBuildingData?.data?.apartments
                          .filter(a => a.block === formik.values.block)
                          .map((apartment) => (
                            <MenuItem key={apartment._id} value={apartment.apartmentNumber}>
                              {apartment.apartmentNumber}
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
                    <TextField fullWidth id="workSubType" name="workSubType" label="Work Sub-Type" value={formik.values.workSubType} onChange={formik.handleChange} />
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
                    <TextField fullWidth id="estimatedCost" name="estimatedCost" label="Estimated Cost" type="number" value={formik.values.estimatedCost} onChange={formik.handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth id="actualCost" name="actualCost" label="Actual Cost" type="number" value={formik.values.actualCost} onChange={formik.handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Assign To</InputLabel>
                      <Select multiple id="assignedTo" name="assignedTo" value={formik.values.assignedTo} onChange={formik.handleChange}>
                        {usersData?.data?.users
                          .filter(user => user.role === 'worker')
                          .map((user) => (
                            <MenuItem key={user._id} value={user._id}>{user.firstName} {user.lastName}</MenuItem>
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
