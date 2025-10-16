import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Fab,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { useGetProjectEstimatesQuery, useDeleteProjectEstimateMutation } from '../../features/estimates/projectEstimatesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const ProjectEstimates = () => {
  const navigate = useNavigate();
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: estimatesData, isLoading, error, refetch } = useGetProjectEstimatesQuery({
    building: filterBuilding,
    status: filterStatus
  });

  const { data: buildingsData } = useGetBuildingsQuery();
  const [deleteEstimate] = useDeleteProjectEstimateMutation();

  const estimates = estimatesData?.data?.projectEstimates || [];
  const buildings = buildingsData?.data?.buildings || [];

  const handleMenuOpen = (event, estimate) => {
    setAnchorEl(event.currentTarget);
    setSelectedEstimate(estimate);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEstimate(null);
  };

  const handleDelete = async () => {
    try {
      await deleteEstimate(selectedEstimate._id).unwrap();
      toast.success('Project estimate deleted successfully');
      setDeleteDialogOpen(false);
      handleMenuClose();
      refetch();
    } catch (error) {
      toast.error('Failed to delete project estimate');
      console.error('Delete error:', error);
    }
  };

  const handleView = () => {
    navigate(`/estimates/${selectedEstimate?._id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/estimates/${selectedEstimate?._id}/edit`);
    handleMenuClose();
  };

  const handleDownloadPDF = async () => {
    try {
      // First try to get PDF from backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1'}/project-estimates/${selectedEstimate._id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Estimate-${selectedEstimate?.title || selectedEstimate?._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('PDF downloaded successfully');
      } else {
        // Fallback: Generate simple PDF using browser
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Project Estimate - ${selectedEstimate?.title}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .section { margin-bottom: 20px; }
                  .total { font-weight: bold; font-size: 18px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f5f5f5; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>DSJ Construction Services</h1>
                  <h2>Project Estimate</h2>
                </div>

                <div class="section">
                  <h3>Project Details</h3>
                  <p><strong>Title:</strong> ${selectedEstimate?.title || 'N/A'}</p>
                  <p><strong>Building:</strong> ${selectedEstimate?.building?.name || 'N/A'}</p>
                  <p><strong>Status:</strong> ${getStatusLabel(selectedEstimate?.status)}</p>
                </div>

                <div class="section">
                  <h3>Financial Summary</h3>
                  <p><strong>Estimated Cost:</strong> $${selectedEstimate?.estimatedCost?.toLocaleString() || '0'}</p>
                  <p><strong>Estimated Price:</strong> $${selectedEstimate?.estimatedPrice?.toLocaleString() || '0'}</p>
                  <p class="total"><strong>Total Amount:</strong> $${selectedEstimate?.estimatedPrice?.toLocaleString() || '0'}</p>
                </div>

                <div class="section">
                  <h3>Description</h3>
                  <p>${selectedEstimate?.description || 'No description provided'}</p>
                </div>

                <div class="section">
                  <p><em>Generated on: ${format(new Date(), 'PPP')}</em></p>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
        toast.info('PDF generation fallback used');
      }
      handleMenuClose();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
      handleMenuClose();
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'info',
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      client_accepted: 'success',
      client_rejected: 'error',
      converted_to_invoice: 'secondary'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      submitted: 'Submitted',
      pending: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      client_accepted: 'Client Accepted',
      client_rejected: 'Client Rejected',
      converted_to_invoice: 'Converted to Invoice'
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading project estimates...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading project estimates: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Project Estimates
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/estimates/new')}
          sx={{ ml: 2 }}
        >
          New Estimate
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filter by Building</InputLabel>
                <Select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  label="Filter by Building"
                >
                  <MenuItem value="">All Buildings</MenuItem>
                  {buildings.map((building) => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Filter by Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="pending">Pending Review</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="client_accepted">Client Accepted</MenuItem>
                  <MenuItem value="client_rejected">Client Rejected</MenuItem>
                  <MenuItem value="converted_to_invoice">Converted to Invoice</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Estimates Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Estimated Cost</TableCell>
                <TableCell>Estimated Price</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {estimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box py={4}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No project estimates found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Create your first project estimate to get started
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/estimates/new')}
                      >
                        Create Estimate
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                estimates.map((estimate) => (
                  <TableRow key={estimate._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {estimate.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {estimate.description?.substring(0, 60)}
                        {estimate.description?.length > 60 ? '...' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {estimate.building?.name || 'N/A'}
                      </Typography>
                      {estimate.apartmentNumber && (
                        <Typography variant="caption" color="text.secondary">
                          Apt {estimate.apartmentNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(estimate.status)}
                        color={getStatusColor(estimate.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      ${estimate.estimatedCost?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                      ${estimate.estimatedPrice?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(estimate.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, estimate)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          toast.info('Send to client feature coming soon');
          handleMenuClose();
        }}>
          <SendIcon sx={{ mr: 1 }} />
          Send to Client
        </MenuItem>
        <MenuItem onClick={handleDownloadPDF}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download PDF
        </MenuItem>
        {selectedEstimate?.status === 'client_accepted' && (
          <MenuItem onClick={() => {
            toast.info('Convert to invoice feature coming soon');
            handleMenuClose();
          }}>
            <ReceiptIcon sx={{ mr: 1 }} />
            Convert to Invoice
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Project Estimate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedEstimate?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Create New Estimate">
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => navigate('/estimates/new')}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default ProjectEstimates;
