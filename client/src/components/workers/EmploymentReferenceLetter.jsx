import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Description as LetterIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Business as CompanyIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  CalendarToday as CalendarIcon,
  Print as PrintIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetMyEmploymentLetterQuery,
  useRequestEmploymentLetterMutation
} from '../../features/employment/employmentApiSlice';

const EmploymentReferenceLetter = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  // State
  const [requestDialog, setRequestDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // API calls
  const { data: letterData, isLoading: letterLoading, refetch: refetchLetter } = useGetMyEmploymentLetterQuery({
    startDate,
    endDate
  });

  const [requestLetter, { isLoading: isRequesting }] = useRequestEmploymentLetterMutation();

  const letterContent = letterData?.data?.letterContent;
  const letterText = letterData?.data?.letterText;

  const handleRequestLetter = async () => {
    try {
      await requestLetter({
        reason,
        startDate,
        endDate
      }).unwrap();

      toast.success('Employment letter request submitted successfully!');
      setRequestDialog(false);
      setReason('');
      setStartDate('');
      setEndDate('');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to submit request');
    }
  };

  const downloadLetter = () => {
    if (!letterText) return;

    const blob = new Blob([letterText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employment-letter-${user?.name || 'worker'}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printLetter = () => {
    if (!letterText) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Employment Reference Letter</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .date {
              font-style: italic;
              margin-bottom: 20px;
            }
            .content {
              text-align: justify;
            }
            .signature {
              margin-top: 50px;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">DSJ Services</div>
            <div>Employment Reference Letter</div>
          </div>

          <div class="content">
            <pre>${letterText.replace(/\n/g, '<br>')}</pre>
          </div>

          <div class="signature">
            <div>_________________________</div>
            <div>Human Resources Department</div>
            <div>DSJ Services</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h1">
              Employment Reference Letter
            </Typography>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setRequestDialog(true)}
              color="primary"
            >
              Request Letter
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Generate and download employment reference letters for your records or applications.
          </Typography>
        </CardContent>
      </Card>

      {/* Letter Generation Form */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon />
            Select Period
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={refetchLetter}
                disabled={letterLoading}
                sx={{ height: '56px' }}
              >
                {letterLoading ? <CircularProgress size={20} /> : 'Generate Letter'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Letter Display */}
      {letterContent && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon />
              Employment Reference Letter
            </Typography>

            <Paper sx={{ p: 3, bgcolor: 'grey.50', fontFamily: 'monospace' }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {letterText}
              </Typography>
            </Paper>

            <Divider sx={{ my: 2 }} />

            {/* Letter Actions */}
            <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadLetter}
                color="primary"
              >
                Download
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={printLetter}
                color="secondary"
              >
                Print
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Statistics Summary */}
      {letterContent && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TimeIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="primary">
                  {letterContent.totalHours.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {letterContent.weeksWorked}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Weeks Worked
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CompanyIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="info.main">
                  {letterContent.averageHoursPerWeek.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg/Week
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <LetterIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {letterContent.sessions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sessions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Request Dialog */}
      <Dialog open={requestDialog} onClose={() => setRequestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Employment Letter</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Request"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain why you need this employment letter (e.g., for job application, bank loan, etc.)"
            sx={{ mt: 1 }}
          />

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRequestLetter}
            variant="contained"
            disabled={!reason.trim() || isRequesting}
            startIcon={isRequesting ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {isRequesting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmploymentReferenceLetter;
