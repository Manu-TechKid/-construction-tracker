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
    onSubmit: async (values) => {
      try {
        setError('');
        const apartmentData = {
          ...values,
          area: Number(values.area),
          bedrooms: Number(values.bedrooms),
          bathrooms: Number(values.bathrooms),
        };

        if (isEdit) {
          await updateApartment({
            buildingId,
            apartmentId: apartment._id,
            ...apartmentData,
          }).unwrap();
        } else {
          await addApartment({
            buildingId,
            ...apartmentData,
          }).unwrap();
        }
        onClose(true);
      } catch (err) {
        setError(err.data?.message || 'An error occurred while saving the apartment');
      }
    },
  });

  const statusOptions = [
    { value: 'vacant', label: 'Vacant' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'under_renovation', label: 'Under Renovation' },
    { value: 'reserved', label: 'Reserved' },
  ];

  const typeOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'studio', label: 'Studio' },
    { value: 'loft', label: 'Loft' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'penthouse', label: 'Penthouse' },
  ];

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEdit ? 'Edit Apartment' : 'Add New Apartment'}
          </Typography>
          <IconButton onClick={() => onClose(false)} size="small">
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
                label="Apartment Number"
                value={formik.values.number}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.number && Boolean(formik.errors.number)}
                helperText={formik.touched.number && formik.errors.number}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="floor"
                name="floor"
                label="Floor"
                type="number"
                value={formik.values.floor}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.floor && Boolean(formik.errors.floor)}
                helperText={formik.touched.floor && formik.errors.floor}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={formik.values.status}
                  label="Status"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.status && Boolean(formik.errors.status)}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel id="type-label">Type</InputLabel>
                <Select
                  labelId="type-label"
                  id="type"
                  name="type"
                  value={formik.values.type}
                  label="Type"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.type && Boolean(formik.errors.type)}
                >
                  {typeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="area"
                name="area"
                label="Area (sqm)"
                type="number"
                value={formik.values.area}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.area && Boolean(formik.errors.area)}
                helperText={formik.touched.area && formik.errors.area}
                margin="normal"
                size="small"
                InputProps={{
                  endAdornment: 'm²',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="bedrooms"
                name="bedrooms"
                label="Bedrooms"
                type="number"
                value={formik.values.bedrooms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bedrooms && Boolean(formik.errors.bedrooms)}
                helperText={formik.touched.bedrooms && formik.errors.bedrooms}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="bathrooms"
                name="bathrooms"
                label="Bathrooms"
                type="number"
                value={formik.values.bathrooms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bathrooms && Boolean(formik.errors.bathrooms)}
                helperText={formik.touched.bathrooms && formik.errors.bathrooms}
                margin="normal"
                size="small"
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
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => onClose(false)} disabled={isAdding || isUpdating}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isAdding || isUpdating || !formik.isValid}
            startIcon={isAdding || isUpdating ? <CircularProgress size={20} /> : null}
          >
            {isEdit ? 'Update' : 'Add'} Apartment
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ApartmentForm;
