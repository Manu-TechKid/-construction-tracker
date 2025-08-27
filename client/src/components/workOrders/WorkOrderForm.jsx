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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PhotoUpload from '../common/PhotoUpload';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const validationSchema = Yup.object().shape({
  building: Yup.string().required('Building is required'),
  apartmentNumber: Yup.string().required('Apartment number is required'),
  block: Yup.string().required('Block is required'),
  workType: Yup.string().required('Work type is required'),
  workSubType: Yup.string().required('Service type is required'),
  description: Yup.string().required('Description is required'),
  priority: Yup.string().required('Priority is required'),
  startDate: Yup.date().required('Start date is required'),
});

const WorkOrderForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const { data: buildingsData } = useGetBuildingsQuery();
  const buildings = buildingsData?.data?.buildings || [];
  const [photos, setPhotos] = useState([]);

  const initialValues = {
    building: '',
    apartmentNumber: '',
    block: '',
    workType: '',
    workSubType: '',
    roomsAffected: 1,
    description: '',
    priority: 'medium',
    startDate: new Date(),
    laborCost: 0,
    materialsCost: 0,
    ...initialValuesProp,
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitting(true);
        const formData = {
          ...values,
          photos: photos,
          totalCost: (parseFloat(values.laborCost) || 0) + (parseFloat(values.materialsCost) || 0)
        };
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const workTypes = [
    { value: 'painting', label: 'Painting Services' },
    { value: 'cleaning', label: 'Cleaning Services' },
    { value: 'repair', label: 'Repair Services' },
    { value: 'maintenance', label: 'Maintenance Services' },
    { value: 'inspection', label: 'Inspection Services' },
    { value: 'other', label: 'Other Services' },
  ];

  const workSubTypes = {
    painting: [
      { value: 'apartment_1_room', label: '1 Room Apartment Painting' },
      { value: 'apartment_2_room', label: '2 Room Apartment Painting' },
      { value: 'apartment_3_room', label: '3 Room Apartment Painting' },
      { value: 'doors', label: 'Door Painting' },
      { value: 'ceilings', label: 'Ceiling Painting' },
      { value: 'cabinets', label: 'Cabinet Painting' },
      { value: 'hallways', label: 'Hallway Painting' },
      { value: 'touch_up', label: 'Paint Touch-ups' },
      { value: 'exterior', label: 'Exterior Painting' },
      { value: 'trim_molding', label: 'Trim & Molding Painting' }
    ],
    cleaning: [
      { value: 'apartment_1_bedroom', label: '1 Bedroom Apartment Cleaning' },
      { value: 'apartment_2_bedroom', label: '2 Bedroom Apartment Cleaning' },
      { value: 'apartment_3_bedroom', label: '3 Bedroom Apartment Cleaning' },
      { value: 'touch_up_cleaning', label: 'Touch-up Cleaning' },
      { value: 'heavy_cleaning', label: 'Heavy Cleaning' },
      { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
      { value: 'gutter_cleaning', label: 'Gutter Cleaning' },
      { value: 'window_cleaning', label: 'Window Cleaning' },
      { value: 'deep_cleaning', label: 'Deep Cleaning' },
      { value: 'move_out_cleaning', label: 'Move-out Cleaning' }
    ],
    repair: [
      { value: 'air_conditioning', label: 'Air Conditioning Repair' },
      { value: 'door_repair', label: 'Door Repair' },
      { value: 'ceiling_repair', label: 'Ceiling Repair' },
      { value: 'floor_repair', label: 'Floor Repair' },
      { value: 'plumbing', label: 'Plumbing Repair' },
      { value: 'electrical', label: 'Electrical Repair' },
      { value: 'drywall', label: 'Drywall Repair' },
      { value: 'tile_repair', label: 'Tile Repair' },
      { value: 'appliance_repair', label: 'Appliance Repair' },
      { value: 'general_maintenance', label: 'General Maintenance' }
    ],
    maintenance: [
      { value: 'preventive', label: 'Preventive Maintenance' },
      { value: 'hvac_maintenance', label: 'HVAC Maintenance' },
      { value: 'plumbing_maintenance', label: 'Plumbing Maintenance' },
      { value: 'electrical_maintenance', label: 'Electrical Maintenance' },
      { value: 'landscaping', label: 'Landscaping Maintenance' },
      { value: 'safety_inspection', label: 'Safety Inspection' }
    ],
    inspection: [
      { value: 'move_in', label: 'Move-in Inspection' },
      { value: 'move_out', label: 'Move-out Inspection' },
      { value: 'routine', label: 'Routine Inspection' },
      { value: 'damage_assessment', label: 'Damage Assessment' },
      { value: 'safety_check', label: 'Safety Check' }
    ],
    other: [
      { value: 'emergency', label: 'Emergency Service' },
      { value: 'consultation', label: 'Consultation' },
      { value: 'estimate', label: 'Estimate/Quote' },
      { value: 'custom', label: 'Custom Service' }
    ]
  };

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
                          {buildings.map((building) => (
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
                        label="Apartment Number *"
                        value={formik.values.apartmentNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                        helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                        variant="outlined"
                        placeholder="Enter apartment number"
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        id="block"
                        name="block"
                        label="Block *"
                        value={formik.values.block}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.block && Boolean(formik.errors.block)}
                        helperText={formik.touched.block && formik.errors.block}
                        variant="outlined"
                        placeholder="Enter block"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={formik.touched.workType && Boolean(formik.errors.workType)}>
                        <InputLabel id="work-type-label">Work Type *</InputLabel>
                        <Select
                          labelId="work-type-label"
                          id="workType"
                          name="workType"
                          value={formik.values.workType}
                          onChange={(e) => {
                            formik.handleChange(e);
                            formik.setFieldValue('workSubType', '');
                          }}
                          onBlur={formik.handleBlur}
                          label="Work Type *"
                        >
                          <MenuItem value="">
                            <em>Select work type</em>
                          </MenuItem>
                          {workTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.workType && formik.errors.workType && (
                          <FormHelperText>{formik.errors.workType}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl 
                        fullWidth 
                        error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}
                        disabled={!formik.values.workType}
                      >
                        <InputLabel id="work-sub-type-label">Service Type *</InputLabel>
                        <Select
                          labelId="work-sub-type-label"
                          id="workSubType"
                          name="workSubType"
                          value={formik.values.workSubType}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Service Type *"
                        >
                          <MenuItem value="">
                            <em>{formik.values.workType ? 'Select service type' : 'Select work type first'}</em>
                          </MenuItem>
                          {formik.values.workType && workSubTypes[formik.values.workType] && 
                            workSubTypes[formik.values.workType].map((subType) => (
                              <MenuItem key={subType.value} value={subType.value}>
                                {subType.label}
                              </MenuItem>
                            ))
                          }
                        </Select>
                        {formik.touched.workSubType && formik.errors.workSubType && (
                          <FormHelperText>{formik.errors.workSubType}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="roomsAffected"
                        name="roomsAffected"
                        label="Rooms Affected"
                        type="number"
                        value={formik.values.roomsAffected}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.roomsAffected && Boolean(formik.errors.roomsAffected)}
                        helperText={formik.touched.roomsAffected && formik.errors.roomsAffected}
                        variant="outlined"
                        inputProps={{ min: 1, max: 20 }}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
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
                        {formik.touched.priority && formik.errors.priority && (
                          <FormHelperText>{formik.errors.priority}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <DatePicker
                        label="Start Date *"
                        value={formik.values.startDate}
                        onChange={(newValue) => {
                          formik.setFieldValue('startDate', newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
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
                        label="Description *"
                        multiline
                        rows={4}
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}
                        variant="outlined"
                        placeholder="Describe the work to be done..."
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        id="laborCost"
                        name="laborCost"
                        label="Labor Cost"
                        type="number"
                        value={formik.values.laborCost}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.laborCost && Boolean(formik.errors.laborCost)}
                        helperText={formik.touched.laborCost && formik.errors.laborCost}
                        variant="outlined"
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        id="materialsCost"
                        name="materialsCost"
                        label="Materials Cost"
                        type="number"
                        value={formik.values.materialsCost}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.materialsCost && Boolean(formik.errors.materialsCost)}
                        helperText={formik.touched.materialsCost && formik.errors.materialsCost}
                        variant="outlined"
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <PhotoUpload
                photos={photos}
                onPhotosChange={setPhotos}
                maxPhotos={5}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onCancel}
              disabled={isSubmitting}
              size="large"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !formik.isValid}
              size="large"
            >
              {isSubmitting ? 'Creating...' : 'Create Work Order'}
            </Button>
          </Box>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;
