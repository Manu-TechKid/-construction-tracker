import React, { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Chip, Typography, FormControl,
  InputLabel, Select, MenuItem, List, ListItem, ListItemText,
  ListItemSecondaryAction, Divider
} from '@mui/material';
import { Add, Edit, Delete, Save, Cancel } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  useGetDropdownConfigsQuery,
  useCreateDropdownConfigMutation,
  useUpdateDropdownConfigMutation,
  useDeleteDropdownConfigMutation
} from '../../features/setup/setupApiSlice';

const DropdownConfigManagement = () => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category: '', name: '', description: '', options: []
  });
  const [newOption, setNewOption] = useState({
    label: '', value: '', color: '#1976d2', description: ''
  });

  const { data: dropdownConfigsData, isLoading } = useGetDropdownConfigsQuery();
  const [createDropdownConfig] = useCreateDropdownConfigMutation();
  const [updateDropdownConfig] = useUpdateDropdownConfigMutation();
  const [deleteDropdownConfig] = useDeleteDropdownConfigMutation();

  const categories = [
    'priority', 'status', 'apartment_status', 'building_type',
    'user_role', 'payment_status', 'invoice_status', 'reminder_type', 'construction_category'
  ];

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateDropdownConfig({ id: editingId, ...formData }).unwrap();
        toast.success('Dropdown config updated successfully');
      } else {
        await createDropdownConfig(formData).unwrap();
        toast.success('Dropdown config created successfully');
      }
      handleClose();
    } catch (error) {
      toast.error('Failed to save dropdown config');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ category: '', name: '', description: '', options: [] });
    setNewOption({ label: '', value: '', color: '#1976d2', description: '' });
  };

  const handleEdit = (config) => {
    setFormData(config);
    setEditingId(config._id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dropdown configuration?')) {
      try {
        await deleteDropdownConfig(id).unwrap();
        toast.success('Dropdown config deleted successfully');
      } catch (error) {
        toast.error('Failed to delete dropdown config');
      }
    }
  };

  const addOption = () => {
    if (newOption.label && newOption.value) {
      setFormData({
        ...formData,
        options: [...formData.options, { ...newOption, sortOrder: formData.options.length }]
      });
      setNewOption({ label: '', value: '', color: '#1976d2', description: '' });
    }
  };

  const removeOption = (index) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  if (isLoading) return <Box display="flex" justifyContent="center"><div>Loading...</div></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Dropdown Configurations</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Dropdown Config
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Options Count</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dropdownConfigsData?.data?.dropdownConfigs?.map((config) => (
              <TableRow key={config._id}>
                <TableCell><Chip label={config.category} size="small" /></TableCell>
                <TableCell>{config.name}</TableCell>
                <TableCell>{config.options?.length || 0}</TableCell>
                <TableCell>{config.description}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(config)} size="small">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(config._id)} size="small" color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Edit Dropdown Config' : 'Add Dropdown Config'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth margin="normal" label="Name" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth margin="normal" label="Description" multiline rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Options</Typography>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Label" value={newOption.label}
              onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
            />
            <TextField
              label="Value" value={newOption.value}
              onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
            />
            <TextField
              label="Color" type="color" value={newOption.color}
              onChange={(e) => setNewOption({ ...newOption, color: e.target.value })}
            />
            <Button onClick={addOption} variant="outlined">Add</Button>
          </Box>

          <List>
            {formData.options?.map((option, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <Box width={24} height={24} bgcolor={option.color} borderRadius={1} mr={2} />
                  <ListItemText primary={option.label} secondary={option.value} />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => removeOption(index)} size="small" color="error">
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < formData.options.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
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

export default DropdownConfigManagement;
