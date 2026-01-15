import React, { useState } from 'react';
import { useGetCleaningJobsQuery, useUpdateCleaningJobMutation, useDeleteCleaningJobMutation } from '../../features/cleaning/cleaningJobsApiSlice';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Button, TextField, Select, MenuItem, FormControl } from '@mui/material';
import { safeFormatDate } from '../../utils/dateUtils';

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
    setEditMode(job._id);
    setEditData(job);
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditData({});
  };

  const handleSave = async (id) => {
    await updateCleaningJob({ id, ...editData });
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
                  <TableCell><TextField name="building" value={editData.building} onChange={handleChange} /></TableCell>
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
                  <TableCell>{job.building}</TableCell>
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
