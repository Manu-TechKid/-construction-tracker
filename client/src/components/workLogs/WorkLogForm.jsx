import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useCreateWorkLogMutation, useUpdateWorkLogMutation } from '../../features/workLogs/workLogsApiSlice';

const validationSchema = Yup.object({
  workCompleted: Yup.string()
    .required('Work completed description is required')
    .min(10, 'Please provide at least 10 characters describing the work')
    .max(1000, 'Description too long'),
  issues: Yup.string().max(500, 'Issues description too long'),
});

const WorkLogForm = ({ 
  open, 
  onClose, 
  timeSession, 
  workOrder = null,
  workLog = null, 
  isEdit = false 
}) => {
  const [createWorkLog, { isLoading: isCreating }] = useCreateWorkLogMutation();
  const [updateWorkLog, { isLoading: isUpdating }] = useUpdateWorkLogMutation();
  const [materials, setMaterials] = useState(workLog?.materialsUsed || []);
  const [photos, setPhotos] = useState([]);

  const formik = useFormik({
    initialValues: {
      workCompleted: workLog?.workCompleted || '',
      issues: workLog?.issues || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const formData = new FormData();
        
        // Add text fields
        if (timeSession?._id) {
          formData.append('timeSessionId', timeSession._id);
        }
        formData.append('workCompleted', values.workCompleted);
        formData.append('issues', values.issues);
        formData.append('materialsUsed', JSON.stringify(materials));
        
        if (timeSession?.building) {
          formData.append('buildingId', timeSession.building._id || timeSession.building);
        }
        if (timeSession?.workOrder) {
          formData.append('workOrderId', timeSession.workOrder._id || timeSession.workOrder);
        }

        if (!timeSession && workOrder?._id) {
          formData.append('workOrderId', workOrder._id);
          if (workOrder.building) {
            formData.append('buildingId', workOrder.building._id || workOrder.building);
          }
        }
        
        // Add photos
        photos.forEach(photo => {
          formData.append('photos', photo);
        });
        
        if (isEdit) {
          await updateWorkLog({ id: workLog._id, formData }).unwrap();
          toast.success('Work log updated successfully');
        } else {
          await createWorkLog(formData).unwrap();
          toast.success('Work log created successfully');
        }
        
        onClose();
      } catch (error) {
        console.error('Error saving work log:', error);
        toast.error(error?.data?.message || 'Failed to save work log');
      }
    },
  });

  const addMaterial = () => {
    setMaterials([...materials, { item: '', quantity: 1, unit: 'pieces' }]);
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handlePhotoChange = (event) => {
    const files = Array.from(event.target.files);
    setPhotos([...photos, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEdit ? 'Edit Work Log' : 'Create Work Log'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {timeSession && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Time Session:</strong> {new Date(timeSession.clockInTime).toLocaleDateString()} 
                {timeSession.clockOutTime && ` - ${new Date(timeSession.clockOutTime).toLocaleDateString()}`}
                <br />
                <strong>Building:</strong> {timeSession.building?.name || 'Not specified'}
                <br />
                <strong>Work Order:</strong> {timeSession.workOrder?.title || 'General work'}
              </Typography>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Work Completed */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="workCompleted"
                label="What work did you complete today? *"
                value={formik.values.workCompleted}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.workCompleted && Boolean(formik.errors.workCompleted)}
                helperText={formik.touched.workCompleted && formik.errors.workCompleted}
                placeholder="Describe in detail what work was completed, which areas were worked on, and any progress made..."
              />
            </Grid>

            {/* Issues */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="issues"
                label="Issues or Problems Encountered"
                value={formik.values.issues}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.issues && Boolean(formik.errors.issues)}
                helperText={formik.touched.issues && formik.errors.issues}
                placeholder="Describe any problems, delays, or issues that occurred during work..."
              />
            </Grid>

            {/* Materials Used */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Materials Used</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addMaterial}
                  variant="outlined"
                  size="small"
                >
                  Add Material
                </Button>
              </Box>

              {materials.map((material, index) => (
                <Box key={index} display="flex" gap={2} mb={2} alignItems="center">
                  <TextField
                    label="Item"
                    value={material.item}
                    onChange={(e) => updateMaterial(index, 'item', e.target.value)}
                    size="small"
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    label="Quantity"
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={material.unit}
                      onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                      label="Unit"
                    >
                      <MenuItem value="pieces">Pieces</MenuItem>
                      <MenuItem value="meters">Meters</MenuItem>
                      <MenuItem value="liters">Liters</MenuItem>
                      <MenuItem value="kg">Kilograms</MenuItem>
                      <MenuItem value="hours">Hours</MenuItem>
                      <MenuItem value="boxes">Boxes</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton onClick={() => removeMaterial(index)} color="error" size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Grid>

            {/* Photo Upload */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Progress Photos</Typography>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
              >
                Upload Photos
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </Button>

              {photos.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {photos.map((photo, index) => (
                    <Chip
                      key={index}
                      label={photo.name}
                      onDelete={() => removePhoto(index)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Grid>

            {/* Admin Feedback (if editing and feedback exists) */}
            {isEdit && workLog?.adminFeedback && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="subtitle2" gutterBottom>
                    Admin Feedback:
                  </Typography>
                  <Typography variant="body2">
                    {workLog.adminFeedback}
                  </Typography>
                  {workLog.adminFeedbackAt && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      By {workLog.adminFeedbackBy?.name} on {new Date(workLog.adminFeedbackAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isEdit ? 'Update' : 'Create'} Work Log
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default WorkLogForm;
