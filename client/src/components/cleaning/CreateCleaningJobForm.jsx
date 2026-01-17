import React, { useEffect, useState } from 'react';
import { useCreateCleaningJobMutation, useGetCleaningJobSubcategoriesQuery } from '../../features/cleaning/cleaningJobsApiSlice';
import { Alert, Autocomplete, Button, FormControl, Grid, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import BuildingSelector from '../common/BuildingSelector';
import { useBuildingContext } from '../../contexts/BuildingContext';

const CreateCleaningJobForm = () => {
  const [createCleaningJob, { isLoading }] = useCreateCleaningJobMutation();
  const { data: subcategoriesData } = useGetCleaningJobSubcategoriesQuery();
  const { selectedBuilding } = useBuildingContext();

  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [formData, setFormData] = useState({
    serviceDate: '',
    buildingId: '',
    unit: '',
    subcategory: '',
    worker: '',
    status: 'pending',
    paymentStatus: 'pending',
    cost: 0,
    price: 0,
    observations: '',
  });

  const subcategoryOptions = subcategoriesData?.data?.subcategories || [];

  useEffect(() => {
    if (!formData.buildingId && selectedBuilding?._id) {
      setFormData(prev => ({ ...prev, buildingId: selectedBuilding._id }));
    }
  }, [selectedBuilding, formData.buildingId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fieldSx = {
    '& .MuiInputBase-input': { fontSize: 16, py: 1.25 },
    '& .MuiInputLabel-root': { fontSize: 14 },
    '& .MuiSelect-select': { fontSize: 16, py: 1.25 },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!formData.buildingId) {
      setSubmitError('Please select a building before adding the job.');
      return;
    }

    try {
      await createCleaningJob(formData).unwrap();
      setSubmitSuccess('Cleaning job added.');
      setFormData(prev => ({
        ...prev,
        serviceDate: '',
        unit: '',
        subcategory: '',
        worker: '',
        status: 'pending',
        paymentStatus: 'pending',
        cost: 0,
        price: 0,
        observations: '',
      }));
    } catch (err) {
      const msg = err?.data?.message || err?.error || 'Failed to add cleaning job.';
      setSubmitError(msg);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Add New Cleaning Job</Typography>

      {submitError ? <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert> : null}
      {submitSuccess ? <Alert severity="success" sx={{ mb: 2 }}>{submitSuccess}</Alert> : null}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              name="serviceDate"
              label="Service Date"
              type="date"
              fullWidth
              size="medium"
              sx={fieldSx}
              InputLabelProps={{ shrink: true }}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BuildingSelector
              value={formData.buildingId}
              onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
              size="medium"
              sx={{ minWidth: 240 }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField name="unit" label="Unit/Apt" fullWidth size="medium" sx={fieldSx} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              freeSolo
              options={subcategoryOptions}
              value={formData.subcategory || ''}
              onChange={(e, newValue) => {
                setFormData(prev => ({ ...prev, subcategory: newValue || '' }));
              }}
              onInputChange={(e, newInputValue) => {
                setFormData(prev => ({ ...prev, subcategory: newInputValue || '' }));
              }}
              renderInput={(params) => (
                <TextField {...params} label="Subcategory" fullWidth size="medium" sx={fieldSx} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField name="worker" label="Worker" fullWidth size="medium" sx={fieldSx} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="medium" sx={{ minWidth: 160 }}>
              <Select name="status" value={formData.status} onChange={handleChange} sx={fieldSx}>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
              <Select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} sx={fieldSx}>
                <MenuItem value="pending">Pending Payment</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField name="cost" label="Cost" type="number" fullWidth size="medium" sx={fieldSx} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField name="price" label="Price" type="number" fullWidth size="medium" sx={fieldSx} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={9}>
            <TextField name="observations" label="Observations" fullWidth size="medium" sx={fieldSx} multiline rows={3} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button type="submit" variant="contained" fullWidth disabled={isLoading || !formData.buildingId}>
              Add Job
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default CreateCleaningJobForm;
