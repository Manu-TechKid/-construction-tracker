import React, { useState } from 'react';
import { useGetCleaningJobsQuery, useUpdateCleaningJobMutation, useDeleteCleaningJobMutation, useGetCleaningJobSubcategoriesQuery } from '../../features/cleaning/cleaningJobsApiSlice';
import { Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, TextField, Select, MenuItem, FormControl, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Button, Chip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { safeFormatDate } from '../../utils/dateUtils';
import BuildingSelector from '../common/BuildingSelector';

const CleaningJobsList = ({ filters }) => {
  const { data: cleaningJobsData, isLoading, error } = useGetCleaningJobsQuery(filters);
  const [updateCleaningJob] = useUpdateCleaningJobMutation();
  const [deleteCleaningJob] = useDeleteCleaningJobMutation();
  const { data: subcategoriesData } = useGetCleaningJobSubcategoriesQuery();

  const [editMode, setEditMode] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error loading cleaning jobs.</Alert>;

  const jobs = cleaningJobsData?.data?.cleaningJobs || [];
  const subcategoryOptions = subcategoriesData?.data?.subcategories || [];

  const statusChipProps = (status) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'success', variant: 'filled' };
      case 'in_progress':
        return { label: 'In Progress', color: 'info', variant: 'filled' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'default', variant: 'outlined' };
      case 'pending':
      default:
        return { label: 'Pending', color: 'warning', variant: 'filled' };
    }
  };

  const paymentChipProps = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return { label: 'Paid', color: 'success', variant: 'outlined' };
      case 'pending':
      default:
        return { label: 'Pending', color: 'warning', variant: 'outlined' };
    }
  };

  const handleEdit = (job) => {
    const buildingId = job?.building?._id ? String(job.building._id) : (typeof job.building === 'string' ? job.building : '');

    setEditMode(job._id);
    setEditData({
      ...job,
      buildingId,
      serviceDate: job?.serviceDate ? String(job.serviceDate).slice(0, 10) : '',
      paymentStatus: job?.paymentStatus || 'pending',
    });
    setEditOpen(true);
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditData({});
    setActionError('');
    setActionSuccess('');
    setEditOpen(false);
  };

  const handleSave = async (id) => {
    setActionError('');
    setActionSuccess('');

    const payload = {
      serviceDate: editData.serviceDate,
      buildingId: editData.buildingId,
      unit: editData.unit,
      subcategory: editData.subcategory,
      worker: editData.worker,
      status: editData.status,
      paymentStatus: editData.paymentStatus,
      cost: editData.cost,
      price: editData.price,
      observations: editData.observations,
    };

    try {
      await updateCleaningJob({ id, ...payload }).unwrap();
      setActionSuccess('Cleaning job updated.');
      setEditMode(null);
      setEditOpen(false);
    } catch (err) {
      const msg = err?.data?.message || err?.error || 'Failed to update cleaning job.';
      setActionError(msg);
    }
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>Cleaning Jobs</Typography>

      {actionError ? <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{actionError}</Alert> : null}
      {actionSuccess ? <Alert severity="success" sx={{ mx: 2, mb: 2 }}>{actionSuccess}</Alert> : null}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Service Date</TableCell>
            <TableCell>Building</TableCell>
            <TableCell>Unit/Apt</TableCell>
            <TableCell>Subcategory</TableCell>
            <TableCell>Worker</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Cost</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Observations</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id}>
              <TableCell>{safeFormatDate(job.serviceDate)}</TableCell>
              <TableCell>{job?.building?.name || ''}</TableCell>
              <TableCell>{job.unit}</TableCell>
              <TableCell>{job.subcategory}</TableCell>
              <TableCell>{job.worker}</TableCell>
              <TableCell>
                <Chip size="small" {...statusChipProps(job.status)} />
              </TableCell>
              <TableCell>
                <Chip size="small" {...paymentChipProps(job.paymentStatus || 'pending')} />
              </TableCell>
              <TableCell>{job.cost}</TableCell>
              <TableCell>{job.price}</TableCell>
              <TableCell>{job.observations}</TableCell>
              <TableCell align="right">
                <IconButton color="default" onClick={() => { /* TODO: Implement View */ }} title="View">
                  <ViewIcon />
                </IconButton>
                <IconButton color="primary" onClick={() => handleEdit(job)} title="Edit">
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  title="Delete"
                  onClick={async () => {
                    setActionError('');
                    setActionSuccess('');
                    if (!window.confirm('Delete this cleaning job?')) return;
                    try {
                      await deleteCleaningJob(job._id).unwrap();
                      setActionSuccess('Cleaning job deleted.');
                    } catch (err) {
                      const msg = err?.data?.message || err?.error || 'Failed to delete cleaning job.';
                      setActionError(msg);
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={editOpen} onClose={handleCancel} maxWidth="md" fullWidth>
        <DialogTitle>Edit Cleaning Job</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="medium" name="serviceDate" label="Service Date" value={editData.serviceDate} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <BuildingSelector
                value={editData.buildingId || ''}
                onChange={(e) => setEditData({ ...editData, buildingId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="medium" name="unit" label="Unit/Apt" value={editData.unit} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={subcategoryOptions}
                value={editData.subcategory || ''}
                onChange={(e, newValue) => setEditData(prev => ({ ...prev, subcategory: newValue || '' }))}
                onInputChange={(e, newInputValue) => setEditData(prev => ({ ...prev, subcategory: newInputValue || '' }))}
                renderInput={(params) => <TextField {...params} fullWidth size="medium" label="Subcategory" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="medium" name="worker" label="Worker" value={editData.worker} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl size="medium" fullWidth>
                <Select name="status" label="Status" value={editData.status} onChange={handleChange}>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl size="medium" fullWidth>
                <Select name="paymentStatus" label="Payment Status" value={editData.paymentStatus || 'pending'} onChange={handleChange}>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="medium" name="cost" label="Cost" value={editData.cost} onChange={handleChange} type="number" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="medium" name="price" label="Price" value={editData.price} onChange={handleChange} type="number" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="medium" name="observations" label="Observations" value={editData.observations} onChange={handleChange} multiline minRows={4} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={() => handleSave(editMode)} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
};

export default CleaningJobsList;
