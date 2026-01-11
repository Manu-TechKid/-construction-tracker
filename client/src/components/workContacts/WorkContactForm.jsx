import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Checkbox, FormControlLabel, CircularProgress, Radio, RadioGroup, FormControl, FormLabel, Select, MenuItem, InputLabel, Chip, OutlinedInput } from '@mui/material';
import { useCreateWorkContactMutation, useUpdateWorkContactMutation } from '../../features/workContacts/workContactsApiSlice';
import { useGetSkillsQuery, useCreateSkillMutation } from '../../features/skills/skillsApiSlice';
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

const WorkContactForm = ({ open, handleClose, contact }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    email: '',
    expertise: [],
    responded: false,
    observations: '',
    rating: 'unrated',
  });
  const [newSkill, setNewSkill] = useState('');
  const [newSkillColor, setNewSkillColor] = useState('#FFFFFF');

  const [createWorkContact, { isLoading: isCreating }] = useCreateWorkContactMutation();
  const [updateWorkContact, { isLoading: isUpdating }] = useUpdateWorkContactMutation();
  const { data: skillsData } = useGetSkillsQuery();
  const [createSkill] = useCreateSkillMutation();

  useEffect(() => {
    if (contact) {
      setFormData({
        ...contact,
        expertise: contact.expertise.map(skill => skill._id),
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        city: '',
        email: '',
        expertise: [],
        responded: false,
        observations: '',
        rating: 'unrated',
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
        <FormControl fullWidth margin="normal">
          <InputLabel id="expertise-select-label">Skills</InputLabel>
          <Select
            labelId="expertise-select-label"
            multiple
            value={formData.expertise}
            onChange={handleChange}
            name="expertise"
            input={<OutlinedInput id="select-multiple-chip" label="Skills" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const skill = skillsData?.data.skills.find(s => s._id === value);
                  return <Chip key={value} label={skill?.name} sx={{ backgroundColor: skill?.color, color: '#fff' }} />;
                })}
              </Box>
            )}
          >
            {skillsData?.data.skills.map((skill) => (
              <MenuItem key={skill._id} value={skill._id}>
                {skill.name}
              </MenuItem>
            ))}
          </Select>
          <TextField
            margin="normal"
            fullWidth
            label="Add New Skill"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
          />
          <MuiColorInput
            value={newSkillColor}
            onChange={(color) => setNewSkillColor(color)}
            format="hex"
            fullWidth
          />
          <Button
            onClick={async () => {
              if (newSkill) {
                await createSkill({ name: newSkill, color: newSkillColor });
                setNewSkill('');
                setNewSkillColor('#FFFFFF');
              }
            }}
            sx={{ mt: 1 }}
          >
            Add Skill
          </Button>
        </FormControl>
        <TextField margin="normal" fullWidth label="Observations" name="observations" multiline rows={3} value={formData.observations} onChange={handleChange} />
        <FormControlLabel
          control={<Checkbox checked={formData.responded} onChange={handleChange} name="responded" />}
          label="He/She was called"
        />
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">Worker Rating</FormLabel>
          <RadioGroup row name="rating" value={formData.rating} onChange={handleChange}>
            <FormControlLabel value="good" control={<Radio />} label="GW" />
            <FormControlLabel value="bad" control={<Radio />} label="BW" />
            <FormControlLabel value="regular" control={<Radio />} label="RW" />
          </RadioGroup>
        </FormControl>
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
