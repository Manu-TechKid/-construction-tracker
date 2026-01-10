import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, CircularProgress } from '@mui/material';

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

const SubTypeForm = ({ open, handleClose, subType, onSave, isLoading }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (subType) {
      setName(subType.name);
    } else {
      setName('');
    }
  }, [subType, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name });
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style} component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" component="h2">
          {subType ? 'Edit Service' : 'Add New Service'}
        </Typography>
        <TextField 
          margin="normal" 
          required 
          fullWidth 
          label="Service Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} sx={{ mr: 1 }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SubTypeForm;
