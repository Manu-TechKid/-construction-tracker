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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
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
  endTime: Yup.date().required('End time is required'),
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
      startTime: initialValues?.startTime ? new Date(`1970-01-01T${new Date(initialValues.startTime).toTimeString().split(' ')[0]}`) : new Date(`1970-01-01T08:00:00`),
      endTime: initialValues?.endTime ? new Date(`1970-01-01T${new Date(initialValues.endTime).toTimeString().split(' ')[0]}`) : new Date(`1970-01-01T17:00:00`),
      status: initialValues?.status || 'scheduled',
      notes: initialValues?.notes || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        
        // Combine date with start and end times
        const startDateTime = new Date(values.date);
        const endDateTime = new Date(values.date);
        
        if (values.startTime) {
          startDateTime.setHours(values.startTime.getHours(), values.startTime.getMinutes());
        }
        
        if (values.endTime) {
          endDateTime.setHours(values.endTime.getHours(), values.endTime.getMinutes());
        }
        
        // Format dates for API
        const scheduleData = {
          workOrder: values.workOrder,
          worker: values.worker,
          date: values.date.toISOString().split('T')[0],
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          status: values.status,
          notes: values.notes,
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
        startTime: initialValues.startTime ? new Date(`1970-01-01T${new Date(initialValues.startTime).toTimeString().split(' ')[0]}`) : new Date(`1970-01-01T08:00:00`),
        endTime: initialValues.endTime ? new Date(`1970-01-01T${new Date(initialValues.endTime).toTimeString().split(' ')[0]}`) : new Date(`1970-01-01T17:00:00`),
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
                <DatePicker
                  label="Date"
                  value={formik.values.date}
                  onChange={(date) => formik.setFieldValue('date', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.date && Boolean(formik.errors.date),
                      helperText: formik.touched.date && formik.errors.date
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Start Time"
                  value={formik.values.startTime}
                  onChange={(time) => formik.setFieldValue('startTime', time)}
                  ampm={true}
                  views={['hours', 'minutes']}
                  format="hh:mm a"
                  minTime={new Date(0, 0, 0, 0, 0)} // 12:00 AM
                  maxTime={new Date(0, 0, 0, 23, 59)} // 11:59 PM
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.startTime && Boolean(formik.errors.startTime),
                      helperText: formik.touched.startTime && formik.errors.startTime
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="End Time"
                  value={formik.values.endTime}
                  onChange={(time) => formik.setFieldValue('endTime', time)}
                  ampm={true}
                  views={['hours', 'minutes']}
                  format="hh:mm a"
                  minTime={new Date(0, 0, 0, 0, 0)} // 12:00 AM
                  maxTime={new Date(0, 0, 0, 23, 59)} // 11:59 PM
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.endTime && Boolean(formik.errors.endTime),
                      helperText: formik.touched.endTime && formik.errors.endTime
                    }
                  }}
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
