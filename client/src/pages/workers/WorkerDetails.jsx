import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { data: workersData, isLoading, error } = useGetWorkersQuery();

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load worker details: {error?.data?.message || error.message}
        </Alert>
      </Container>
    );
  }

  const workers = workersData?.data?.users || [];
  const worker = workers.find(w => w._id === id);

  if (!worker) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Worker not found</Alert>
      </Container>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon />;
      case 'rejected': return <CancelIcon />;
      default: return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          onClick={() => navigate('/workers')}
          color="primary"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Worker Details
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Worker Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title="Personal Information"
              avatar={
                <Avatar src={worker.photo} sx={{ width: 56, height: 56 }}>
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Full Name
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {worker.name || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Email Address
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      {worker.email || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Phone Number
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      {worker.phone || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Approval Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getStatusIcon(worker.workerProfile?.approvalStatus)}
                    <Chip
                      label={worker.workerProfile?.approvalStatus?.charAt(0).toUpperCase() +
                            worker.workerProfile?.approvalStatus?.slice(1) || 'Pending'}
                      color={getStatusColor(worker.workerProfile?.approvalStatus)}
                      size="small"
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {worker.workerProfile?.skills?.length > 0 ? (
                      worker.workerProfile.skills.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill.replace('_', ' ').toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No skills specified
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {worker.workerProfile?.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {worker.workerProfile.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Payment Information */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Payment Information" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Payment Type
                </Typography>
                <Typography variant="body1">
                  {worker.workerProfile?.paymentType === 'hourly'
                    ? 'Hourly Rate'
                    : 'Contract Rate'}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Rate
                </Typography>
                <Typography variant="h6" color="primary">
                  ${worker.workerProfile?.paymentType === 'hourly'
                    ? worker.workerProfile?.hourlyRate || '0'
                    : worker.workerProfile?.contractRate || '0'
                  }
                  {worker.workerProfile?.paymentType === 'hourly' && '/hr'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Actions */}
          {hasPermission(['update:workers']) && (
            <Card>
              <CardHeader title="Actions" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/workers/${id}/edit`)}
                    fullWidth
                  >
                    Edit Worker
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default WorkerDetails;
