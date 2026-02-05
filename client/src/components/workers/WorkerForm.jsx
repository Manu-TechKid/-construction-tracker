import React from 'react';
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
  Chip,
  OutlinedInput,
} from '@mui/material';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string().required('Phone is required'),
  password: Yup.string(),
  workerProfile: Yup.object().shape({
    skills: Yup.array().min(1, 'At least one skill is required'),
    paymentType: Yup.string().oneOf(['hourly', 'contract']),
    hourlyRate: Yup.number().min(0, 'Rate must be positive'),
    contractRate: Yup.number().min(0, 'Rate must be positive'),
    status: Yup.string().oneOf(['active', 'inactive', 'on_leave']),
    notes: Yup.string(),
  }),
});

const WorkerForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  isEdit = false,
  onCancel,
}) => {
  const initialValues = {
    name: '',
    email: '',
    phone: '',
    password: '',
    workerProfile: {
      skills: [],
      paymentType: 'hourly',
      hourlyRate: 0,
      contractRate: 0,
      status: 'active',
      notes: '',
    },
    ...initialValuesProp
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
        setSubmitting(false);
      } catch (error) {
        console.error('Form submission error:', error);
        setSubmitting(false);
      }
    },
  });

  const availableSkills = [
    'painting',
    'carpentry',
    'electrical',
    'plumbing',
    'cleaning',
    'general_labor'
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_leave', label: 'On Leave' },
  ];

  return (
    <Box sx={{ maxWidth: '100%' }}>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Worker Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="name"
                      name="name"
                      label="Full Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.name && Boolean(formik.errors.name)}
                      helperText={formik.touched.name && formik.errors.name}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="email"
                      name="email"
                      label="Email"
                      type="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.email && Boolean(formik.errors.email)}
                      helperText={formik.touched.email && formik.errors.email}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.phone && Boolean(formik.errors.phone)}
                      helperText={formik.touched.phone && formik.errors.phone}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="password"
                      name="password"
                      label={isEdit ? 'New Password (optional)' : 'Password'}
                      type="password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.password && Boolean(formik.errors.password)}
                      helperText={formik.touched.password && formik.errors.password}
                      variant="outlined"
                      margin="normal"
                      required={!isEdit}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="workerProfile.hourlyRate"
                      name="workerProfile.hourlyRate"
                      label="Hourly Rate ($)"
                      type="number"
                      value={formik.values.workerProfile.hourlyRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.workerProfile?.hourlyRate && Boolean(formik.errors.workerProfile?.hourlyRate)}
                      helperText={formik.touched.workerProfile?.hourlyRate && formik.errors.workerProfile?.hourlyRate}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="workerProfile.contractRate"
                      name="workerProfile.contractRate"
                      label="Contract Rate ($)"
                      type="number"
                      value={formik.values.workerProfile.contractRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.workerProfile?.contractRate && Boolean(formik.errors.workerProfile?.contractRate)}
                      helperText={formik.touched.workerProfile?.contractRate && formik.errors.workerProfile?.contractRate}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={formik.touched.workerProfile?.skills && Boolean(formik.errors.workerProfile?.skills)}>
                      <InputLabel id="skills-label">Skills</InputLabel>
                      <Select
                        labelId="skills-label"
                        id="skills"
                        name="workerProfile.skills"
                        multiple
                        value={formik.values.workerProfile.skills}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        input={<OutlinedInput label="Skills" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {availableSkills.map((skill) => (
                          <MenuItem key={skill} value={skill}>
                            {skill}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {formik.touched.workerProfile?.skills && formik.errors.workerProfile?.skills}
                      </FormHelperText>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={formik.touched.workerProfile?.status && Boolean(formik.errors.workerProfile?.status)}>
                      <InputLabel id="status-label">Status</InputLabel>
                      <Select
                        labelId="status-label"
                        id="status"
                        name="workerProfile.status"
                        value={formik.values.workerProfile.status}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        label="Status"
                      >
                        {statusOptions.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {formik.touched.workerProfile?.status && formik.errors.workerProfile?.status}
                      </FormHelperText>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="workerProfile.notes"
                      name="workerProfile.notes"
                      label="Notes"
                      value={formik.values.workerProfile.notes}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.workerProfile?.notes && Boolean(formik.errors.workerProfile?.notes)}
                      helperText={formik.touched.workerProfile?.notes && formik.errors.workerProfile?.notes}
                      variant="outlined"
                      margin="normal"
                      multiline
                      rows={3}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
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
                    {isSubmitting ? 'Saving...' : isEdit ? 'Update Worker' : 'Add Worker'}
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
  );
};

export default WorkerForm;
