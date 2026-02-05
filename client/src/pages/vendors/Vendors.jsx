import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
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
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useCreateVendorMutation,
  useDeleteVendorMutation,
  useGetVendorsQuery,
  useUpdateVendorMutation,
} from '../../features/vendors/vendorsApiSlice';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  notes: '',
};

const Vendors = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(['create:vendors']);
  const canUpdate = hasPermission(['update:vendors']);
  const canDelete = hasPermission(['delete:vendors']);

  const { data, isLoading, error } = useGetVendorsQuery();
  const [createVendor, { isLoading: isCreating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: isUpdating }] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();

  const vendors = useMemo(() => data?.data?.vendors || [], [data]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (vendor) => {
    setEditing(vendor);
    setForm({
      name: vendor?.name || '',
      phone: vendor?.phone || '',
      email: vendor?.email || '',
      addressLine1: vendor?.addressLine1 || '',
      addressLine2: vendor?.addressLine2 || '',
      city: vendor?.city || '',
      state: vendor?.state || '',
      zipCode: vendor?.zipCode || '',
      notes: vendor?.notes || '',
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.warning('Vendor name is required');
      return;
    }

    try {
      if (editing?._id) {
        await updateVendor({ id: editing._id, ...form }).unwrap();
        toast.success('Vendor updated');
      } else {
        await createVendor(form).unwrap();
        toast.success('Vendor created');
      }
      close();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to save vendor');
    }
  };

  const onDelete = async (vendorId) => {
    if (!window.confirm('Delete this vendor?')) return;
    try {
      await deleteVendor(vendorId).unwrap();
      toast.success('Vendor deleted');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to delete vendor');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Vendors</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Vendor
          </Button>
        )}
      </Stack>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">Failed to load vendors.</Alert>}

      {!isLoading && !error && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>City</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Zip</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v._id} hover>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.phone || '-'}</TableCell>
                  <TableCell>{v.email || '-'}</TableCell>
                  <TableCell>{v.city || '-'}</TableCell>
                  <TableCell>{v.state || '-'}</TableCell>
                  <TableCell>{v.zipCode || '-'}</TableCell>
                  <TableCell align="right">
                    {canUpdate && (
                      <IconButton color="primary" onClick={() => openEdit(v)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton color="error" onClick={() => onDelete(v._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">No vendors found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              required
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Address Line 1"
              value={form.addressLine1}
              onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Address Line 2"
              value={form.addressLine2}
              onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="City"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                fullWidth
              />
              <TextField
                label="State"
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Zip"
                value={form.zipCode}
                onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
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

export default Vendors;
