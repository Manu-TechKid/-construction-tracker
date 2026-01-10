import React, { useState } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, IconButton, CircularProgress, Alert, Collapse } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, ExpandLess, ExpandMore } from '@mui/icons-material';
import { useGetWorkTypesQuery, useCreateWorkTypeMutation, useUpdateWorkTypeMutation, useDeleteWorkTypeMutation, useGetWorkSubTypesQuery, useCreateWorkSubTypeMutation, useUpdateWorkSubTypeMutation, useDeleteWorkSubTypeMutation } from '../../features/setup/setupApiSlice';
import CategoryForm from '../../components/setup/CategoryForm';
import SubTypeForm from '../../components/setup/SubTypeForm';

const CategoryManagementPage = () => {
  const { data: workTypesData, isLoading, isError, error } = useGetWorkTypesQuery();
  const [createWorkType, { isLoading: isCreating }] = useCreateWorkTypeMutation();
  const [updateWorkType, { isLoading: isUpdating }] = useUpdateWorkTypeMutation();
  const [deleteWorkType] = useDeleteWorkTypeMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [openSubTypes, setOpenSubTypes] = useState({});

  const handleOpenModal = (category = null) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleToggleSubTypes = (categoryId) => {
    setOpenSubTypes(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleSave = async (formData) => {
    try {
      if (selectedCategory) {
        await updateWorkType({ id: selectedCategory._id, ...formData }).unwrap();
      } else {
        await createWorkType(formData).unwrap();
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save category:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteWorkType(id).unwrap();
      } catch (err) {
        console.error('Failed to delete work type:', err);
      }
    }
  };

  let content;

  if (isLoading) {
    content = <CircularProgress />;
  } else if (isError) {
    content = <Alert severity="error">{error.toString()}</Alert>;
  } else {
    const workTypes = workTypesData?.data?.workTypes || [];
    content = (
      <List>
        {workTypes.map((workType) => (
          <React.Fragment key={workType._id}>
            <ListItem button onClick={() => handleToggleSubTypes(workType._id)}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: workType.color || '#ccc', mr: 2 }} />
              <ListItemText primary={workType.name} />
              {openSubTypes[workType._id] ? <ExpandLess /> : <ExpandMore />}
              <IconButton edge="end" aria-label="edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(workType); }}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDelete(workType._id); }}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
            <Collapse in={openSubTypes[workType._id]} timeout="auto" unmountOnExit>
              <SubTypesList workTypeId={workType._id} />
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Category Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
          Add Category
        </Button>
      </Box>
      <Paper sx={{ p: 2 }}>
        {content}
      </Paper>
      <CategoryForm 
        open={isModalOpen}
        handleClose={handleCloseModal}
        category={selectedCategory}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
};

const SubTypesList = ({ workTypeId }) => {
  const { data: subTypesData, isLoading, isError } = useGetWorkSubTypesQuery(workTypeId);
  const [createWorkSubType, { isLoading: isCreating }] = useCreateWorkSubTypeMutation();
  const [updateWorkSubType, { isLoading: isUpdating }] = useUpdateWorkSubTypeMutation();
  const [deleteWorkSubType] = useDeleteWorkSubTypeMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubType, setSelectedSubType] = useState(null);

  const handleOpenModal = (subType = null) => {
    setSelectedSubType(subType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubType(null);
  };

  const handleSave = async (formData) => {
    try {
      if (selectedSubType) {
        await updateWorkSubType({ id: selectedSubType._id, ...formData }).unwrap();
      } else {
        await createWorkSubType({ ...formData, workType: workTypeId }).unwrap();
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save sub-type:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteWorkSubType(id).unwrap();
      } catch (err) {
        console.error('Failed to delete sub-type:', err);
      }
    }
  };

  if (isLoading) return <CircularProgress sx={{ ml: 4 }} />;
  if (isError) return <Alert severity="error" sx={{ ml: 4 }}>Failed to load services.</Alert>;

  const subTypes = subTypesData?.data?.workSubTypes || [];

  return (
    <Box sx={{ pl: 4 }}>
      <List component="div" disablePadding>
        {subTypes.map((subType) => (
          <ListItem 
            key={subType._id}
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="edit" onClick={() => handleOpenModal(subType)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(subType._id)}>
                  <DeleteIcon />
                </IconButton>
              </>
            }
          >
            <ListItemText primary={subType.name} />
          </ListItem>
        ))}
      </List>
      <Button startIcon={<AddIcon />} onClick={() => handleOpenModal()} sx={{ mt: 1 }}>
        Add Service
      </Button>
      <SubTypeForm 
        open={isModalOpen}
        handleClose={handleCloseModal}
        subType={selectedSubType}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
};

export default CategoryManagementPage;
