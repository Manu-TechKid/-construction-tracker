import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  FormHelperText,
  Box,
  Typography
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSnackbar } from 'notistack';

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const validationSchema = Yup.object({
  workOrder: Yup.string().required('Work Order is required'),
  worker: Yup.string().required('Worker is required'),
  date: Yup.date().required('Date is required'),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date()
    .required('End time is required')
    .min(Yup.ref('startTime'), 'End time must be after start time'),
  status: Yup.string().required('Status is required'),
  notes: Yup.string(),
});

const ScheduleForm = ({ 
  open, 
  onClose, 
  initialValues = null,
  workOrders = [],
  workers = [],
  onSubmit
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      workOrder: initialValues?.workOrder?._id || '',
      worker: initialValues?.worker?._id || '',
      date: initialValues?.date ? new Date(initialValues.date) : new Date(),
      startTime: initialValues?.startTime ? new Date(initialValues.startTime) : new Date(),
      endTime: initialValues?.endTime ? new Date(initialValues.endTime) : new Date(Date.now() + 3600000), // 1 hour later
      status: initialValues?.status || 'scheduled',
      notes: initialValues?.notes || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        
        // Format dates for API
        const scheduleData = {
          ...values,
          startTime: values.startTime.toISOString(),
          endTime: values.endTime.toISOString(),
          date: values.date.toISOString().split('T')[0],
        };

        await onSubmit(scheduleData);
        enqueueSnackbar('Schedule saved successfully', { variant: 'success' });
        onClose();
      } catch (error) {
        console.error('Error saving schedule:', error);
        enqueueSnackbar(error.response?.data?.message || 'Error saving schedule', { variant: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Update form when initialValues change (for edit mode)
  useEffect(() => {
    if (initialValues) {
      formik.setValues({
        workOrder: initialValues.workOrder?._id || '',
        worker: initialValues.worker?._id || '',
        date: initialValues.date ? new Date(initialValues.date) : new Date(),
        startTime: initialValues.startTime ? new Date(initialValues.startTime) : new Date(),
        endTime: initialValues.endTime ? new Date(initialValues.endTime) : new Date(Date.now() + 3600000),
        status: initialValues.status || 'scheduled',
        notes: initialValues.notes || '',
      });
    }
  }, [initialValues]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialValues ? 'Edit Schedule' : 'Create New Schedule'}
      </DialogTitle>
      
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth error={formik.touched.workOrder && Boolean(formik.errors.workOrder)}>
                <InputLabel>Work Order</InputLabel>
                <Select
                  name="workOrder"
                  value={formik.values.workOrder}
                  onChange={formik.handleChange}
                  label="Work Order"
                >
                  {workOrders.map((wo) => (
                    <MenuItem key={wo._id} value={wo._id}>
                      {`${wo.workType} - ${wo.building?.name || 'N/A'}`}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.workOrder && formik.errors.workOrder}
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={formik.touched.worker && Boolean(formik.errors.worker)}>
                <InputLabel>Worker</InputLabel>
                <Select
                  name="worker"
                  value={formik.values.worker}
                  onChange={formik.handleChange}
                  label="Worker"
                >
                  {workers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {`${worker.firstName} ${worker.lastName}`}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.worker && formik.errors.worker}
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Time"
                  value={formik.values.startTime}
                  onChange={(date) => formik.setFieldValue('startTime', date)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      fullWidth 
                      error={formik.touched.startTime && Boolean(formik.errors.startTime)}
                      helperText={formik.touched.startTime && formik.errors.startTime}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="End Time"
                  value={formik.values.endTime}
                  minDateTime={formik.values.startTime}
                  onChange={(date) => formik.setFieldValue('endTime', date)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      fullWidth 
                      error={formik.touched.endTime && Boolean(formik.errors.endTime)}
                      helperText={formik.touched.endTime && formik.errors.endTime}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.status && Boolean(formik.errors.status)}>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  label="Status"
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.status && formik.errors.status}
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="notes"
                label="Notes"
                value={formik.values.notes}
                onChange={formik.handleChange}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ScheduleForm;
