import React, { useState } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const validationSchema = Yup.object().shape({
  building: Yup.string().required('Building is required'),
  apartmentNumber: Yup.string().required('Apartment number is required'),
  block: Yup.string().required('Block is required'),
  workType: Yup.string().required('Work type is required'),
  description: Yup.string().required('Description is required'),
  priority: Yup.string().required('Priority is required'),
  startDate: Yup.date().required('Start date is required'),
});

const WorkOrderForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onCancel,
}) => {
  const { data: buildingsData } = useGetBuildingsQuery();

  const initialValues = {
    building: '',
    apartmentNumber: '',
    block: '',
    workType: 'repair',
    description: '',
    priority: 'medium',
    startDate: new Date(),
    status: 'pending',
    ...initialValuesProp
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitting(true);
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const workTypes = [
    { value: 'painting', label: 'Painting' },
    { value: 'repair', label: 'Repair' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'other', label: 'Other' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: '100%' }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Work Order Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={formik.touched.building && Boolean(formik.errors.building)}>
                        <InputLabel id="building-label">Building *</InputLabel>
                        <Select
                          labelId="building-label"
                          id="building"
                          name="building"
                          value={formik.values.building}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Building *"
                        >
                          <MenuItem value="">
                            <em>Select a building</em>
                          </MenuItem>
                          {buildingsData?.data?.buildings?.map((building) => (
                            <MenuItem key={building._id} value={building._id}>
                              {building.name}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {formik.touched.building && formik.errors.building}
                        </FormHelperText>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        id="apartmentNumber"
                        name="apartmentNumber"
                        label="Apartment Number"
                        value={formik.values.apartmentNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                        helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                        variant="outlined"
                        margin="normal"
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        id="block"
                        name="block"
                        label="Block"
                        value={formik.values.block}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.block && Boolean(formik.errors.block)}
                        helperText={formik.touched.block && formik.errors.block}
                        variant="outlined"
                        margin="normal"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={formik.touched.workType && Boolean(formik.errors.workType)}>
                        <InputLabel id="workType-label">Work Type *</InputLabel>
                        <Select
                          labelId="workType-label"
                          id="workType"
                          name="workType"
                          value={formik.values.workType}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Work Type *"
                        >
                          {workTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {formik.touched.workType && formik.errors.workType}
                        </FormHelperText>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth error={formik.touched.priority && Boolean(formik.errors.priority)}>
                        <InputLabel id="priority-label">Priority *</InputLabel>
                        <Select
                          labelId="priority-label"
                          id="priority"
                          name="priority"
                          value={formik.values.priority}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Priority *"
                        >
                          {priorities.map((priority) => (
                            <MenuItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {formik.touched.priority && formik.errors.priority}
                        </FormHelperText>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <DatePicker
                        label="Start Date"
                        value={formik.values.startDate}
                        onChange={(date) => formik.setFieldValue('startDate', date)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            margin="normal"
                            error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                            helperText={formik.touched.startDate && formik.errors.startDate}
                          />
                        )}
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
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}
                        variant="outlined"
                        margin="normal"
                        multiline
                        rows={4}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Card>
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
                      {isSubmitting ? 'Saving...' : isEdit ? 'Update Work Order' : 'Create Work Order'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;
