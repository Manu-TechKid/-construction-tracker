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
  CircularProgress,
  Divider,
} from '@mui/material';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Building name is required'),
  address: Yup.string().required('Address is required'),
  city: Yup.string().required('City is required'),
  serviceManager: Yup.string(),
  
  // Contact fields for automated email sending - Only General Manager required
  generalManagerName: Yup.string().required('General Manager name is required'),
  generalManagerEmail: Yup.string().email('Invalid email').required('General Manager email is required'),
  generalManagerPhone: Yup.string().required('General Manager phone is required'),
  
  // Maintenance Manager - Optional but if email provided, name and phone required
  maintenanceManagerName: Yup.string().when('maintenanceManagerEmail', {
    is: (email) => email && email.length > 0,
    then: (schema) => schema.required('Maintenance Manager name is required when email is provided'),
    otherwise: (schema) => schema
  }),
  maintenanceManagerEmail: Yup.string().email('Invalid email'),
  maintenanceManagerPhone: Yup.string().when('maintenanceManagerEmail', {
    is: (email) => email && email.length > 0,
    then: (schema) => schema.required('Maintenance Manager phone is required when email is provided'),
    otherwise: (schema) => schema
  }),
  
  // Third Contact - All optional
  thirdContactName: Yup.string(),
  thirdContactRole: Yup.string(),
  thirdContactEmail: Yup.string().email('Invalid email'),
  thirdContactPhone: Yup.string(),
});

const BuildingForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onCancel,
}) => {
  const initialValues = {
    name: '',
    address: '',
    city: '',
    serviceManager: '',
    
    // Contact fields
    generalManagerName: '',
    generalManagerEmail: '',
    generalManagerPhone: '',
    maintenanceManagerName: '',
    maintenanceManagerEmail: '',
    maintenanceManagerPhone: '',
    thirdContactName: '',
    thirdContactRole: '',
    thirdContactEmail: '',
    thirdContactPhone: '',
    
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

  return (
    <Box sx={{ maxWidth: '100%' }}>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Building Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="name"
                      name="name"
                      label="Building Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.name && Boolean(formik.errors.name)}
                      helperText={formik.touched.name && formik.errors.name}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="address"
                      name="address"
                      label="Address"
                      value={formik.values.address}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.address && Boolean(formik.errors.address)}
                      helperText={formik.touched.address && formik.errors.address}
                      variant="outlined"
                      margin="normal"
                      multiline
                      rows={3}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="city"
                      name="city"
                      label="City"
                      value={formik.values.city}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.city && Boolean(formik.errors.city)}
                      helperText={formik.touched.city && formik.errors.city}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="serviceManager"
                      name="serviceManager"
                      label="Service Manager Name (Optional)"
                      value={formik.values.serviceManager}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.serviceManager && Boolean(formik.errors.serviceManager)}
                      helperText="Leave empty if same as Maintenance Manager"
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Contact Information Card */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contact Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* General Manager */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  General Manager / Community Manager
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      id="generalManagerName"
                      name="generalManagerName"
                      label="Full Name *"
                      value={formik.values.generalManagerName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.generalManagerName && Boolean(formik.errors.generalManagerName)}
                      helperText={formik.touched.generalManagerName && formik.errors.generalManagerName}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      id="generalManagerEmail"
                      name="generalManagerEmail"
                      label="Email *"
                      type="email"
                      value={formik.values.generalManagerEmail}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.generalManagerEmail && Boolean(formik.errors.generalManagerEmail)}
                      helperText={formik.touched.generalManagerEmail && formik.errors.generalManagerEmail}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      id="generalManagerPhone"
                      name="generalManagerPhone"
                      label="Phone *"
                      value={formik.values.generalManagerPhone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.generalManagerPhone && Boolean(formik.errors.generalManagerPhone)}
                      helperText={formik.touched.generalManagerPhone && formik.errors.generalManagerPhone}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>

                {/* Maintenance Manager */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  Maintenance Manager
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      id="maintenanceManagerName"
                      name="maintenanceManagerName"
                      label="Full Name *"
                      value={formik.values.maintenanceManagerName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.maintenanceManagerName && Boolean(formik.errors.maintenanceManagerName)}
                      helperText={formik.touched.maintenanceManagerName && formik.errors.maintenanceManagerName}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      id="maintenanceManagerEmail"
                      name="maintenanceManagerEmail"
                      label="Email *"
                      type="email"
                      value={formik.values.maintenanceManagerEmail}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.maintenanceManagerEmail && Boolean(formik.errors.maintenanceManagerEmail)}
                      helperText={formik.touched.maintenanceManagerEmail && formik.errors.maintenanceManagerEmail}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      id="maintenanceManagerPhone"
                      name="maintenanceManagerPhone"
                      label="Phone *"
                      value={formik.values.maintenanceManagerPhone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.maintenanceManagerPhone && Boolean(formik.errors.maintenanceManagerPhone)}
                      helperText={formik.touched.maintenanceManagerPhone && formik.errors.maintenanceManagerPhone}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>

                {/* Third Contact (Optional) */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                  Additional Contact (Optional)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      id="thirdContactName"
                      name="thirdContactName"
                      label="Full Name"
                      value={formik.values.thirdContactName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.thirdContactName && Boolean(formik.errors.thirdContactName)}
                      helperText={formik.touched.thirdContactName && formik.errors.thirdContactName}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      id="thirdContactRole"
                      name="thirdContactRole"
                      label="Role/Title"
                      value={formik.values.thirdContactRole}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.thirdContactRole && Boolean(formik.errors.thirdContactRole)}
                      helperText={formik.touched.thirdContactRole && formik.errors.thirdContactRole}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      id="thirdContactEmail"
                      name="thirdContactEmail"
                      label="Email"
                      type="email"
                      value={formik.values.thirdContactEmail}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.thirdContactEmail && Boolean(formik.errors.thirdContactEmail)}
                      helperText={formik.touched.thirdContactEmail && formik.errors.thirdContactEmail}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      id="thirdContactPhone"
                      name="thirdContactPhone"
                      label="Phone"
                      value={formik.values.thirdContactPhone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.thirdContactPhone && Boolean(formik.errors.thirdContactPhone)}
                      helperText={formik.touched.thirdContactPhone && formik.errors.thirdContactPhone}
                      variant="outlined"
                      size="small"
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
                    disabled={formik.isSubmitting}
                    size="large"
                    sx={{
                      minHeight: { xs: 48, sm: 52 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      px: { xs: 2, sm: 3 }
                    }}
                  >
                    {formik.isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Building' : 'Create Building')}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    onClick={onCancel}
                    disabled={isSubmitting}
                    sx={{
                      minHeight: { xs: 48, sm: 52 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      px: { xs: 2, sm: 3 }
                    }}
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
  );
};

export default BuildingForm;
