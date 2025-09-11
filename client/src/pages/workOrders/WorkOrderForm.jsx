import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
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
  const { data: usersData } = useGetUsersQuery({ role: 'worker' });
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, { skip: !isEdit });

  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      workType: '',
      workSubType: '',
      priority: 'medium',
      assignedTo: [],
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Required'),
      description: Yup.string().required('Required'),
      building: Yup.string().required('Required'),
      workType: Yup.string().required('Required'),
      workSubType: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      if (isEdit) {
        await updateWorkOrder({ id, ...values });
      } else {
        await createWorkOrder(values);
      }
      navigate('/work-orders');
    },
  });

  useEffect(() => {
    if (isEdit && workOrderData) {
      formik.setValues(workOrderData.data);
    }
  }, [isEdit, workOrderData]);

  if (isLoadingWorkOrder) return <CircularProgress />;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>{isEdit ? 'Edit Work Order' : 'Create Work Order'}</Typography>
      <form onSubmit={formik.handleSubmit}>
        <Card>
          <CardContent>
            <Grid container spacing={3}>
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
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  multiline
                  rows={4}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    id="building"
                    name="building"
                    value={formik.values.building}
                    onChange={formik.handleChange}
                  >
                    {buildingsData?.data?.buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>{building.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Work Type</InputLabel>
                  <Select
                    id="workType"
                    name="workType"
                    value={formik.values.workType}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="repair">Repair</MenuItem>
                    <MenuItem value="installation">Installation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="workSubType"
                  name="workSubType"
                  label="Work Sub-Type"
                  value={formik.values.workSubType}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    id="priority"
                    name="priority"
                    value={formik.values.priority}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assign To</InputLabel>
                  <Select
                    multiple
                    id="assignedTo"
                    name="assignedTo"
                    value={formik.values.assignedTo}
                    onChange={formik.handleChange}
                  >
                    {usersData?.data?.users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>{user.firstName} {user.lastName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Box mt={2}>
          <Button variant="contained" color="primary" type="submit" disabled={isCreating || isUpdating}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default WorkOrderForm;
