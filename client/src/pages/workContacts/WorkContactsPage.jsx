import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, IconButton, Chip, FormControl, InputLabel, Select, MenuItem, OutlinedInput } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useGetWorkContactsQuery, useDeleteWorkContactMutation } from '../../features/workContacts/workContactsApiSlice';
import { useGetSkillsQuery } from '../../features/skills/skillsApiSlice';
import WorkContactForm from '../../components/workContacts/WorkContactForm';

const WorkContactsPage = () => {
  const [skillFilter, setSkillFilter] = useState([]);
  const { data: workContactsData, isLoading, error } = useGetWorkContactsQuery({ expertise: skillFilter.join(',') });
  const { data: skillsData } = useGetSkillsQuery();
  const [deleteWorkContact] = useDeleteWorkContactMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const handleOpenModal = (contact = null) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedContact(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteWorkContact(id).unwrap();
      } catch (err) {
        console.error('Failed to delete work contact:', err);
      }
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading work contacts.</Alert>;
  }

  const contacts = workContactsData?.data || [];
  const skills = Array.isArray(skillsData?.data?.skills) ? skillsData.data.skills : [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Work Contacts
        </Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenModal()}>
          Add New Contact
        </Button>
      </Box>
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="skill-filter-label">Filter by Skills/Expertise</InputLabel>
          <Select
            labelId="skill-filter-label"
            multiple
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            input={<OutlinedInput label="Filter by Skills/Expertise" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(Array.isArray(selected) ? selected : []).map((value) => (
                  <Chip key={typeof value === 'string' ? value : JSON.stringify(value)} label={typeof value === 'string' ? value : ''} />
                ))}
              </Box>
            )}
          >
            {skills.map((skill) => (
              <MenuItem key={skill._id} value={skill.name}>
                {skill.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="work contacts table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Skills</TableCell>
              <TableCell>Called</TableCell>
              <TableCell>GW</TableCell>
              <TableCell>BW</TableCell>
              <TableCell>RW</TableCell>
              <TableCell>Obs</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact._id}>
                <TableCell>{contact.name}</TableCell>
                <TableCell>{contact.phone}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.city}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(Array.isArray(contact.expertise) ? contact.expertise : []).map((skill) => (
                      <Chip
                        key={skill?._id || skill?.id || String(skill)}
                        label={skill?.name || String(skill)}
                        sx={{ backgroundColor: skill?.color, color: 'white' }}
                        size="small"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{contact.responded ? 'Yes' : 'No'}</TableCell>
                <TableCell>{contact.rating === 'good' ? 'X' : ''}</TableCell>
                <TableCell>{contact.rating === 'bad' ? 'X' : ''}</TableCell>
                <TableCell>{contact.rating === 'regular' ? 'X' : ''}</TableCell>
                <TableCell>{typeof contact.observations === 'string' ? contact.observations : ''}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenModal(contact)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(contact._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <WorkContactForm open={isModalOpen} handleClose={handleCloseModal} contact={selectedContact} />
    </Box>
  );
};

export default WorkContactsPage;
