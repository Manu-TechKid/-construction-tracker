import React, { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetWorkersQuery } from '../../features/users/usersApiSlice';
import {
  useDeletePayStubMutation,
  useGetPayStubsForWorkerQuery,
  useUploadPayStubMutation,
} from '../../features/payStubs/payStubsApiSlice';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

const defaultApiBaseUrl = 'https://construction-tracker-webapp.onrender.com/api/v1';
const getStaticBaseUrl = () => {
  const raw = (process.env.REACT_APP_API_URL || defaultApiBaseUrl).trim().replace(/\/+$/, '');
  return raw.replace(/\/api\/v1$/i, '');
};

const normalizeFileUrl = (url) => {
  if (!url) return '';
  const raw = String(url).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const staticBase = getStaticBaseUrl();
  if (raw.startsWith('/uploads/')) return `${staticBase}${raw}`;
  return `${staticBase}/${raw.replace(/^\//, '')}`;
};

const PayStubsAdmin = () => {
  const theme = useTheme();
  const { data: workersData, isLoading: workersLoading, error: workersError } = useGetWorkersQuery();
  const workers = workersData?.data?.users || workersData?.users || workersData?.data?.workers || workersData?.workers || [];

  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [periodStart, setPeriodStart] = useState(null);
  const [periodEnd, setPeriodEnd] = useState(null);
  const [payDate, setPayDate] = useState(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);

  const {
    data: stubsData,
    isLoading: stubsLoading,
    isFetching: stubsFetching,
    error: stubsError,
    refetch,
  } = useGetPayStubsForWorkerQuery(selectedWorkerId, { skip: !selectedWorkerId });

  const stubs = stubsData?.data?.payStubs || [];

  const [uploadPayStub, { isLoading: isUploading }] = useUploadPayStubMutation();
  const [deletePayStub, { isLoading: isDeleting }] = useDeletePayStubMutation();

  const canUpload = Boolean(selectedWorkerId && periodStart && periodEnd && file);

  const handleUpload = async () => {
    if (!canUpload) return;

    await uploadPayStub({
      workerId: selectedWorkerId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      payDate: payDate ? payDate.toISOString() : undefined,
      notes,
      file,
    }).unwrap();

    setNotes('');
    setFile(null);
    if (refetch) refetch();
  };

  const handleDelete = async (id) => {
    // basic safety guard
    const ok = window.confirm('Are you sure you want to delete this pay stub?');
    if (!ok) return;
    await deletePayStub(id).unwrap();
    if (refetch) refetch();
  };

  const handleDownload = (stub) => {
    const url = normalizeFileUrl(stub?.file?.url);
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = stub?.file?.originalName || 'pay-stub';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const workerOptions = useMemo(() => {
    return (workers || []).map((w) => ({ id: w._id || w.id, name: w.name || w.email }));
  }, [workers]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Card elevation={2} sx={{ borderRadius: 2 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon color="primary" />
                <Typography variant="h6" component="span">
                  Pay Stubs (Admin)
                </Typography>
              </Box>
            }
            subheader="Upload, download, and manage pay stubs per worker"
            action={
              <Tooltip title="Refresh list">
                <span>
                  <IconButton onClick={() => refetch?.()} disabled={!selectedWorkerId || stubsLoading} size="small">
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            }
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              '& .MuiCardHeader-subheader': { color: 'rgba(255,255,255,0.8)' },
              '& .MuiIconButton-root': { color: 'white' },
            }}
          />
          <CardContent sx={{ p: 3 }}>
            {workersError ? (
              <Alert severity="error">Error loading workers: {workersError?.data?.message || 'Please try again.'}</Alert>
            ) : (
              <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, backgroundColor: '#fafafa' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Worker"
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      disabled={workersLoading}
                    >
                      <MenuItem value="">Select worker</MenuItem>
                      {workerOptions.map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="Period Start"
                      value={periodStart}
                      onChange={(d) => setPeriodStart(d)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="Period End"
                      value={periodEnd}
                      onChange={(d) => setPeriodEnd(d)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="Pay Date"
                      value={payDate}
                      onChange={(d) => setPayDate(d)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!canUpload || isUploading}
                      onClick={handleUpload}
                      startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                    >
                      Upload
                    </Button>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Button variant="outlined" component="label" fullWidth>
                      {file ? file.name : 'Choose PDF/Image'}
                      <input
                        type="file"
                        hidden
                        accept="application/pdf,image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Divider sx={{ my: 2 }} />

            {!selectedWorkerId ? (
              <Alert severity="info">Select a worker to view/upload pay stubs.</Alert>
            ) : (stubsLoading || stubsFetching) ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : stubsError ? (
              <Alert severity="error">Error loading pay stubs: {stubsError?.data?.message || 'Please try again.'}</Alert>
            ) : (
              <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: theme.palette.primary.main,
                        '& th': { color: 'white', fontWeight: 600, py: 1.5 },
                      }}
                    >
                      <TableCell>Period Start</TableCell>
                      <TableCell>Period End</TableCell>
                      <TableCell>Pay Date</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="center">Uploaded</TableCell>
                      <TableCell align="right">File</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary" variant="body1">
                              No pay stubs for this worker yet.
                            </Typography>
                            <Typography color="text.disabled" variant="body2">
                              Use the form above to upload a new pay stub.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stubs.map((stub) => (
                        <TableRow
                          key={stub._id}
                          hover
                          sx={{
                            '&:nth-of-type(even)': { backgroundColor: '#fafafa' },
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <TableCell>{stub.periodStart ? new Date(stub.periodStart).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{stub.periodEnd ? new Date(stub.periodEnd).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{stub.payDate ? new Date(stub.payDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                              {stub.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="caption" color="text.secondary">
                              {stub.createdAt ? new Date(stub.createdAt).toLocaleDateString() : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={stub?.file?.mimeType?.includes('pdf') ? 'PDF' : 'File'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                variant="outlined"
                                size="small"
                                component="a"
                                href={normalizeFileUrl(stub?.file?.url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownload(stub)}
                              >
                                Download
                              </Button>
                              <Button
                                color="error"
                                variant="text"
                                size="small"
                                startIcon={<DeleteIcon />}
                                disabled={isDeleting}
                                onClick={() => handleDelete(stub._id)}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default PayStubsAdmin;
