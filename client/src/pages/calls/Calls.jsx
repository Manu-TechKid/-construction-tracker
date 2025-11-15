import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { 
  useGetCallsQuery,
  useCreateCallMutation,
  useDeleteCallMutation,
  useGetCallStatsQuery,
} from '../../features/calls/callsApiSlice';
import { toast } from 'react-toastify';

const outcomeOptions = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'left_message', label: 'Left message' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'interested', label: 'Interested' },
  { value: 'meeting_scheduled', label: 'Meeting scheduled' },
  { value: 'requested_estimate', label: 'Requested estimate' },
  { value: 'existing_client_request', label: 'Existing client request' },
];

const typeOptions = [
  { value: 'phone', label: 'Phone' },
  { value: 'in_person', label: 'In-Person' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

const directionOptions = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
];

const Calls = () => {
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    buildingId: '',
    outcome: '',
    type: '',
    direction: '',
    search: '',
  });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    isProspect: false,
    building: '',
    prospectCompanyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    type: 'phone',
    direction: 'outbound',
    outcome: 'no_answer',
    notes: '',
    nextActionDate: null,
    nextActionType: '',
    nextActionNote: '',
  });

  const { data: buildingsData } = useGetBuildingsQuery();
  const buildings = buildingsData?.data?.buildings || [];

  const queryParams = useMemo(() => ({
    startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
    endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
    buildingId: filters.buildingId || undefined,
    outcome: filters.outcome || undefined,
    type: filters.type || undefined,
    direction: filters.direction || undefined,
    search: filters.search?.trim() || undefined,
    limit: 50,
  }), [filters]);

  const { data: callsData, refetch, isFetching } = useGetCallsQuery(queryParams);
  const { data: statsData } = useGetCallStatsQuery(queryParams);
  const [createCall, { isLoading: isCreating }] = useCreateCallMutation();
  const [deleteCall] = useDeleteCallMutation();

  const calls = callsData?.data?.callLogs || [];
  const byOutcome = statsData?.data?.byOutcome || [];
  const totals = statsData?.data?.totals || { total: 0, meetings: 0 };

  const handleOpenAdd = () => setAddOpen(true);
  const handleCloseAdd = () => setAddOpen(false);

  const handleCreate = async () => {
    try {
      if (!form.isProspect && !form.building) {
        toast.warning('Select a building or mark as prospect');
        return;
      }
      const payload = form.isProspect
        ? {
            isProspect: true,
            prospect: { companyName: form.prospectCompanyName },
            contactName: form.contactName || undefined,
            contactPhone: form.contactPhone || undefined,
            contactEmail: form.contactEmail || undefined,
            type: form.type,
            direction: form.direction,
            outcome: form.outcome,
            notes: form.notes || undefined,
            nextAction: form.nextActionDate ? {
              date: form.nextActionDate,
              type: form.nextActionType || undefined,
              note: form.nextActionNote || undefined,
            } : undefined,
          }
        : {
            building: form.building,
            isProspect: false,
            contactName: form.contactName || undefined,
            contactPhone: form.contactPhone || undefined,
            contactEmail: form.contactEmail || undefined,
            type: form.type,
            direction: form.direction,
            outcome: form.outcome,
            notes: form.notes || undefined,
            nextAction: form.nextActionDate ? {
              date: form.nextActionDate,
              type: form.nextActionType || undefined,
              note: form.nextActionNote || undefined,
            } : undefined,
          };

      await createCall(payload).unwrap();
      toast.success('Call saved');
      setAddOpen(false);
      setForm({
        isProspect: false,
        building: '',
        prospectCompanyName: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        type: 'phone',
        direction: 'outbound',
        outcome: 'no_answer',
        notes: '',
        nextActionDate: null,
        nextActionType: '',
        nextActionNote: '',
      });
      refetch();
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Failed to save call';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this call log?')) return;
    try {
      await deleteCall(id).unwrap();
      toast.success('Deleted');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to delete');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">Calls</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add Call
          </Button>
        </Box>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(d) => setFilters((p) => ({ ...p, startDate: d }))}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(d) => setFilters((p) => ({ ...p, endDate: d }))}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Building"
                  value={filters.buildingId}
                  onChange={(e) => setFilters((p) => ({ ...p, buildingId: e.target.value }))}
                >
                  <MenuItem value="">All Buildings</MenuItem>
                  {buildings.map((b) => (
                    <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Outcome" value={filters.outcome} onChange={(e) => setFilters((p) => ({ ...p, outcome: e.target.value }))}>
                  <MenuItem value="">All</MenuItem>
                  {outcomeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Type" value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
                  <MenuItem value="">All</MenuItem>
                  {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Direction" value={filters.direction} onChange={(e) => setFilters((p) => ({ ...p, direction: e.target.value }))}>
                  <MenuItem value="">All</MenuItem>
                  {directionOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Calls</Typography>
                <Typography variant="h4">{totals.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Meetings</Typography>
                <Typography variant="h4">{totals.meetings || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>By Outcome</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {byOutcome.map((o) => (
                    <Chip key={o._id || 'unknown'} label={`${o._id || 'unknown'}: ${o.count}`} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Building/Prospect</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Outcome</TableCell>
                  <TableCell>Next</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(calls || []).map((c) => (
                  <TableRow key={c._id} hover>
                    <TableCell>{new Date(c.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {c.isProspect ? (c.prospect?.companyName || 'Prospect') : (c.building?.name || 'Building')}
                    </TableCell>
                    <TableCell>{c.contactName || '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Chip label={c.type} size="small" />
                        <Chip label={c.direction} size="small" variant="outlined" />
                      </Stack>
                    </TableCell>
                    <TableCell><Chip label={c.outcome} size="small" color={c.outcome === 'meeting_scheduled' || c.outcome === 'interested' ? 'success' : 'default'} /></TableCell>
                    <TableCell>{c.nextAction?.date ? new Date(c.nextAction.date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" onClick={() => handleDelete(c._id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!calls || calls.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">{isFetching ? 'Loading...' : 'No calls found'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Dialog open={addOpen} onClose={handleCloseAdd} maxWidth="md" fullWidth>
          <DialogTitle>Add Call</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Who is this for?"
                value={form.isProspect ? 'prospect' : 'building'}
                onChange={(e) => setForm((p) => ({ ...p, isProspect: e.target.value === 'prospect', building: '', prospectCompanyName: '' }))}
                fullWidth
              >
                <MenuItem value="building">Existing Building</MenuItem>
                <MenuItem value="prospect">Prospect (new)</MenuItem>
              </TextField>

              {!form.isProspect && (
                <TextField select label="Building" value={form.building} onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))} fullWidth required>
                  <MenuItem value="">Select building</MenuItem>
                  {buildings.map((b) => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </TextField>
              )}

              {form.isProspect && (
                <TextField label="Prospect Company Name" value={form.prospectCompanyName} onChange={(e) => setForm((p) => ({ ...p, prospectCompanyName: e.target.value }))} fullWidth required />
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Contact Name" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField label="Phone" value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField label="Email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} fullWidth />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField select label="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} fullWidth>
                    {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select label="Direction" value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))} fullWidth>
                    {directionOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select label="Outcome" value={form.outcome} onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))} fullWidth>
                    {outcomeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>

              <TextField label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} fullWidth multiline minRows={2} />

              <Typography variant="subtitle2">Next Action (optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <DatePicker label="Follow-up Date" value={form.nextActionDate} onChange={(d) => setForm((p) => ({ ...p, nextActionDate: d }))} slotProps={{ textField: { fullWidth: true } }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select label="Type" value={form.nextActionType} onChange={(e) => setForm((p) => ({ ...p, nextActionType: e.target.value }))} fullWidth>
                    <MenuItem value="">None</MenuItem>
                    {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Note" value={form.nextActionNote} onChange={(e) => setForm((p) => ({ ...p, nextActionNote: e.target.value }))} fullWidth />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAdd}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained" disabled={isCreating}>{isCreating ? 'Saving...' : 'Save Call'}</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Calls;
