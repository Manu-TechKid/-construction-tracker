import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, IconButton, Chip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useGetSkillsQuery, useCreateSkillMutation, useUpdateSkillMutation, useDeleteSkillMutation } from '../../features/skills/skillsApiSlice';
import SkillForm from '../../components/settings/SkillForm';

const SkillsManagementPage = () => {
  const { data: skillsData, isLoading, error } = useGetSkillsQuery();
  const [deleteSkill] = useDeleteSkillMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const handleOpenModal = (skill = null) => {
    setSelectedSkill(skill);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedSkill(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this skill?')) {
      try {
        await deleteSkill(id).unwrap();
      } catch (err) {
        console.error('Failed to delete skill:', err);
      }
    }
  };

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error loading skills.</Alert>;

  const skills = skillsData?.data?.skills || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Skills Management</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenModal()}>Add New Skill</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Color</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {skills.map((skill) => (
              <TableRow key={skill._id}>
                <TableCell>{skill.name}</TableCell>
                <TableCell>
                  <Chip label={skill.name} sx={{ backgroundColor: skill.color, color: 'white' }} />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenModal(skill)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(skill._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <SkillForm open={isModalOpen} handleClose={handleCloseModal} skill={selectedSkill} />
    </Box>
  );
};

export default SkillsManagementPage;
