import React, { useEffect, useState } from 'react';
import { useCreateCleaningJobMutation } from '../../features/cleaning/cleaningJobsApiSlice';
import { Alert, Button, TextField, Grid, Paper, Typography } from '@mui/material';
import BuildingSelector from '../common/BuildingSelector';
import { useBuildingContext } from '../../contexts/BuildingContext';

const CreateCleaningJobForm = () => {
  const [createCleaningJob, { isLoading }] = useCreateCleaningJobMutation();
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
    cost: 0,
    price: 0,
    observations: '',
  });

  useEffect(() => {
    if (!formData.buildingId && selectedBuilding?._id) {
      setFormData(prev => ({ ...prev, buildingId: selectedBuilding._id }));
    }
  }, [selectedBuilding, formData.buildingId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          <Grid item xs={12} sm={6} md={3}><TextField name="serviceDate" label="Service Date" type="date" fullWidth InputLabelProps={{ shrink: true }} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BuildingSelector
              value={formData.buildingId}
              onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}><TextField name="unit" label="Unit/Apt" fullWidth onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField name="subcategory" label="Subcategory" fullWidth onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField name="worker" label="Worker" fullWidth onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField name="cost" label="Cost" type="number" fullWidth onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField name="price" label="Price" type="number" fullWidth onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={9}><TextField name="observations" label="Observations" fullWidth multiline rows={2} onChange={handleChange} /></Grid>
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
