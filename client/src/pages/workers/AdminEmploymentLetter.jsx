import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  CalendarToday as CalendarIcon,
  Description as LetterIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'react-toastify';
import { useGetUserQuery } from '../../features/users/usersApiSlice';
import { useGenerateEmploymentLetterQuery } from '../../features/employment/employmentApiSlice';

const AdminEmploymentLetter = () => {
  const navigate = useNavigate();
  const { workerId } = useParams();

  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString());
  const [endDate, setEndDate] = useState(() => endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString());

  const { data: workerData, isLoading: isWorkerLoading, error: workerError } = useGetUserQuery(workerId, {
    skip: !workerId
  });

  const {
    data: letterData,
    isFetching: isLetterLoading,
    error: letterError,
    refetch: refetchLetter
  } = useGenerateEmploymentLetterQuery(
    { workerId, startDate, endDate },
    { skip: !workerId }
  );

  const worker = workerData?.data?.user;
  const letterContent = letterData?.data?.letterContent;
  const letterText = letterData?.data?.letterText;

  const stats = useMemo(() => letterContent || {
    totalHours: 0,
    weeksWorked: 0,
    averageHoursPerWeek: 0,
    sessions: []
  }, [letterContent]);

  const handleGenerate = async () => {
    try {
      await refetchLetter().unwrap();
      toast.success('Employment letter generated');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to generate employment letter');
    }
  };

  const handleDownload = () => {
    if (!letterText) return;
    const blob = new Blob([letterText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employment-letter-${worker?.name || 'worker'}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!letterText) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Employment Letter</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; padding: 24px; max-width: 800px; margin: 0 auto; }
            h1 { text-align: center; }
            .header { margin-bottom: 24px; }
            .stats { margin-top: 32px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Employment Reference Letter</h1>
            <div>Date: ${format(new Date(), 'MMMM dd, yyyy')}</div>
          </div>
          <pre>${letterText.replace(/\n/g, '<br/>')}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (!workerId) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">No worker selected.</Alert>
      </Container>
    );
  }

  if (isWorkerLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (workerError || !worker) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">
          Failed to load worker details. {workerError?.data?.message || 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<BackIcon />}
        variant="outlined"
        sx={{ mb: 3 }}
        onClick={() => navigate(-1)}
      >
        Back
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Employment Letter for {worker.name}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Worker ID
              </Typography>
              <Typography variant="h6">{worker._id}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Contact
              </Typography>
              <Typography variant="h6">{worker.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Role
              </Typography>
              <Chip label={worker.role?.toUpperCase() || 'WORKER'} color="primary" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Hourly Rate
              </Typography>
              <Typography variant="h6">
                ${worker.workerProfile?.hourlyRate?.toFixed(2) || '0.00'}/hr
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon fontSize="small" />
            Select Period
          </Typography>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate.slice(0, 10)}
                onChange={(e) => setStartDate(new Date(e.target.value).toISOString())}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="End Date"
                type="date"
                value={endDate.slice(0, 10)}
                onChange={(e) => setEndDate(new Date(e.target.value).toISOString())}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleGenerate}
                disabled={isLetterLoading}
                sx={{ height: 56 }}
              >
                {isLetterLoading ? <CircularProgress size={24} color="inherit" /> : 'Generate'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {letterError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to generate employment letter. {letterError?.data?.message || 'Unknown error'}
        </Alert>
      )}

      {letterText && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TimeIcon color="primary" sx={{ fontSize: 36, mb: 1 }} />
                  <Typography variant="h5" color="primary">
                    {stats.totalHours?.toFixed(1) || '0.0'}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PersonIcon color="success" sx={{ fontSize: 36, mb: 1 }} />
                  <Typography variant="h5" color="success.main">
                    {stats.weeksWorked || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Weeks Covered
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <LetterIcon color="warning" sx={{ fontSize: 36, mb: 1 }} />
                  <Typography variant="h5" color="warning.main">
                    {stats.sessions?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sessions Count
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Employment Letter Content
              </Typography>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: 'grey.50' }}>
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                  {letterText}
                </Typography>
              </Paper>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="flex-end" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                >
                  Print
                </Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {!letterText && !isLetterLoading && (
        <Alert severity="info">
          Select a date range and click Generate to create an employment letter.
        </Alert>
      )}
    </Container>
  );
};

export default AdminEmploymentLetter;
