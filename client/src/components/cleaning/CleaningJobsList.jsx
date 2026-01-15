import React, { useState } from 'react';
import { useGetCleaningJobsQuery, useUpdateCleaningJobMutation, useDeleteCleaningJobMutation } from '../../features/cleaning/cleaningJobsApiSlice';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Button, TextField, Select, MenuItem, FormControl } from '@mui/material';
import { safeFormatDate } from '../../utils/dateUtils';
import BuildingSelector from '../common/BuildingSelector';

const CleaningJobsList = ({ filters }) => {
  const { data: cleaningJobsData, isLoading, error } = useGetCleaningJobsQuery(filters);
  const [updateCleaningJob] = useUpdateCleaningJobMutation();
  const [deleteCleaningJob] = useDeleteCleaningJobMutation();

  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({});

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error loading cleaning jobs.</Alert>;

  const jobs = cleaningJobsData?.data?.cleaningJobs || [];

  const handleEdit = (job) => {
    const buildingId = job?.building?._id
      ? String(job.building._id)
      : (typeof job.building === 'string' ? job.building : '');

    setEditMode(job._id);
    setEditData({
      ...job,
      buildingId,
      serviceDate: job?.serviceDate ? String(job.serviceDate).slice(0, 10) : '',
    });
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditData({});
  };

  const handleSave = async (id) => {
    const payload = {
      serviceDate: editData.serviceDate,
      buildingId: editData.buildingId,
      unit: editData.unit,
      subcategory: editData.subcategory,
      worker: editData.worker,
      status: editData.status,
      cost: editData.cost,
      price: editData.price,
      observations: editData.observations,
    };

    await updateCleaningJob({ id, ...payload });
    setEditMode(null);
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>Cleaning Jobs</Typography>
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
            <TableCell>Cost</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Observations</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id}>
              {editMode === job._id ? (
                <>
                  <TableCell>{safeFormatDate(job.date)}</TableCell>
                  <TableCell><TextField name="serviceDate" value={editData.serviceDate} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} /></TableCell>
                  <TableCell>
                    <BuildingSelector
                      value={editData.buildingId || ''}
                      onChange={(e) => setEditData({ ...editData, buildingId: e.target.value })}
                    />
                  </TableCell>
                  <TableCell><TextField name="unit" value={editData.unit} onChange={handleChange} /></TableCell>
                  <TableCell><TextField name="subcategory" value={editData.subcategory} onChange={handleChange} /></TableCell>
                  <TableCell><TextField name="worker" value={editData.worker} onChange={handleChange} /></TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select name="status" value={editData.status} onChange={handleChange}>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell><TextField name="cost" value={editData.cost} onChange={handleChange} type="number" /></TableCell>
                  <TableCell><TextField name="price" value={editData.price} onChange={handleChange} type="number" /></TableCell>
                  <TableCell><TextField name="observations" value={editData.observations} onChange={handleChange} /></TableCell>
                  <TableCell>
                    <Button onClick={() => handleSave(job._id)}>Save</Button>
                    <Button onClick={handleCancel}>Cancel</Button>
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
                  <TableCell>{job.cost}</TableCell>
                  <TableCell>{job.price}</TableCell>
                  <TableCell>{job.observations}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleEdit(job)}>Edit</Button>
                    <Button onClick={() => deleteCleaningJob(job._id)}>Delete</Button>
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
