import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/users/usersApiSlice';

const TestWorkOrderForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: '',
    apartmentNumber: '',
    priority: 'medium',
    status: 'pending',
    scheduledDate: new Date().toISOString().split('T')[0],
    assignedTo: [],
    services: [{
      type: 'repair',
      description: 'Test service',
      laborCost: 100,
      materialCost: 50,
      estimatedHours: 2,
      status: 'pending'
    }]
  });

  const [createWorkOrder, { isLoading }] = useCreateWorkOrderMutation();
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: workersData } = useGetWorkersQuery();

  const buildings = buildingsData?.data || [];
  const workers = workersData?.data || [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Submitting work order with data:', formData);
      
      const result = await createWorkOrder(formData).unwrap();
      console.log('Work order created successfully:', result);
      
      toast.success('Work order created successfully!');
      navigate('/work-orders');
    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error(error?.data?.message || 'Failed to create work order');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Card>
        <CardHeader title="Test Work Order Creation" />
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Building"
                  value={formData.building}
                  onChange={(e) => handleInputChange('building', e.target.value)}
                  SelectProps={{ native: true }}
                  required
                >
                  <option value="">Select Building</option>
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Apartment Number"
                  value={formData.apartmentNumber}
                  onChange={(e) => handleInputChange('apartmentNumber', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Scheduled Date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Service Details
                </Typography>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Service Type"
                        value={formData.services[0].type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          services: [{
                            ...prev.services[0],
                            type: e.target.value
                          }]
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={formData.services[0].description}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          services: [{
                            ...prev.services[0],
                            description: e.target.value
                          }]
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Labor Cost"
                        value={formData.services[0].laborCost}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          services: [{
                            ...prev.services[0],
                            laborCost: parseFloat(e.target.value) || 0
                          }]
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Material Cost"
                        value={formData.services[0].materialCost}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          services: [{
                            ...prev.services[0],
                            materialCost: parseFloat(e.target.value) || 0
                          }]
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Estimated Hours"
                        value={formData.services[0].estimatedHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          services: [{
                            ...prev.services[0],
                            estimatedHours: parseFloat(e.target.value) || 0
                          }]
                        }))}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/work-orders')}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading || !formData.title || !formData.building}
                    startIcon={isLoading ? <CircularProgress size={20} /> : null}
                  >
                    {isLoading ? 'Creating...' : 'Create Work Order'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TestWorkOrderForm;