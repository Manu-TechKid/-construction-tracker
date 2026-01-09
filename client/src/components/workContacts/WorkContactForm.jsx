import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import { useCreateWorkContactMutation, useUpdateWorkContactMutation } from '../../features/workContacts/workContactsApiSlice';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const WorkContactForm = ({ open, handleClose, contact }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    email: '',
    expertise: '',
    responded: false,
    observations: '',
  });

  const [createWorkContact, { isLoading: isCreating }] = useCreateWorkContactMutation();
  const [updateWorkContact, { isLoading: isUpdating }] = useUpdateWorkContactMutation();

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    } else {
      setFormData({
        name: '',
        phone: '',
        city: '',
        email: '',
        expertise: '',
        responded: false,
        observations: '',
      });
    }
  }, [contact]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (contact) {
        await updateWorkContact({ id: contact._id, ...formData }).unwrap();
      } else {
        await createWorkContact(formData).unwrap();
      }
      handleClose();
    } catch (err) {
      console.error('Failed to save work contact:', err);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style} component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" component="h2">
          {contact ? 'Edit Work Contact' : 'Add New Work Contact'}
        </Typography>
        <TextField margin="normal" required fullWidth label="Name" name="name" value={formData.name} onChange={handleChange} />
        <TextField margin="normal" fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
        <TextField margin="normal" fullWidth label="City" name="city" value={formData.city} onChange={handleChange} />
        <TextField margin="normal" fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
        <TextField margin="normal" fullWidth label="Expertise" name="expertise" value={formData.expertise} onChange={handleChange} />
        <TextField margin="normal" fullWidth label="Observations" name="observations" multiline rows={3} value={formData.observations} onChange={handleChange} />
        <FormControlLabel
          control={<Checkbox checked={formData.responded} onChange={handleChange} name="responded" />}
          label="Responded"
        />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} sx={{ mr: 1 }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isCreating || isUpdating}>
            {(isCreating || isUpdating) ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default WorkContactForm;
