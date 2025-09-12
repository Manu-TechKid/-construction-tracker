import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Breadcrumbs,
  Link,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  Apartment as BuildingIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useCreateBuildingMutation, useUpdateBuildingMutation, useGetBuildingQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/dateUtils';

// Form validation schema
const validationSchema = Yup.object({
  name: Yup.string().required('Building name is required'),
  address: Yup.string().required('Address is required'),
  city: Yup.string().required('City is required'),
  administrator: Yup.string().required('Service Manager is required'),
  status: Yup.string().required('Status is required'),
  description: Yup.string(),
  yearBuilt: Yup.number().min(1800, 'Invalid year').max(new Date().getFullYear(), 'Year cannot be in the future'),
  floors: Yup.number().min(1, 'Must be at least 1').max(200, 'Must be 200 or less'),
  totalUnits: Yup.number().min(1, 'Must be at least 1'),
  amenities: Yup.array().of(Yup.string()),
});

const BuildingForm = ({ isEdit = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // API hooks
  const [createBuilding, { isLoading: isCreating }] = useCreateBuildingMutation();
  const [updateBuilding, { isLoading: isUpdating }] = useUpdateBuildingMutation();
  
  // Fetch building data if in edit mode
  const { data: buildingData, isLoading: isLoadingBuilding } = useGetBuildingQuery(id, {
    skip: !isEdit,
  });
  
  const building = buildingData?.data || {};
  const isLoading = isCreating || isUpdating || (isEdit && isLoadingBuilding);
  
  // Get users for administrator dropdown
  const { data: usersData } = useGetUsersQuery();
  const users = usersData?.data?.users || [];
  
  // Formik form
  const formik = useFormik({
    initialValues: {
      name: '',
      address: '',
      city: '',
      administrator: '',
      administratorName: '',
      status: 'active',
      description: '',
      yearBuilt: new Date().getFullYear(),
      floors: 1,
      totalUnits: 1,
      amenities: [],
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        if (isEdit) {
          await updateBuilding({ id, ...values }).unwrap();
        } else {
          await createBuilding(values).unwrap();
        }
        navigate(isEdit ? `/buildings/${id}` : '/buildings');
      } catch (error) {
        console.error('Error saving building:', error);
        // Handle API validation errors
        if (error.data?.errors) {
          error.data.errors.forEach((err) => {
            setFieldError(err.param, err.msg);
          });
        } else {
          setFieldError('submit', error.data?.message || 'Failed to save building');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });
  
  // Set initial values when building data is loaded
  useEffect(() => {
    if (isEdit && building && Object.keys(building).length > 0) {
      formik.setValues({
        name: building.name || '',
        address: building.address || '',
        city: building.city || '',
        administrator: building.administrator?._id || building.administrator || '',
        administratorName: building.administrator?.name || building.administratorName || '',
        status: building.status || 'active',
        description: building.description || '',
        yearBuilt: building.yearBuilt || new Date().getFullYear(),
        floors: building.floors || 1,
        totalUnits: building.totalUnits || 1,
        amenities: building.amenities || [],
      });
    }
  }, [building, isEdit]);
  
  // Available status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'inactive', label: 'Inactive' },
  ];
  
  // Available amenity options
  const amenityOptions = [
    'Parking',
    'Elevator',
    'Security',
    'Gym',
    'Pool',
    'Laundry',
    'Storage',
    'Bike Storage',
    'Roof Deck',
    'Lounge',
  ];
  
  // Handle cancel
  const handleCancel = () => {
    if (isEdit) {
      navigate(`/buildings/${id}`);
    } else {
      navigate('/buildings');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 1 }}
        >
          Back
        </Button>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/buildings" color="inherit">
            Buildings
          </Link>
          <Typography color="text.primary">
            {isEdit ? `Edit ${building.name || 'Building'}` : 'Add New Building'}
          </Typography>
        </Breadcrumbs>
        
        <Card variant="outlined">
          <CardHeader
            title={
              <Box display="flex" alignItems="center">
                <BuildingIcon sx={{ mr: 1 }} />
                <Typography variant="h5" component="h1">
                  {isEdit ? `Edit ${building.name || 'Building'}` : 'Add New Building'}
                </Typography>
              </Box>
            }
            titleTypographyProps={{ variant: 'h5' }}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          />
          
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={3}>
                {/* Left Column - Basic Info */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <InfoIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Basic Information</Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    
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
                          disabled={isLoading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <BuildingIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          id="address"
                          name="address"
                          label="Address"
                          multiline
                          rows={2}
                          value={formik.values.address}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.address && Boolean(formik.errors.address)}
                          helperText={formik.touched.address && formik.errors.address}
                          disabled={isLoading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LocationIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
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
                          disabled={isLoading}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.administrator && Boolean(formik.errors.administrator)}
                        >
                          <InputLabel id="administrator-label">Service Manager *</InputLabel>
                          <Select
                            labelId="administrator-label"
                            id="administrator"
                            name="administrator"
                            value={formik.values.administrator}
                            onChange={(e) => {
                              const selectedUser = users.find(user => user._id === e.target.value);
                              formik.setFieldValue('administrator', e.target.value);
                              formik.setFieldValue('administratorName', selectedUser?.name || '');
                            }}
                            onBlur={formik.handleBlur}
                            label="Service Manager *"
                            disabled={isLoading}
                          >
                            {users.map((user) => (
                              <MenuItem key={user._id} value={user._id}>
                                {user.name} ({user.email})
                              </MenuItem>
                            ))}
                          </Select>
                          {formik.touched.administrator && formik.errors.administrator && (
                            <FormHelperText>{formik.errors.administrator}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.status && Boolean(formik.errors.status)}
                        >
                          <InputLabel id="status-label">Status</InputLabel>
                          <Select
                            labelId="status-label"
                            id="status"
                            name="status"
                            value={formik.values.status}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="Status"
                            disabled={isLoading}
                          >
                            {statusOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {formik.touched.status && formik.errors.status && (
                            <FormHelperText>{formik.errors.status}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          id="yearBuilt"
                          name="yearBuilt"
                          label="Year Built"
                          type="number"
                          value={formik.values.yearBuilt}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.yearBuilt && Boolean(formik.errors.yearBuilt)}
                          helperText={formik.touched.yearBuilt && formik.errors.yearBuilt}
                          disabled={isLoading}
                          inputProps={{
                            min: 1800,
                            max: new Date().getFullYear(),
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          id="floors"
                          name="floors"
                          label="Number of Floors"
                          type="number"
                          value={formik.values.floors}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.floors && Boolean(formik.errors.floors)}
                          helperText={formik.touched.floors && formik.errors.floors}
                          disabled={isLoading}
                          inputProps={{
                            min: 1,
                            max: 200,
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          id="totalUnits"
                          name="totalUnits"
                          label="Total Units"
                          type="number"
                          value={formik.values.totalUnits}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.totalUnits && Boolean(formik.errors.totalUnits)}
                          helperText={formik.touched.totalUnits && formik.errors.totalUnits}
                          disabled={isLoading}
                          inputProps={{
                            min: 1,
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                {/* Right Column - Additional Info */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 3, mb: 3, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Description</Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    
                    <TextField
                      fullWidth
                      id="description"
                      name="description"
                      label="Building Description"
                      multiline
                      rows={8}
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      disabled={isLoading}
                      variant="outlined"
                    />
                  </Paper>
                  
                  <Paper variant="outlined" sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <InfoIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Amenities</Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    
                    <FormControl fullWidth>
                      <InputLabel id="amenities-label">Select Amenities</InputLabel>
                      <Select
                        labelId="amenities-label"
                        id="amenities"
                        name="amenities"
                        multiple
                        value={formik.values.amenities}
                        onChange={(event) => formik.setFieldValue('amenities', event.target.value)}
                        onBlur={formik.handleBlur}
                        label="Select Amenities"
                        disabled={isLoading}
                        renderValue={(selected) => selected.join(', ')}
                      >
                        {amenityOptions.map((amenity) => (
                          <MenuItem key={amenity} value={amenity}>
                            {amenity}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        Hold Ctrl/Cmd to select multiple amenities
                      </FormHelperText>
                    </FormControl>
                  </Paper>
                </Grid>
                
                {/* Form Actions */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleCancel}
                      startIcon={<CancelIcon />}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={isLoading || !formik.isValid || !formik.dirty}
                    >
                      {isLoading ? 'Saving...' : 'Save Building'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Form submission error */}
              {formik.errors.submit && (
                <Box sx={{ mt: 2 }}>
                  <Typography color="error" variant="body2">
                    {formik.errors.submit}
                  </Typography>
                </Box>
              )}
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default BuildingForm;
