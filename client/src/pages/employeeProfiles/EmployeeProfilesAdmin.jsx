import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetEmployeeProfilesQuery,
  useReviewEmployeeProfileMutation,
  useDeleteEmployeeProfileMutation,
  useRestoreEmployeeProfileMutation,
} from '../../features/employeeProfiles/employeeProfilesApiSlice';

const statusColor = (status) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'submitted') return 'warning';
  return 'default';
};

const EmployeeProfilesAdmin = () => {
  const { hasPermission } = useAuth();
  const canReview = hasPermission(['review:employeeprofiles']);
  const canDelete = hasPermission(['delete:employeeprofiles']);

  const [filters, setFilters] = useState({ status: '', includeDeleted: false, deletedOnly: false });
  const queryParams = useMemo(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.includeDeleted) p.includeDeleted = 'true';
    if (filters.deletedOnly) {
      p.deleted = 'true';
      p.includeDeleted = 'true';
    }
    return p;
  }, [filters]);

  const { data, isLoading, error } = useGetEmployeeProfilesQuery(queryParams);
  const [review, { isLoading: isReviewing }] = useReviewEmployeeProfileMutation();
  const [deleteProfile, { isLoading: isDeleting }] = useDeleteEmployeeProfileMutation();
  const [restoreProfile, { isLoading: isRestoring }] = useRestoreEmployeeProfileMutation();

  const profiles = useMemo(() => data?.data?.profiles || [], [data]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [notes, setNotes] = useState('');

  const openReview = (p) => {
    setSelected(p);
    setDecision('approved');
    setNotes('');
    setOpen(true);
  };

  const onDelete = async (p) => {
    if (!p?._id) return;
    if (!window.confirm('Delete this profile? (soft delete)')) return;
    try {
      await deleteProfile(p._id).unwrap();
      toast.success('Profile deleted');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to delete');
    }
  };

  const onRestore = async (p) => {
    if (!p?._id) return;
    try {
      await restoreProfile(p._id).unwrap();
      toast.success('Profile restored');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to restore');
    }
  };

  const close = () => {
    setOpen(false);
    setSelected(null);
    setDecision('approved');
    setNotes('');
  };

  const onSubmit = async () => {
    if (!selected?._id) return;
    try {
      await review({ id: selected._id, status: decision, reviewNotes: notes || undefined }).unwrap();
      toast.success('Review saved');
      close();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to review');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4">Employee Profiles</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="filter-status">Status</InputLabel>
            <Select
              labelId="filter-status"
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.includeDeleted}
                onChange={(e) => setFilters((p) => ({ ...p, includeDeleted: e.target.checked, deletedOnly: false }))}
              />
            }
            label="Include deleted"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.deletedOnly}
                onChange={(e) => setFilters((p) => ({ ...p, deletedOnly: e.target.checked, includeDeleted: e.target.checked ? true : p.includeDeleted }))}
              />
            }
            label="Deleted only"
          />
        </Stack>
      </Stack>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">Failed to load profiles.</Alert>}

      {!isLoading && !error && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Deleted</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>{p.user?.name || '-'}</TableCell>
                  <TableCell>{p.user?.email || '-'}</TableCell>
                  <TableCell>
                    <Chip label={p.status || 'draft'} size="small" color={statusColor(p.status)} />
                  </TableCell>
                  <TableCell>{p.deleted ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openReview(p)}>
                        {canReview ? 'Review' : 'View'}
                      </Button>
                      {canDelete && !p.deleted && (
                        <Button size="small" color="error" variant="outlined" onClick={() => onDelete(p)} disabled={isDeleting}>
                          Delete
                        </Button>
                      )}
                      {canDelete && p.deleted && (
                        <Button size="small" color="success" variant="outlined" onClick={() => onRestore(p)} disabled={isRestoring}>
                          Restore
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No profiles found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
        <DialogTitle>Review Profile</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Summary</Typography>
              <Typography variant="body2">Name: {selected?.personal?.fullName || selected?.user?.name || '-'}</Typography>
              <Typography variant="body2">Email: {selected?.personal?.email || selected?.user?.email || '-'}</Typography>
              <Typography variant="body2">Mobile: {selected?.personal?.mobileNumber || '-'}</Typography>
              <Typography variant="body2">Status: {selected?.status || 'draft'}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Documents</Typography>
              {(selected?.documents || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">No documents</Typography>
              )}
              <Stack spacing={1}>
                {(selected?.documents || []).map((d, idx) => (
                  <Stack key={d.publicId || idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Typography variant="body2">{d.label || 'Document'}</Typography>
                    <Button size="small" href={d.url} target="_blank" rel="noreferrer">Open</Button>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {canReview && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="decision">Decision</InputLabel>
                  <Select
                    labelId="decision"
                    label="Decision"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    <MenuItem value="approved">Approve</MenuItem>
                    <MenuItem value="rejected">Reject</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Review Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          {canReview && (
            <Button variant="contained" onClick={onSubmit} disabled={isReviewing}>
              {isReviewing ? 'Saving...' : 'Save Review'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeProfilesAdmin;
