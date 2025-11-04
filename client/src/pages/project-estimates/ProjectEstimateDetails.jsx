import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
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
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Transform as ConvertIcon,
  MoreVert as MoreVertIcon,
  Receipt as InvoiceIcon,
  Assignment as WorkOrderIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import LineItemEditor from '../../components/estimates/LineItemEditor';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetProjectEstimateQuery,
  useApproveProjectEstimateMutation,
  useDeleteProjectEstimateMutation,
  useConvertToWorkOrderMutation,
  useConvertToInvoiceMutation
} from '../../features/projectEstimates/projectEstimatesApiSlice';
import EstimatePDFDownload from '../../components/estimates/EstimatePDFDownload';
import ProjectEstimatePDF from '../../components/estimates/ProjectEstimatePDF';

const ProjectEstimateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [anchorEl, setAnchorEl] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [sendToClientDialog, setSendToClientDialog] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  
  // Auto-populate email from building contacts when dialog opens
  React.useEffect(() => {
    if (sendToClientDialog && estimate?.building) {
      const emails = [
        estimate.building.generalManagerEmail,
        estimate.building.maintenanceManagerEmail,
        estimate.building.serviceManagerEmail
      ].filter(Boolean);
      
      if (emails.length > 0) {
        setClientEmail(emails.join(', '));
      }
    }
  }, [sendToClientDialog, estimate]);
  const [selectedTab, setSelectedTab] = useState(0);

  // API queries and mutations
  const { data: estimateData, isLoading, error, refetch } = useGetProjectEstimateQuery(id);
  const [approveEstimate, { isLoading: isApproving }] = useApproveProjectEstimateMutation();
  const [deleteEstimate, { isLoading: isDeleting }] = useDeleteProjectEstimateMutation();
  const [convertToWorkOrder, { isLoading: isConverting }] = useConvertToWorkOrderMutation();
  const [convertToInvoice, { isLoading: isConvertingToInvoice }] = useConvertToInvoiceMutation();

  const estimate = estimateData?.data?.projectEstimate;

  // Event handlers
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleApprove = async () => {
    try {
      await approveEstimate({ id, approved: true }).unwrap();
      toast.success('Project estimate approved successfully');
      setApprovalDialog(false);
      refetch();
    } catch (error) {
      toast.error('Failed to approve estimate: ' + (error?.data?.message || 'Unknown error'));
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    try {
      await approveEstimate({ id, approved: false, rejectionReason }).unwrap();
      toast.success('Project estimate rejected');
      setRejectionDialog(false);
      setRejectionReason('');
      refetch();
    } catch (error) {
      toast.error('Failed to reject estimate: ' + (error?.data?.message || 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEstimate(id).unwrap();
      toast.success('Project estimate deleted successfully');
      navigate('/project-estimates');
    } catch (error) {
      toast.error('Failed to delete estimate: ' + (error?.data?.message || 'Unknown error'));
    }
  };

  const handleConvertToWorkOrder = async () => {
    try {
      const result = await convertToWorkOrder(id).unwrap();
      toast.success('Successfully converted to work order');
      navigate(`/work-orders/${result.data.workOrder._id}`);
    } catch (error) {
      toast.error('Failed to convert to work order: ' + (error?.data?.message || 'Unknown error'));
    }
  };

  const handleConvertToInvoice = async () => {
    // Check if estimate is approved
    if (estimate?.status !== 'approved') {
      toast.error('Only approved estimates can be converted to invoices. Please approve this estimate first.');
      return;
    }
    
    try {
      const result = await convertToInvoice(id).unwrap();
      toast.success('Successfully converted to invoice!');
      navigate(`/invoices/${result.data.invoice._id}`);
    } catch (error) {
      console.error('Convert to invoice error:', error);
      toast.error('Failed to convert to invoice: ' + (error?.data?.message || 'Unknown error'));
    }
  };

  const handleSendToClient = async () => {
    if (!clientEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      // Validate estimate data
      if (!estimate) {
        throw new Error('Estimate data not available');
      }
      
      // Create email subject and body
      const subject = `Project Estimate - ${estimate.title || 'Estimate'}`;
      const buildingName = estimate.building?.name || 'your building';
      const estimatedPrice = estimate.estimatedPrice || estimate.estimatedCost || 0;
      const duration = estimate.estimatedDuration || 'TBD';
      
      const body = `Dear Client,\n\nPlease find the project estimate for ${buildingName}.\n\nEstimate Details:\n- Title: ${estimate.title || 'N/A'}\n- Estimated Price: $${estimatedPrice.toFixed(2)}\n- Duration: ${duration} days\n\nYou can view the estimate at: ${window.location.origin}/project-estimates/${id}\n\nBest regards,\nDSJ Construction Services`;
      
      // Open email client
      window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      toast.success('Email client opened successfully!');
      setSendToClientDialog(false);
    } catch (error) {
      console.error('Send to client error:', error);
      toast.error('Failed to prepare email: ' + (error?.message || 'Unknown error'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'converted': return 'info';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const canApprove = user?.role === 'admin' || user?.role === 'manager';
  const canEdit = estimate?.status === 'draft' || estimate?.status === 'pending';
  const canConvert = estimate?.status === 'approved';

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !estimate) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error?.data?.message || 'Project estimate not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/project-estimates')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Project Estimate Details
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={estimate.status?.toUpperCase() || 'DRAFT'} 
              color={getStatusColor(estimate.status)}
              size="small"
            />
            {/* Priority is internal only - not shown to clients */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Chip 
                label={`${estimate.priority?.toUpperCase() || 'MEDIUM'} PRIORITY`} 
                color={getPriorityColor(estimate.priority)}
                size="small"
                variant="outlined"
              />
            )}
            
            <IconButton onClick={handleMenuClick}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Quick Info */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {estimate.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {estimate.building?.name} • {estimate.apartmentNumber || 'General Area'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box textAlign={{ xs: 'left', md: 'right' }}>
              <Typography variant="h4" fontWeight="bold" color="primary">
                ${estimate.estimatedPrice?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Estimated Price
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label="Details" />
          <Tab label="Invoice Preview" />
          <Tab label="Download & Share" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {/* Main Details */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {estimate.description}
                  </Typography>
                </Box>
                
                {estimate.clientNotes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Client Notes
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {estimate.clientNotes}
                    </Typography>
                  </Box>
                )}
                
                {estimate.notes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Internal Notes
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {estimate.notes}
                    </Typography>
                  </Box>
                )}
                
                {estimate.rejectionReason && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="error.contrastText">
                      Rejection Reason
                    </Typography>
                    <Typography variant="body1" color="error.contrastText">
                      {estimate.rejectionReason}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {/* Line Items Section */}
            {estimate.lineItems && estimate.lineItems.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <LineItemEditor
                    lineItems={estimate.lineItems}
                    onChange={() => {}}
                    readOnly={true}
                  />
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Details
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Building
                  </Typography>
                  <Typography variant="body1">
                    {estimate.building?.name || 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {estimate.apartmentNumber || 'General Area'}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Visit Date
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(estimate.visitDate || estimate.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {estimate.estimatedDuration || 1} day(s)
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Estimated Cost
                  </Typography>
                  <Typography variant="body1">
                    ${estimate.estimatedCost?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Estimated Price
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ${estimate.estimatedPrice?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                
                {estimate.proposedStartDate && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Proposed Start Date
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(estimate.proposedStartDate), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <ProjectEstimatePDF estimate={estimate} />
      )}

      {selectedTab === 2 && (
        <EstimatePDFDownload estimate={estimate} />
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem onClick={() => navigate(`/project-estimates/${id}/edit`)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Estimate
          </MenuItem>
        )}
        
        {canApprove && estimate.status === 'pending' && (
          <MenuItem onClick={() => setApprovalDialog(true)}>
            <ApproveIcon sx={{ mr: 1 }} />
            Approve
          </MenuItem>
        )}
        
        {canApprove && estimate.status === 'pending' && (
          <MenuItem onClick={() => setRejectionDialog(true)}>
            <RejectIcon sx={{ mr: 1 }} />
            Reject
          </MenuItem>
        )}
        
        {canConvert && (
          <MenuItem onClick={handleConvertToWorkOrder}>
            <WorkOrderIcon sx={{ mr: 1 }} />
            Convert to Work Order
          </MenuItem>
        )}
        
        {canConvert && (
          <MenuItem onClick={handleConvertToInvoice}>
            <InvoiceIcon sx={{ mr: 1 }} />
            Convert to Invoice
          </MenuItem>
        )}
        
        {canApprove && (
          <MenuItem onClick={() => setSendToClientDialog(true)}>
            <PreviewIcon sx={{ mr: 1 }} />
            Send to Client
          </MenuItem>
        )}
        
        <MenuItem onClick={() => setDeleteDialog(true)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Approve Project Estimate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this project estimate? 
            This will allow it to be converted to work orders or invoices.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)} disabled={isApproving}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            disabled={isApproving}
            startIcon={isApproving ? <CircularProgress size={16} /> : null}
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Project Estimate</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for rejecting this estimate:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialog(false)} disabled={isApproving}>
            Cancel
          </Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            variant="contained"
            disabled={isApproving || !rejectionReason.trim()}
            startIcon={isApproving ? <CircularProgress size={16} /> : null}
          >
            {isApproving ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Project Estimate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this project estimate? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send to Client Dialog */}
      <Dialog open={sendToClientDialog} onClose={() => setSendToClientDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Estimate to Client</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Enter the client's email address to send this estimate:
          </Typography>
          <TextField
            fullWidth
            type="email"
            label="Client Email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@example.com"
            sx={{ mt: 2 }}
            autoFocus
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            The client will receive a professional PDF estimate via email. Priority and internal notes will be hidden.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendToClientDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendToClient} 
            variant="contained"
            disabled={!clientEmail.trim()}
          >
            Send Estimate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectEstimateDetails;
