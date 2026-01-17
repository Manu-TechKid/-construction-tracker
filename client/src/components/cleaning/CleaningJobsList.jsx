import React, { useState } from 'react';
import { useGetCleaningJobsQuery, useUpdateCleaningJobMutation, useDeleteCleaningJobMutation, useGetCleaningJobSubcategoriesQuery } from '../../features/cleaning/cleaningJobsApiSlice';
import { Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, TextField, Select, MenuItem, FormControl, IconButton, Box } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { safeFormatDate } from '../../utils/dateUtils';
import BuildingSelector from '../common/BuildingSelector';

const CleaningJobsList = ({ filters }) => {
  const { data: cleaningJobsData, isLoading, error } = useGetCleaningJobsQuery(filters);
  const [updateCleaningJob] = useUpdateCleaningJobMutation();
  const [deleteCleaningJob] = useDeleteCleaningJobMutation();
  const { data: subcategoriesData } = useGetCleaningJobSubcategoriesQuery();

  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({});
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error loading cleaning jobs.</Alert>;

  const jobs = cleaningJobsData?.data?.cleaningJobs || [];
  const subcategoryOptions = subcategoriesData?.data?.subcategories || [];

  const handleEdit = (job) => {
    const buildingId = job?.building?._id
      ? String(job.building._id)
      : (typeof job.building === 'string' ? job.building : '');

    setEditMode(job._id);
    setEditData({
      ...job,
      buildingId,
      serviceDate: job?.serviceDate ? String(job.serviceDate).slice(0, 10) : '',
      paymentStatus: job?.paymentStatus || 'pending',
    });
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditData({});
    setActionError('');
    setActionSuccess('');
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
            <TableCell>Date</TableCell>
            <TableCell>Service Date</TableCell>
            <TableCell>Building</TableCell>
            <TableCell>Unit/Apt</TableCell>
            <TableCell>Subcategory</TableCell>
            <TableCell>Worker</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Done</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Cost</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Observations</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job._id}
              sx={editMode === job._id ? { backgroundColor: 'rgba(25, 118, 210, 0.06)' } : undefined}
            >
              {editMode === job._id ? (
                <>
                  <TableCell>{safeFormatDate(job.date)}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <TextField fullWidth size="medium" name="serviceDate" value={editData.serviceDate} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 240 }}>
                      <BuildingSelector
                        value={editData.buildingId || ''}
                        onChange={(e) => setEditData({ ...editData, buildingId: e.target.value })}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: 110 }}>
                    <TextField fullWidth size="medium" name="unit" value={editData.unit} onChange={handleChange} />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      freeSolo
                      options={subcategoryOptions}
                      value={editData.subcategory || ''}
                      onChange={(e, newValue) => {
                        setEditData(prev => ({ ...prev, subcategory: newValue || '' }));
                      }}
                      onInputChange={(e, newInputValue) => {
                        setEditData(prev => ({ ...prev, subcategory: newInputValue || '' }));
                      }}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth size="medium" placeholder="Subcategory" />
                      )}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <TextField fullWidth size="medium" name="worker" value={editData.worker} onChange={handleChange} />
                  </TableCell>
                  <TableCell>
                    <FormControl size="medium" fullWidth sx={{ minWidth: 140 }}>
                      <Select name="status" value={editData.status} onChange={handleChange}>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>{editData.status === 'completed' ? 'Yes' : ''}</TableCell>
                  <TableCell>
                    <FormControl size="medium" fullWidth sx={{ minWidth: 120 }}>
                      <Select name="paymentStatus" value={editData.paymentStatus || 'pending'} onChange={handleChange}>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="paid">Paid</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <TextField
                      fullWidth
                      size="medium"
                      name="cost"
                      value={editData.cost}
                      onChange={handleChange}
                      type="number"
                      sx={{ '& .MuiInputBase-input': { fontSize: 16, py: 1.1 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <TextField
                      fullWidth
                      size="medium"
                      name="price"
                      value={editData.price}
                      onChange={handleChange}
                      type="number"
                      sx={{ '& .MuiInputBase-input': { fontSize: 16, py: 1.1 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 260 }}>
                    <TextField fullWidth size="medium" name="observations" value={editData.observations} onChange={handleChange} multiline minRows={3} />
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleSave(job._id)} title="Save">
                      <SaveIcon />
                    </IconButton>
                    <IconButton onClick={handleCancel} title="Cancel">
                      <CloseIcon />
                    </IconButton>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>{safeFormatDate(job.date)}</TableCell>
                  <TableCell>{safeFormatDate(job.serviceDate)}</TableCell>
                  <TableCell>{job?.building?.name || ''}</TableCell>
                  <TableCell>{job.unit}</TableCell>
                  <TableCell>{job.subcategory}</TableCell>
                  <TableCell>{job.worker}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.status === 'completed' ? 'Yes' : ''}</TableCell>
                  <TableCell>{job.paymentStatus || 'pending'}</TableCell>
                  <TableCell>{job.cost}</TableCell>
                  <TableCell>{job.price}</TableCell>
                  <TableCell>{job.observations}</TableCell>
                  <TableCell>
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
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CleaningJobsList;
