import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  useGetMyEmployeeProfileQuery,
  useSubmitMyEmployeeProfileMutation,
  useUpsertMyEmployeeProfileMutation,
} from '../../features/employeeProfiles/employeeProfilesApiSlice';
import { useGetUploadSignatureMutation } from '../../features/uploads/uploadsApiSlice';

const MyResume = () => {
  const { data, isLoading, error } = useGetMyEmployeeProfileQuery();
  const profile = data?.data?.profile;

  const [upsert, { isLoading: isSaving }] = useUpsertMyEmployeeProfileMutation();
  const [submit, { isLoading: isSubmitting }] = useSubmitMyEmployeeProfileMutation();
  const [getSignature, { isLoading: isSigning }] = useGetUploadSignatureMutation();

  const initialForm = useMemo(() => ({
    dateOfApplication: profile?.dateOfApplication ? new Date(profile.dateOfApplication).toISOString().slice(0, 10) : '',
    personal: {
      fullName: profile?.personal?.fullName || '',
      email: profile?.personal?.email || '',
      mobileNumber: profile?.personal?.mobileNumber || '',
      currentResidentialAddress: profile?.personal?.currentResidentialAddress || '',
    },
    identification: {
      idType: profile?.identification?.idType || '',
      idNumber: profile?.identification?.idNumber || '',
      numberType: profile?.identification?.numberType || '',
      numberValue: profile?.identification?.numberValue || '',
    },
    constructionExperience: {
      hasPreviousExperience: !!profile?.constructionExperience?.hasPreviousExperience,
      yearsOfExperience: profile?.constructionExperience?.yearsOfExperience || '',
      lastCompanyOrProjectName: profile?.constructionExperience?.lastCompanyOrProjectName || '',
    },
    skills: {
      otherSkills: profile?.skills?.otherSkills || '',
    },
    availability: {
      availableToStartFrom: profile?.availability?.availableToStartFrom ? new Date(profile.availability.availableToStartFrom).toISOString().slice(0, 10) : '',
    },
    documents: Array.isArray(profile?.documents) ? profile.documents : [],
    status: profile?.status || 'draft',
  }), [profile]);

  const [form, setForm] = useState(initialForm);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docLabel, setDocLabel] = useState('');
  const [docFile, setDocFile] = useState(null);

  React.useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const setNested = (path, value) => {
    setForm((p) => {
      const next = { ...p };
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...(cur[parts[i]] || {}) };
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const onSave = async () => {
    try {
      const payload = {
        dateOfApplication: form.dateOfApplication ? new Date(form.dateOfApplication).toISOString() : undefined,
        personal: form.personal,
        identification: form.identification,
        constructionExperience: {
          ...form.constructionExperience,
          hasPreviousExperience: !!form.constructionExperience?.hasPreviousExperience,
        },
        skills: form.skills,
        availability: {
          ...form.availability,
          availableToStartFrom: form.availability?.availableToStartFrom ? new Date(form.availability.availableToStartFrom).toISOString() : undefined,
        },
        documents: form.documents,
      };

      await upsert(payload).unwrap();
      toast.success('Saved');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to save');
    }
  };

  const onSubmit = async () => {
    if (!window.confirm('Submit your application? You can still edit later, but status will be submitted.')) return;
    try {
      await submit().unwrap();
      toast.success('Submitted');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to submit');
    }
  };

  const openDocDialog = () => {
    setDocLabel('');
    setDocFile(null);
    setDocDialogOpen(true);
  };

  const closeDocDialog = () => {
    setDocDialogOpen(false);
    setDocLabel('');
    setDocFile(null);
  };

  const uploadToCloudinary = async (file) => {
    const sig = await getSignature({ folder: 'construction-tracker/employee-profiles' }).unwrap();
    const s = sig?.data;
    if (!s?.uploadUrl || !s?.apiKey || !s?.timestamp || !s?.folder || !s?.signature) {
      throw new Error('Upload signature is missing fields');
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', s.apiKey);
    fd.append('timestamp', String(s.timestamp));
    fd.append('folder', s.folder);
    fd.append('signature', s.signature);

    const resp = await fetch(s.uploadUrl, { method: 'POST', body: fd });
    const json = await resp.json();

    if (!resp.ok) {
      throw new Error(json?.error?.message || 'Upload failed');
    }

    return {
      url: json.secure_url || json.url,
      publicId: json.public_id,
      fileType: json.resource_type,
    };
  };

  const onAddDocument = async () => {
    if (!docFile) {
      toast.warning('Choose a file');
      return;
    }

    try {
      const uploaded = await uploadToCloudinary(docFile);
      const newDoc = {
        label: docLabel || docFile.name,
        url: uploaded.url,
        publicId: uploaded.publicId,
        fileType: docFile.type || uploaded.fileType,
      };

      setForm((p) => ({ ...p, documents: [...(p.documents || []), newDoc] }));
      closeDocDialog();
      toast.success('Document added (remember to Save)');
    } catch (err) {
      toast.error(err?.message || 'Failed to upload document');
    }
  };

  const onRemoveDocument = (idx) => {
    setForm((p) => ({ ...p, documents: (p.documents || []).filter((_, i) => i !== idx) }));
  };

  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load profile.</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4">My Resume / Application</Typography>
        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
          <Button variant="outlined" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="contained" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Basic Info</Typography>
        <Stack spacing={2}>
          <TextField
            label="Date of Application"
            type="date"
            value={form.dateOfApplication}
            onChange={(e) => setForm((p) => ({ ...p, dateOfApplication: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Full Name"
            value={form.personal.fullName}
            onChange={(e) => setNested('personal.fullName', e.target.value)}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Email"
              value={form.personal.email}
              onChange={(e) => setNested('personal.email', e.target.value)}
              fullWidth
            />
            <TextField
              label="Mobile"
              value={form.personal.mobileNumber}
              onChange={(e) => setNested('personal.mobileNumber', e.target.value)}
              fullWidth
            />
          </Stack>
          <TextField
            label="Address"
            value={form.personal.currentResidentialAddress}
            onChange={(e) => setNested('personal.currentResidentialAddress', e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Identification</Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="ID Type (passport / nationalid / other)"
              value={form.identification.idType}
              onChange={(e) => setNested('identification.idType', e.target.value)}
              fullWidth
            />
            <TextField
              label="ID Number"
              value={form.identification.idNumber}
              onChange={(e) => setNested('identification.idNumber', e.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Number Type (social_security / tax_id / iem)"
              value={form.identification.numberType}
              onChange={(e) => setNested('identification.numberType', e.target.value)}
              fullWidth
            />
            <TextField
              label="Number"
              value={form.identification.numberValue}
              onChange={(e) => setNested('identification.numberValue', e.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Documents</Typography>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={openDocDialog}>
            Add Document
          </Button>
        </Stack>

        {(form.documents || []).length === 0 && (
          <Typography variant="body2" color="text.secondary">No documents uploaded</Typography>
        )}

        <Stack spacing={1}>
          {(form.documents || []).map((d, idx) => (
            <Paper key={d.publicId || idx} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Box>
                  <Typography variant="body1">{d.label || 'Document'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {d.url}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" href={d.url} target="_blank" rel="noreferrer">Open</Button>
                  <IconButton color="error" onClick={() => onRemoveDocument(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Dialog open={docDialogOpen} onClose={closeDocDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Document</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Label"
              value={docLabel}
              onChange={(e) => setDocLabel(e.target.value)}
              fullWidth
            />
            <Button component="label" variant="outlined" startIcon={<AddIcon />}
              sx={{ justifyContent: 'flex-start' }}>
              Choose File
              <input hidden type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
            </Button>
            {docFile && (
              <Typography variant="body2">Selected: {docFile.name}</Typography>
            )}
            {(isSigning || isSubmitting) && (
              <Typography variant="body2" color="text.secondary">Preparing upload...</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDocDialog}>Cancel</Button>
          <Button variant="contained" onClick={onAddDocument} disabled={isSigning || isSubmitting || !docFile}>
            {isSigning ? 'Signing...' : isSubmitting ? 'Submitting...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyResume;
