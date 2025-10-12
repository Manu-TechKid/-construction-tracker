import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Business as BuildingIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import {
  useGetProjectEstimateQuery,
  useUpdateProjectEstimateMutation
} from '../../features/projectEstimates/projectEstimatesApiSlice';

const defaultFormState = {
  title: '',
  description: '',
  building: '',
  apartmentNumber: '',
  estimatedCost: '',
  estimatedPrice: '',
  estimatedDuration: 1,
  visitDate: '',
  proposedStartDate: '',
  targetYear: new Date().getFullYear(),
  priority: 'medium',
  notes: '',
  clientNotes: ''
};

const EditProjectEstimate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [formData, setFormData] = useState(defaultFormState);
  const [errors, setErrors] = useState({});

  const { data: buildingsData, isLoading: buildingsLoading } = useGetBuildingsQuery();
  const { data: estimateData, isLoading: estimateLoading, error: estimateError } = useGetProjectEstimateQuery(id, {
    skip: !id
  });
  const [updateProjectEstimate, { isLoading: isUpdating }] = useUpdateProjectEstimateMutation();

  const buildings = useMemo(
    () => buildingsData?.data?.buildings || [],
    [buildingsData]
  );

  useEffect(() => {
    if (estimateData?.data?.projectEstimate) {
      const estimate = estimateData.data.projectEstimate;
      setFormData({
        title: estimate.title || '',
        description: estimate.description || '',
        building: estimate.building?._id || estimate.building || '',
        apartmentNumber: estimate.apartmentNumber || '',
        estimatedCost: estimate.estimatedCost != null ? estimate.estimatedCost : '',
        estimatedPrice: estimate.estimatedPrice != null ? estimate.estimatedPrice : '',
        estimatedDuration: estimate.estimatedDuration || 1,
        visitDate: estimate.visitDate ? format(new Date(estimate.visitDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        proposedStartDate: estimate.proposedStartDate ? format(new Date(estimate.proposedStartDate), 'yyyy-MM-dd') : '',
        targetYear: estimate.targetYear || new Date().getFullYear(),
        priority: estimate.priority || 'medium',
        notes: estimate.notes || '',
        clientNotes: estimate.clientNotes || ''
      });
    }
  }, [estimateData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.building) newErrors.building = 'Building is required';
    if (!formData.estimatedCost || Number(formData.estimatedCost) <= 0) newErrors.estimatedCost = 'Valid estimated cost is required';
    if (!formData.estimatedPrice || Number(formData.estimatedPrice) <= 0) newErrors.estimatedPrice = 'Valid estimated price is required';
    if (Number(formData.estimatedPrice) < Number(formData.estimatedCost)) {
      newErrors.estimatedPrice = 'Price must be greater than or equal to cost';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      const submitData = {
        id,
        title: formData.title,
        description: formData.description,
        building: formData.building,
        apartmentNumber: formData.apartmentNumber || undefined,
        estimatedCost: Number(formData.estimatedCost),
        estimatedPrice: Number(formData.estimatedPrice),
        estimatedDuration: Number(formData.estimatedDuration) || 1,
        visitDate: formData.visitDate ? new Date(formData.visitDate).toISOString() : undefined,
        proposedStartDate: formData.proposedStartDate ? new Date(formData.proposedStartDate).toISOString() : undefined,
        targetYear: Number(formData.targetYear) || new Date().getFullYear(),
        priority: formData.priority,
        notes: formData.notes,
        clientNotes: formData.clientNotes
      };

      await updateProjectEstimate(submitData).unwrap();
      toast.success('Project estimate updated successfully');
      navigate('/projects-pending-approval');
    } catch (error) {
      console.error('Failed to update project estimate:', error);
      toast.error(error?.data?.message || 'Failed to update project estimate');
    }
  };

  if (estimateLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Loading project estimate...
        </Typography>
      </Container>
    );
  }

  if (estimateError) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error">
          Failed to load project estimate. {estimateError?.data?.message || estimateError?.message || 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/projects-pending-approval')}
            variant="outlined"
            disabled={isUpdating}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Edit Project Estimate
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildingIcon />
                    Basic Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Project Title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        error={Boolean(errors.title)}
                        helperText={errors.title}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required error={Boolean(errors.building)}>
                        <InputLabel>Building</InputLabel>
                        <Select
                          value={formData.building}
                          label="Building"
                          onChange={(e) => handleInputChange('building', e.target.value)}
                          disabled={buildingsLoading}
                        >
                          {buildings.map((building) => (
                            <MenuItem key={building._id} value={building._id}>
                              {building.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.building && (
                          <Typography variant="caption" color="error">{errors.building}</Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Apartment Number"
                        value={formData.apartmentNumber}
                        onChange={(e) => handleInputChange('apartmentNumber', e.target.value)}
                        placeholder="Optional"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={formData.priority}
                          label="Priority"
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="urgent">Urgent</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        error={Boolean(errors.description)}
                        helperText={errors.description}
                        required
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon />
                    Financial Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Estimated Cost ($)"
                        type="number"
                        value={formData.estimatedCost}
                        onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                        error={Boolean(errors.estimatedCost)}
                        helperText={errors.estimatedCost}
                        InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Estimated Price ($)"
                        type="number"
                        value={formData.estimatedPrice}
                        onChange={(e) => handleInputChange('estimatedPrice', e.target.value)}
                        error={Boolean(errors.estimatedPrice)}
                        helperText={errors.estimatedPrice}
                        InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Estimated Duration (days)"
                        type="number"
                        value={formData.estimatedDuration}
                        onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                        InputProps={{ inputProps: { min: 1 } }}
                      />
                    </Grid>
                  </Grid>

                  {formData.estimatedCost && formData.estimatedPrice && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Profit Analysis
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Estimated Profit:</Typography>
                        <Typography
                          variant="body2"
                          color={Number(formData.estimatedPrice) - Number(formData.estimatedCost) >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          ${((Number(formData.estimatedPrice) || 0) - (Number(formData.estimatedCost) || 0)).toFixed(2)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Profit Margin:</Typography>
                        <Typography
                          variant="body2"
                          color={Number(formData.estimatedPrice) - Number(formData.estimatedCost) >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {Number(formData.estimatedPrice)
                            ? (((Number(formData.estimatedPrice) - Number(formData.estimatedCost)) / Number(formData.estimatedPrice)) * 100).toFixed(1)
                            : '0.0'}%
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon />
                    Schedule Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Visit Date"
                        type="date"
                        value={formData.visitDate}
                        onChange={(e) => handleInputChange('visitDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Proposed Start Date"
                        type="date"
                        value={formData.proposedStartDate}
                        onChange={(e) => handleInputChange('proposedStartDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Target Year"
                        type="number"
                        value={formData.targetYear}
                        onChange={(e) => handleInputChange('targetYear', e.target.value)}
                        InputProps={{ inputProps: { min: 2024, max: 2035 } }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Additional Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Internal Notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Internal notes for the project team"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Client Notes"
                        value={formData.clientNotes}
                        onChange={(e) => handleInputChange('clientNotes', e.target.value)}
                        placeholder="Notes to share with the client"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Metadata
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Created By"
                        value={estimateData?.data?.projectEstimate?.createdBy?.name || user?.name || 'Unknown'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Last Updated"
                        value={estimateData?.data?.projectEstimate?.updatedAt ? new Date(estimateData.data.projectEstimate.updatedAt).toLocaleString() : 'N/A'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/projects-pending-approval')}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={isUpdating ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Container>
  );
};

export default EditProjectEstimate;
