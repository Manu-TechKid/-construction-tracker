import { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Chip, Typography, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import { Add, Edit, Delete, Save, Cancel } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  useGetWorkTypesQuery,
  useGetWorkSubTypesQuery,
  useCreateWorkSubTypeMutation,
  useUpdateWorkSubTypeMutation,
  useDeleteWorkSubTypeMutation
} from '../../features/setup/setupApiSlice';

const WorkSubTypesManagement = () => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', workType: '', description: '', estimatedDuration: 1, estimatedCost: 0
  });

  const { data: workTypesData } = useGetWorkTypesQuery();
  const { data: workSubTypesData, isLoading } = useGetWorkSubTypesQuery();
  const [createWorkSubType] = useCreateWorkSubTypeMutation();
  const [updateWorkSubType] = useUpdateWorkSubTypeMutation();
  const [deleteWorkSubType] = useDeleteWorkSubTypeMutation();

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.code || !formData.workType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      console.log('Submitting form data:', formData);
      
      if (editingId) {
        const result = await updateWorkSubType({ id: editingId, ...formData }).unwrap();
        console.log('Update result:', result);
        toast.success('Work sub-type updated successfully');
      } else {
        const result = await createWorkSubType(formData).unwrap();
        console.log('Create result:', result);
        toast.success('Work sub-type created successfully');
      }
      handleClose();
    } catch (error) {
      console.error('Error saving work sub-type:', error);
      toast.error(`Failed to save work sub-type: ${error.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this work sub-type?')) {
      try {
        await deleteWorkSubType(id).unwrap();
        toast.success('Work sub-type deleted successfully');
      } catch (error) {
        toast.error('Failed to delete work sub-type');
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ name: '', code: '', workType: '', description: '', estimatedDuration: 1, estimatedCost: 0 });
  };

  const handleEdit = (workSubType) => {
    console.log('Editing work sub-type:', workSubType);
    
    // Handle workType field properly - it could be an object with _id or just a string ID
    let workTypeId = '';
    if (workSubType.workType) {
      if (typeof workSubType.workType === 'object' && workSubType.workType._id) {
        workTypeId = workSubType.workType._id;
      } else if (typeof workSubType.workType === 'string') {
        workTypeId = workSubType.workType;
      }
    }
    
    setFormData({
      name: workSubType.name || '',
      code: workSubType.code || '',
      workType: workTypeId,
      description: workSubType.description || '',
      estimatedDuration: workSubType.estimatedDuration || 1,
      estimatedCost: workSubType.estimatedCost || 0
    });
    setEditingId(workSubType._id);
    setOpen(true);
  };

  if (isLoading) return <Box display="flex" justifyContent="center"><div>Loading...</div></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Work Sub-Types Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Work Sub-Type
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Work Type</TableCell>
              <TableCell>Est. Duration (hrs)</TableCell>
              <TableCell>Est. Cost</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workSubTypesData?.data?.workSubTypes?.map((workSubType) => (
              <TableRow key={workSubType._id}>
                <TableCell>{workSubType.name}</TableCell>
                <TableCell><Chip label={workSubType.code} size="small" /></TableCell>
                <TableCell>
                  <Chip label={workSubType.workType?.name || 'N/A'} size="small" color="primary" />
                </TableCell>
                <TableCell>{workSubType.estimatedDuration}</TableCell>
                <TableCell>${workSubType.estimatedCost}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(workSubType)} size="small">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(workSubType._id)} size="small" color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Work Sub-Type' : 'Add Work Sub-Type'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Work Type *</InputLabel>
            <Select
              value={formData.workType}
              onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
              required
            >
              {workTypesData?.data?.workTypes?.map((workType) => (
                <MenuItem key={workType._id} value={workType._id}>
                  {workType.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth margin="normal" label="Name *" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            fullWidth margin="normal" label="Code *" value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <TextField
            fullWidth margin="normal" label="Description" multiline rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            fullWidth margin="normal" label="Estimated Duration (hours)" type="number"
            value={formData.estimatedDuration}
            onChange={(e) => setFormData({ ...formData, estimatedDuration: Number(e.target.value) })}
          />
          <TextField
            fullWidth margin="normal" label="Estimated Cost" type="number"
            value={formData.estimatedCost}
            onChange={(e) => setFormData({ ...formData, estimatedCost: Number(e.target.value) })}
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

export default WorkSubTypesManagement;
