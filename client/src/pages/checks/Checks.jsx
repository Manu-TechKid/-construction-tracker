import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Cancel as VoidIcon,
  CheckCircle as MarkPrintedIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  useCreateCheckMutation,
  useDeleteCheckMutation,
  useGetCheckPdfMutation,
  useGetChecksQuery,
  useMarkCheckPrintedMutation,
  useUpdateCheckMutation,
  useVoidCheckMutation,
} from '../../features/checks/checksApiSlice';
import { useGetVendorsQuery } from '../../features/vendors/vendorsApiSlice';
import { useAuth } from '../../hooks/useAuth';

const emptyCheck = {
  vendor: '',
  checkDate: '',
  amount: 0,
  memo: '',
  lineItems: [],
};

const statusColor = (status) => {
  if (status === 'printed') return 'success';
  if (status === 'voided') return 'error';
  if (status === 'cleared') return 'info';
  return 'default';
};

const Checks = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(['create:checks']);
  const canUpdate = hasPermission(['update:checks']);
  const canDelete = hasPermission(['delete:checks']);
  const canPrint = hasPermission(['print:checks']);

  const { data: vendorsData } = useGetVendorsQuery();
  const vendors = useMemo(() => vendorsData?.data?.vendors || [], [vendorsData]);

  const [filters, setFilters] = useState({ status: '', vendorId: '' });
  const queryParams = useMemo(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.vendorId) p.vendorId = filters.vendorId;
    return p;
  }, [filters]);

  const { data, isLoading, error } = useGetChecksQuery(queryParams);
  const checks = useMemo(() => data?.data?.checks || [], [data]);

  const [createCheck, { isLoading: isCreating }] = useCreateCheckMutation();
  const [updateCheck, { isLoading: isUpdating }] = useUpdateCheckMutation();
  const [deleteCheck] = useDeleteCheckMutation();
  const [voidCheck] = useVoidCheckMutation();
  const [markPrinted] = useMarkCheckPrintedMutation();
  const [getPdf, { isLoading: isPrinting }] = useGetCheckPdfMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyCheck });

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyCheck });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyCheck, checkDate: format(new Date(), 'yyyy-MM-dd') });
    setOpen(true);
  };

  const openEdit = (check) => {
    setEditing(check);
    setForm({
      vendor: check?.vendor?._id || check?.vendor || '',
      checkDate: check?.checkDate ? format(new Date(check.checkDate), 'yyyy-MM-dd') : '',
      amount: Number(check?.amount || 0),
      memo: check?.memo || '',
      lineItems: Array.isArray(check?.lineItems) ? check.lineItems.map((li) => ({
        _id: li._id,
        description: li.description || '',
        amount: Number(li.amount || 0),
        invoice: li.invoice?._id || li.invoice || undefined,
      })) : [],
    });
    setOpen(true);
  };

  const setLineItem = (idx, patch) => {
    setForm((p) => {
      const next = [...(p.lineItems || [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...p, lineItems: next };
    });
  };

  const addLineItem = () => {
    setForm((p) => ({ ...p, lineItems: [...(p.lineItems || []), { description: '', amount: 0 }] }));
  };

  const removeLineItem = (idx) => {
    setForm((p) => ({ ...p, lineItems: (p.lineItems || []).filter((_, i) => i !== idx) }));
  };

  const sumLineItems = useMemo(() => {
    return (form.lineItems || []).reduce((sum, li) => sum + Number(li.amount || 0), 0);
  }, [form.lineItems]);

  const onSave = async () => {
    if (!form.vendor) {
      toast.warning('Vendor is required');
      return;
    }
    const payload = {
      vendor: form.vendor,
      checkDate: form.checkDate ? new Date(form.checkDate).toISOString() : undefined,
      amount: Number(form.amount || 0),
      memo: form.memo || undefined,
      lineItems: (form.lineItems || []).map((li) => ({
        description: li.description || undefined,
        amount: Number(li.amount || 0),
        invoice: li.invoice || undefined,
      })),
    };

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      toast.warning('Amount must be greater than 0');
      return;
    }

    try {
      if (editing?._id) {
        await updateCheck({ id: editing._id, ...payload }).unwrap();
        toast.success('Check updated');
      } else {
        await createCheck(payload).unwrap();
        toast.success('Check created');
      }
      close();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to save check');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this check?')) return;
    try {
      await deleteCheck(id).unwrap();
      toast.success('Check deleted');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to delete check');
    }
  };

  const onVoid = async (id) => {
    if (!window.confirm('Void this check?')) return;
    try {
      await voidCheck(id).unwrap();
      toast.success('Check voided');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to void check');
    }
  };

  const onMarkPrinted = async (id) => {
    try {
      await markPrinted(id).unwrap();
      toast.success('Marked as printed');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to mark printed');
    }
  };

  const onPrint = async (check) => {
    try {
      const blob = await getPdf({ id: check._id, offsetX, offsetY }).unwrap();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to generate PDF');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4">Checks</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Check
          </Button>
        )}
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl fullWidth size="small">
            <InputLabel id="filter-status">Status</InputLabel>
            <Select
              labelId="filter-status"
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="printed">Printed</MenuItem>
              <MenuItem value="voided">Voided</MenuItem>
              <MenuItem value="cleared">Cleared</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="filter-vendor">Vendor</InputLabel>
            <Select
              labelId="filter-vendor"
              label="Vendor"
              value={filters.vendorId}
              onChange={(e) => setFilters((p) => ({ ...p, vendorId: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Offset X"
            size="small"
            type="number"
            value={offsetX}
            onChange={(e) => setOffsetX(Number(e.target.value || 0))}
            fullWidth
          />
          <TextField
            label="Offset Y"
            size="small"
            type="number"
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value || 0))}
            fullWidth
          />
        </Stack>
      </Paper>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">Failed to load checks.</Alert>}

      {!isLoading && !error && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Memo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.map((c) => (
                <TableRow key={c._id} hover>
                  <TableCell>{c.checkNumber || '-'}</TableCell>
                  <TableCell>{c.checkDate ? new Date(c.checkDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{c.vendor?.name || '-'}</TableCell>
                  <TableCell align="right">${Number(c.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{c.memo || '-'}</TableCell>
                  <TableCell>
                    <Chip label={c.status || 'draft'} size="small" color={statusColor(c.status)} />
                  </TableCell>
                  <TableCell align="right">
                    {canPrint && (
                      <IconButton color="primary" onClick={() => onPrint(c)} disabled={isPrinting}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canUpdate && (
                      <IconButton color="success" onClick={() => onMarkPrinted(c._id)}>
                        <MarkPrintedIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canUpdate && (
                      <IconButton color="warning" onClick={() => onVoid(c._id)}>
                        <VoidIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canUpdate && (
                      <IconButton color="primary" onClick={() => openEdit(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton color="error" onClick={() => onDelete(c._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {checks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">No checks found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Check' : 'New Check'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="check-vendor">Vendor</InputLabel>
              <Select
                labelId="check-vendor"
                label="Vendor"
                value={form.vendor}
                onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
              >
                <MenuItem value="">Select vendor</MenuItem>
                {vendors.map((v) => (
                  <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Check Date"
                type="date"
                value={form.checkDate}
                onChange={(e) => setForm((p) => ({ ...p, checkDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Amount"
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))}
                fullWidth
              />
            </Stack>

            <TextField
              label="Memo"
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              fullWidth
            />

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">Voucher / Line Items</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" onClick={() => setForm((p) => ({ ...p, amount: sumLineItems }))}>
                    Use Sum (${sumLineItems.toFixed(2)})
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addLineItem}>
                    Add
                  </Button>
                </Stack>
              </Stack>

              {(form.lineItems || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">No line items</Typography>
              )}

              <Stack spacing={1}>
                {(form.lineItems || []).map((li, idx) => (
                  <Stack key={li._id || idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField
                      label="Description"
                      value={li.description}
                      onChange={(e) => setLineItem(idx, { description: e.target.value })}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Amount"
                      type="number"
                      value={li.amount}
                      onChange={(e) => setLineItem(idx, { amount: Number(e.target.value || 0) })}
                      size="small"
                      sx={{ width: { xs: '100%', sm: 160 } }}
                    />
                    <IconButton color="error" onClick={() => removeLineItem(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          {(editing ? canUpdate : canCreate) && (
            <Button variant="contained" onClick={onSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Checks;
