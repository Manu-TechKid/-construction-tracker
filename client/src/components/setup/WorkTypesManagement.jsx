import React, { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Chip, Typography
} from '@mui/material';
import { Add, Edit, Delete, Save, Cancel } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  useGetWorkTypesQuery,
  useCreateWorkTypeMutation,
  useUpdateWorkTypeMutation,
  useDeleteWorkTypeMutation
} from '../../features/setup/setupApiSlice';

const WorkTypesManagement = () => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', color: '#1976d2', icon: 'work'
  });

  const { data: workTypesData, isLoading } = useGetWorkTypesQuery();
  const [createWorkType] = useCreateWorkTypeMutation();
  const [updateWorkType] = useUpdateWorkTypeMutation();
  const [deleteWorkType] = useDeleteWorkTypeMutation();

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateWorkType({ id: editingId, ...formData }).unwrap();
        toast.success('Work type updated successfully');
      } else {
        await createWorkType(formData).unwrap();
        toast.success('Work type created successfully');
      }
      handleClose();
    } catch (error) {
      toast.error('Failed to save work type');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this work type?')) {
      try {
        await deleteWorkType(id).unwrap();
        toast.success('Work type deleted successfully');
      } catch (error) {
        toast.error('Failed to delete work type');
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ name: '', code: '', description: '', color: '#1976d2', icon: 'work' });
  };

  const handleEdit = (workType) => {
    setFormData(workType);
    setEditingId(workType._id);
    setOpen(true);
  };

  if (isLoading) return <Box display="flex" justifyContent="center"><div>Loading...</div></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Work Types Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Work Type
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Color</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workTypesData?.data?.workTypes?.map((workType) => (
              <TableRow key={workType._id}>
                <TableCell>{workType.name}</TableCell>
                <TableCell><Chip label={workType.code} size="small" /></TableCell>
                <TableCell>{workType.description}</TableCell>
                <TableCell>
                  <Box width={24} height={24} bgcolor={workType.color} borderRadius={1} />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(workType)} size="small">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(workType._id)} size="small" color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Work Type' : 'Add Work Type'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="normal" label="Name" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth margin="normal" label="Code" value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <TextField
            fullWidth margin="normal" label="Description" multiline rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            fullWidth margin="normal" label="Color" type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} startIcon={<Cancel />}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<Save />}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkTypesManagement;
