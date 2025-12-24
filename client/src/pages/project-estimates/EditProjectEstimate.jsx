import React, { useState, useEffect } from 'react';
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
  CircularProgress
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
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetProjectEstimateQuery, useUpdateProjectEstimateMutation } from '../../features/estimates/projectEstimatesApiSlice';
import LineItemEditor from '../../components/estimates/LineItemEditor';

const EditProjectEstimate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: estimateData, isLoading: isLoadingEstimate } = useGetProjectEstimateQuery(id);
  const estimate = estimateData?.data?.projectEstimate;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: '',
    apartmentNumber: '',
    estimatedCost: '',
    estimatedPrice: '',
    estimatedDuration: 1,
    visitDate: format(new Date(), 'yyyy-MM-dd'),
    proposedStartDate: '',
    targetYear: new Date().getFullYear(),
    priority: 'medium',
    notes: '',
    clientNotes: '',
    lineItems: []
  });

  useEffect(() => {
    if (estimate) {
      setFormData({
        title: estimate.title || '',
        description: estimate.description || '',
        building: estimate.building?._id || estimate.building || '',
        apartmentNumber: estimate.apartmentNumber || '',
        estimatedCost: estimate.estimatedCost || '',
        estimatedPrice: estimate.estimatedPrice || '',
        estimatedDuration: estimate.estimatedDuration || 1,
        visitDate: estimate.visitDate ? format(new Date(estimate.visitDate), 'yyyy-MM-dd') : '',
        proposedStartDate: estimate.proposedStartDate ? format(new Date(estimate.proposedStartDate), 'yyyy-MM-dd') : '',
        targetYear: estimate.targetYear || new Date().getFullYear(),
        priority: estimate.priority || 'medium',
        notes: estimate.notes || '',
        clientNotes: estimate.clientNotes || '',
        lineItems: estimate.lineItems || []
      });
    }
  }, [estimate]);

  const [errors, setErrors] = useState({});
  const { data: buildingsData, isLoading: buildingsLoading } = useGetBuildingsQuery();
  const [updateProjectEstimate, { isLoading: isUpdating }] = useUpdateProjectEstimateMutation();

  const buildings = buildingsData?.data?.buildings || [];

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
    
    if (formData.lineItems.length === 0) {
      if (!formData.estimatedPrice || formData.estimatedPrice <= 0) {
        newErrors.estimatedPrice = 'Valid estimated price is required when not using line items';
      }
      if (formData.estimatedCost && formData.estimatedPrice && parseFloat(formData.estimatedPrice) < parseFloat(formData.estimatedCost)) {
        newErrors.estimatedPrice = 'Price must be greater than or equal to cost';
      }
    } else {
      if (formData.lineItems.some(item => !item.productService || !item.description)) {
        newErrors.lineItems = 'All line items must have product/service and description';
      }
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
        ...formData,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
        estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : 0,
        estimatedDuration: parseInt(formData.estimatedDuration),
        targetYear: parseInt(formData.targetYear),
        lineItems: formData.lineItems
      };

      await updateProjectEstimate({ id, ...submitData }).unwrap();

      toast.success('Project estimate updated successfully!');
      navigate('/estimates');
    } catch (error) {
      console.error('Failed to update project estimate:', error);
      toast.error(error?.data?.message || 'Failed to update project estimate');
    }
  };

  const calculateProfit = () => {
    const cost = parseFloat(formData.estimatedCost) || 0;
    const price = parseFloat(formData.estimatedPrice) || 0;
    return price - cost;
  };

  const calculateProfitMargin = () => {
    const profit = calculateProfit();
    const price = parseFloat(formData.estimatedPrice) || 0;
    if (price === 0) return 0;
    return ((profit / price) * 100).toFixed(1);
  };

  if (isLoadingEstimate) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!estimate) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Project estimate not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/estimates')}
            variant="outlined"
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Edit Project Estimate
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
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
                        error={!!errors.title}
                        helperText={errors.title}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required error={!!errors.building}>
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
                        {errors.building && <Typography variant="caption" color="error">{errors.building}</Typography>}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Service Location"
                        value={formData.apartmentNumber}
                        onChange={(e) => handleInputChange('apartmentNumber', e.target.value)}
                        placeholder="e.g., Apt 101, Parking Lot, Roof, Basement, Drainage System"
                        helperText="Specify exact location: apartment, parking, roof, basement, etc."
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
                        error={!!errors.description}
                        helperText={errors.description}
                        required
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Line Items Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <LineItemEditor
                    lineItems={formData.lineItems}
                    onChange={(newLineItems) => handleInputChange('lineItems', newLineItems)}
                  />
                  {errors.lineItems && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {errors.lineItems}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Financial Information */}
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
                        error={!!errors.estimatedCost}
                        helperText={
                          errors.estimatedCost || 
                          (formData.lineItems.length > 0 
                            ? 'Auto-calculated from line items (editable for manual override)' 
                            : 'Optional - Leave blank if cost is unknown')
                        }
                        InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Estimated Price ($)"
                        type="number"
                        value={formData.estimatedPrice}
                        onChange={(e) => handleInputChange('estimatedPrice', e.target.value)}
                        error={!!errors.estimatedPrice}
                        helperText={
                          errors.estimatedPrice || 
                          (formData.lineItems.length > 0 
                            ? 'Auto-calculated from line items (editable for manual override)' 
                            : 'Required when not using line items')
                        }
                        InputProps={{ inputProps: { min: 0, step: 0.01 } }}
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

                  {/* Profit Calculation */}
                  {formData.estimatedCost && formData.estimatedPrice && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Profit Analysis
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Estimated Profit:</Typography>
                        <Typography
                          variant="body2"
                          color={calculateProfit() >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          ${calculateProfit().toFixed(2)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Profit Margin:</Typography>
                        <Typography
                          variant="body2"
                          color={calculateProfit() >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {calculateProfitMargin()}%
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Schedule Information */}
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
                        InputProps={{ inputProps: { min: 2024, max: 2030 } }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Additional Notes */}
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

            {/* Actions */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/estimates')}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={isUpdating}
                  size="large"
                >
                  {isUpdating ? <CircularProgress size={20} /> : 'Update Project Estimate'}
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
