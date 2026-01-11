import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { useCreateSkillMutation, useUpdateSkillMutation } from '../../features/skills/skillsApiSlice';
import { MuiColorInput } from 'mui-color-input';

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

const SkillForm = ({ open, handleClose, skill }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FFFFFF');

  const [createSkill, { isLoading: isCreating }] = useCreateSkillMutation();
  const [updateSkill, { isLoading: isUpdating }] = useUpdateSkillMutation();

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setColor(skill.color);
    } else {
      setName('');
      setColor('#FFFFFF');
    }
  }, [skill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (skill) {
        await updateSkill({ id: skill._id, name, color }).unwrap();
      } else {
        await createSkill({ name, color }).unwrap();
      }
      handleClose();
    } catch (err) {
      console.error('Failed to save skill:', err);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style} component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" component="h2">
          {skill ? 'Edit Skill' : 'Add New Skill'}
        </Typography>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Skill Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <MuiColorInput
          margin="normal"
          required
          fullWidth
          label="Color"
          value={color}
          onChange={(color) => setColor(color)}
          format="hex"
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

export default SkillForm;
