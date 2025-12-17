import React, { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress,
} from '@mui/material';
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
    type: Yup.string().required('Type is required'),
    priority: Yup.string().required('Priority is required'),
  });

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      building: '',
      buildingName: '',
      apartment: '',
      type: 'general',
      priority: 'medium',
      color: 'default',
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

  const colors = [
    { value: 'default', label: 'Default (Gray)', color: '#9e9e9e' },
    { value: 'red', label: 'Urgent (Red)', color: '#f44336' },
    { value: 'orange', label: 'High Priority (Orange)', color: '#ff9800' },
    { value: 'yellow', label: 'Medium Priority (Yellow)', color: '#ffeb3b' },
    { value: 'green', label: 'Low Priority (Green)', color: '#4caf50' },
    { value: 'blue', label: 'Info (Blue)', color: '#2196f3' },
    { value: 'purple', label: 'Review (Purple)', color: '#9c27b0' },
    { value: 'pink', label: 'Follow-up (Pink)', color: '#e91e63' },
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
                  formik.setFieldValue('type', newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Note Type"
                    placeholder="Type or select..."
                    helperText="Enter custom type or select from suggestions"
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
              <FormControl fullWidth>
                <InputLabel>Color / Urgency</InputLabel>
                <Select
                  name="color"
                  value={formik.values.color}
                  onChange={formik.handleChange}
                  label="Color / Urgency"
                >
                  {colors.map((color) => (
                    <MenuItem key={color.value} value={color.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, bgcolor: color.color, borderRadius: 1 }} />
                        {color.label}
                      </Box>
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
