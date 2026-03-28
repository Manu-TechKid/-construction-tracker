import React, { useMemo, useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetWorkersQuery } from '../../features/users/usersApiSlice';
import {
  useDeletePayStubMutation,
  useGetPayStubsForWorkerQuery,
  useUploadPayStubMutation,
} from '../../features/payStubs/payStubsApiSlice';

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
  const { data: workersData, isLoading: workersLoading, error: workersError } = useGetWorkersQuery();
  const workers = workersData?.data?.workers || workersData?.workers || [];

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
    await deletePayStub(id).unwrap();
    if (refetch) refetch();
  };

  const workerOptions = useMemo(() => {
    return (workers || []).map((w) => ({ id: w._id || w.id, name: w.name || w.email }));
  }, [workers]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Card elevation={3}>
          <CardHeader title="Pay Stubs (Admin)" />
          <CardContent>
            {workersError ? (
              <Alert severity="error">Error loading workers: {workersError?.data?.message || 'Please try again.'}</Alert>
            ) : (
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
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
            )}

            {!selectedWorkerId ? (
              <Alert severity="info">Select a worker to view/upload pay stubs.</Alert>
            ) : (stubsLoading || stubsFetching) ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : stubsError ? (
              <Alert severity="error">Error loading pay stubs: {stubsError?.data?.message || 'Please try again.'}</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Period Start</TableCell>
                      <TableCell>Period End</TableCell>
                      <TableCell>Pay Date</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">File</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No pay stubs for this worker yet.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stubs.map((stub) => (
                        <TableRow key={stub._id} hover>
                          <TableCell>{stub.periodStart ? new Date(stub.periodStart).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{stub.periodEnd ? new Date(stub.periodEnd).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{stub.payDate ? new Date(stub.payDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{stub.notes || ''}</TableCell>
                          <TableCell align="right">
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
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              color="error"
                              variant="text"
                              size="small"
                              disabled={isDeleting}
                              onClick={() => handleDelete(stub._id)}
                            >
                              Delete
                            </Button>
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
