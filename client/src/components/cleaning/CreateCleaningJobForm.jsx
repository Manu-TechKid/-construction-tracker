import React, { useState } from 'react';
import { useCreateCleaningJobMutation } from '../../features/cleaning/cleaningJobsApiSlice';
import { Button, TextField, Grid, Paper, Typography } from '@mui/material';
import BuildingSelector from '../common/BuildingSelector';

const CreateCleaningJobForm = () => {
  const [createCleaningJob, { isLoading }] = useCreateCleaningJobMutation();
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createCleaningJob(formData);
    // Optionally, clear the form
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Add New Cleaning Job</Typography>
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
          <Grid item xs={12} sm={3}><Button type="submit" variant="contained" fullWidth disabled={isLoading}>Add Job</Button></Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default CreateCleaningJobForm;
