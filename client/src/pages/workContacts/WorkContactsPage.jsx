import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, IconButton, TextField } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useGetWorkContactsQuery, useDeleteWorkContactMutation } from '../../features/workContacts/workContactsApiSlice';
import WorkContactForm from '../../components/workContacts/WorkContactForm';

const WorkContactsPage = () => {
  const [filter, setFilter] = useState('');
  const { data: workContactsData, isLoading, error } = useGetWorkContactsQuery({ expertise: filter });
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
        <TextField 
          label="Filter by Skills/Expertise"
          variant="outlined"
          fullWidth
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
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
                <TableCell>{contact.expertise}</TableCell>
                <TableCell>{contact.responded ? 'Yes' : 'No'}</TableCell>
                <TableCell>{contact.rating === 'good' ? 'X' : ''}</TableCell>
                <TableCell>{contact.rating === 'bad' ? 'X' : ''}</TableCell>
                <TableCell>{contact.rating === 'regular' ? 'X' : ''}</TableCell>
                <TableCell>{contact.observations}</TableCell>
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
