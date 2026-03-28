import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
} from '@mui/material';
import { useGetMyPayStubsQuery } from '../../features/payStubs/payStubsApiSlice';

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

const MyPayStubs = () => {
  const { data, isLoading, isFetching, error } = useGetMyPayStubsQuery();
  const stubs = data?.data?.payStubs || [];

  return (
    <Box sx={{ p: 3 }}>
      <Card elevation={3}>
        <CardHeader title="My Pay Stubs" />
        <CardContent>
          {(isLoading || isFetching) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">Error loading pay stubs: {error?.data?.message || 'Please try again.'}</Alert>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No pay stubs uploaded yet.</Typography>
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
  );
};

export default MyPayStubs;
