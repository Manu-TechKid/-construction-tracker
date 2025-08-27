import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAddApartmentMutation, useUpdateApartmentMutation } from '../../features/buildings/buildingsApiSlice';
import { toast } from 'react-toastify';

// Validation schema
const validationSchema = Yup.object({
  number: Yup.string().required('Apartment number is required'),
  block: Yup.string().required('Block is required'),
  floor: Yup.string().required('Floor is required'),
  status: Yup.string().required('Status is required'),
  type: Yup.string().required('Type is required'),
  area: Yup.number().min(1, 'Area must be greater than 0').required('Area is required'),
  bedrooms: Yup.number().min(0, 'Must be 0 or more').required('Number of bedrooms is required'),
  bathrooms: Yup.number().min(1, 'At least one bathroom is required').required('Number of bathrooms is required'),
  notes: Yup.string(),
});

const ApartmentForm = ({ open, onClose, buildingId, apartment = null }) => {
  const isEdit = Boolean(apartment?._id);
  const [addApartment, { isLoading: isAdding }] = useAddApartmentMutation();
  const [updateApartment, { isLoading: isUpdating }] = useUpdateApartmentMutation();
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: {
      number: apartment?.number || '',
      block: apartment?.block || '',
      floor: apartment?.floor || '',
      status: apartment?.status || 'vacant',
      type: apartment?.type || 'standard',
      area: apartment?.area || '',
      bedrooms: apartment?.bedrooms || 1,
      bathrooms: apartment?.bathrooms || 1,
      notes: apartment?.notes || '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setError('');
        setSubmitting(true);
        
        if (!buildingId) {
          throw new Error('Building ID is required');
        }
        
        const apartmentData = {
          ...values,
          area: parseFloat(values.area),
          bedrooms: parseInt(values.bedrooms),
          bathrooms: parseInt(values.bathrooms),
        };

        if (isEdit) {
          await updateApartment({
            buildingId,
            apartmentId: apartment._id,
            apartmentData
          }).unwrap();
          toast.success('Apartment updated successfully');
        } else {
          await addApartment({
            buildingId,
            apartmentData
          }).unwrap();
          toast.success('Apartment added successfully');
        }
        
        resetForm();
        onClose(true); // Pass true to indicate successful submission
      } catch (err) {
        console.error('Failed to save apartment:', err);
        const errorMessage = err?.data?.message || err?.message || 'Failed to save apartment';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    setError('');
    onClose(false);
  };

  const statusOptions = [
    { value: 'vacant', label: 'Vacant' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'under_renovation', label: 'Under Renovation' },
    { value: 'reserved', label: 'Reserved' },
  ];

  const typeOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'studio', label: 'Studio' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'duplex', label: 'Duplex' },
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEdit ? 'Edit Apartment' : 'Add New Apartment'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={formik.handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="number"
                name="number"
                label="Apartment Number *"
                value={formik.values.number}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.number && Boolean(formik.errors.number)}
                helperText={formik.touched.number && formik.errors.number}
                variant="outlined"
                placeholder="e.g., 101, A1, etc."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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
                placeholder="e.g., A, B, 1, 2, etc."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="floor"
                name="floor"
                label="Floor *"
                value={formik.values.floor}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.floor && Boolean(formik.errors.floor)}
                helperText={formik.touched.floor && formik.errors.floor}
                variant="outlined"
                placeholder="e.g., 1, 2, Ground, etc."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.status && Boolean(formik.errors.status)}>
                <InputLabel id="status-label">Status *</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Status *"
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.status && formik.errors.status && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {formik.errors.status}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.type && Boolean(formik.errors.type)}>
                <InputLabel id="type-label">Type *</InputLabel>
                <Select
                  labelId="type-label"
                  id="type"
                  name="type"
                  value={formik.values.type}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Type *"
                >
                  {typeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.type && formik.errors.type && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {formik.errors.type}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="area"
                name="area"
                label="Area (m²) *"
                type="number"
                value={formik.values.area}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.area && Boolean(formik.errors.area)}
                helperText={formik.touched.area && formik.errors.area}
                variant="outlined"
                inputProps={{ min: 1, step: 0.1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="bedrooms"
                name="bedrooms"
                label="Bedrooms *"
                type="number"
                value={formik.values.bedrooms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bedrooms && Boolean(formik.errors.bedrooms)}
                helperText={formik.touched.bedrooms && formik.errors.bedrooms}
                variant="outlined"
                inputProps={{ min: 0, max: 10 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="bathrooms"
                name="bathrooms"
                label="Bathrooms *"
                type="number"
                value={formik.values.bathrooms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bathrooms && Boolean(formik.errors.bathrooms)}
                helperText={formik.touched.bathrooms && formik.errors.bathrooms}
                variant="outlined"
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="notes"
                name="notes"
                label="Notes"
                multiline
                rows={3}
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
                variant="outlined"
                placeholder="Additional notes about the apartment..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={formik.isSubmitting}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formik.isSubmitting || !formik.isValid}
            startIcon={formik.isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {formik.isSubmitting 
              ? (isEdit ? 'Updating...' : 'Adding...') 
              : (isEdit ? 'Update Apartment' : 'Add Apartment')
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ApartmentForm;
