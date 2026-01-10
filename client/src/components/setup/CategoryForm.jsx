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

const CategoryForm = ({ open, handleClose, category, onSave, isLoading }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ffffff');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
    } else {
      setName('');
      setColor('#ffffff');
    }
  }, [category, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, color });
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style} component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" component="h2">
          {category ? 'Edit Category' : 'Add New Category'}
        </Typography>
        <TextField 
          margin="normal" 
          required 
          fullWidth 
          label="Category Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <TextField 
          margin="normal" 
          required 
          fullWidth 
          label="Color" 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
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

export default CategoryForm;
