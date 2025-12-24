import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSearchBuildingsQuery, useCreateNoteMutation, useUpdateNoteMutation } from '../../features/notes/notesApiSlice';
import { toast } from 'react-toastify';

const NoteForm = ({ initialValues, onSubmit, onCancel, isEditing = false }) => {
  const [buildingSearch, setBuildingSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  
  const { data: buildingsData, isLoading: searchLoading } = useSearchBuildingsQuery(buildingSearch, {
    skip: buildingSearch.length < 2
  });
  
  const [createNote, { isLoading: creating }] = useCreateNoteMutation();
  const [updateNote, { isLoading: updating }] = useUpdateNoteMutation();
  
  const buildings = buildingsData?.data?.buildings || [];
  
  const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    content: Yup.string().required('Content is required'),
    building: Yup.string().when('buildingName', {
      is: (buildingName) => !buildingName,
      then: Yup.string().required('Building is required'),
      otherwise: Yup.string()
    }),
    buildingName: Yup.string(),
    type: Yup.string(),
    priority: Yup.string().required('Priority is required'),
  });

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      building: '',
      buildingName: '',
      apartment: '',
      type: '',
      priority: 'medium',
      color: '#1976d2',
      status: 'active',
      estimateStatus: 'not_applicable',
      estimateAmount: '',
      tags: [],
      ...initialValues,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const noteData = {
          ...values,
          building: selectedBuilding?._id || values.building,
          buildingName: selectedBuilding?.name || buildingSearch,
        };
        
        if (isEditing) {
          await updateNote({ id: initialValues._id, ...noteData }).unwrap();
          toast.success('Note updated successfully');
        } else {
          await createNote(noteData).unwrap();
          toast.success('Note created successfully');
        }
        
        if (onSubmit) onSubmit(noteData);
      } catch (error) {
        console.error('Error saving note:', error);
        toast.error(error?.data?.message || 'Error saving note');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const noteTypesSuggestions = [
    'General Note',
    'Building Visit',
    'Estimate',
    'Inspection',
    'Meeting',
    'Building Service'
  ];

  const predefinedColors = [
    { label: 'Blue', color: '#1976d2' },
    { label: 'Red', color: '#f44336' },
    { label: 'Orange', color: '#ff9800' },
    { label: 'Yellow', color: '#fdd835' },
    { label: 'Green', color: '#4caf50' },
    { label: 'Purple', color: '#9c27b0' },
    { label: 'Pink', color: '#e91e63' },
    { label: 'Teal', color: '#00bcd4' },
    { label: 'Gray', color: '#9e9e9e' },
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'postponed', label: 'Postponed' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'archived', label: 'Archived' },
  ];

  const estimateStatuses = [
    { value: 'not_applicable', label: 'Not Applicable' },
    { value: 'pending', label: 'Pending Response' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {isEditing ? 'Edit Note' : 'Create New Note'}
        </Typography>
        
        <Box component="form" onSubmit={formik.handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="title"
                label="Title"
                value={formik.values.title}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.title && Boolean(formik.errors.title)}
                helperText={formik.touched.title && formik.errors.title}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={buildings}
                getOptionLabel={(option) => `${option.name} - ${option.address}`}
                loading={searchLoading}
                onInputChange={(event, newInputValue) => {
                  setBuildingSearch(newInputValue);
                }}
                onChange={(event, newValue) => {
                  setSelectedBuilding(newValue);
                  formik.setFieldValue('building', newValue?._id || '');
                  formik.setFieldValue('buildingName', newValue?.name || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Building (search by name)"
                    placeholder="Type 'Mario Square' to search..."
                    error={formik.touched.building && Boolean(formik.errors.building)}
                    helperText={formik.touched.building && formik.errors.building}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="apartment"
                label="Apartment Number"
                value={formik.values.apartment}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="content"
                label="Content"
                value={formik.values.content}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.content && Boolean(formik.errors.content)}
                helperText={formik.touched.content && formik.errors.content}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={noteTypesSuggestions}
                value={formik.values.type}
                onInputChange={(event, newValue) => {
                  formik.setFieldValue('type', newValue || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Note Type (Optional)"
                    placeholder="Type custom text or select..."
                    helperText="Leave empty or enter custom type"
                    error={formik.touched.type && Boolean(formik.errors.type)}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formik.values.priority}
                  onChange={formik.handleChange}
                  label="Priority"
                >
                  {priorities.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="color"
                label="Note Color"
                type="color"
                value={formik.values.color}
                onChange={formik.handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PaletteIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Choose a color for this note"
              />
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                {predefinedColors.map((presetColor) => (
                  <IconButton
                    key={presetColor.color}
                    size="small"
                    onClick={() => formik.setFieldValue('color', presetColor.color)}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: presetColor.color,
                      border: formik.values.color === presetColor.color ? '2px solid #000' : '1px solid #ddd',
                      '&:hover': {
                        bgcolor: presetColor.color,
                        opacity: 0.8,
                      },
                    }}
                    title={presetColor.label}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  label="Status"
                >
                  {statuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estimate Status</InputLabel>
                <Select
                  name="estimateStatus"
                  value={formik.values.estimateStatus}
                  onChange={formik.handleChange}
                  label="Estimate Status"
                >
                  {estimateStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {formik.values.estimateStatus !== 'not_applicable' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="estimateAmount"
                  label="Estimate Amount"
                  type="number"
                  value={formik.values.estimateAmount}
                  onChange={formik.handleChange}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
              </Grid>
            )}
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting || creating || updating}
              startIcon={formik.isSubmitting ? <CircularProgress size={16} /> : null}
            >
              {formik.isSubmitting ? 'Saving...' : isEditing ? 'Update Note' : 'Create Note'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NoteForm;
