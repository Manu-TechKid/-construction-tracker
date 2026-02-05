import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
  const status = profile?.status || 'draft';
  const isApproved = status === 'approved';

  const [upsert, { isLoading: isSaving }] = useUpsertMyEmployeeProfileMutation();
  const [submit, { isLoading: isSubmitting }] = useSubmitMyEmployeeProfileMutation();
  const [getSignature, { isLoading: isSigning }] = useGetUploadSignatureMutation();

  const initialForm = useMemo(() => ({
    dateOfApplication: profile?.dateOfApplication ? new Date(profile.dateOfApplication).toISOString().slice(0, 10) : '',
    personal: {
      fullName: profile?.personal?.fullName || '',
      guardianName: profile?.personal?.guardianName || '',
      dateOfBirth: profile?.personal?.dateOfBirth ? new Date(profile.personal.dateOfBirth).toISOString().slice(0, 10) : '',
      gender: profile?.personal?.gender || '',
      nationality: profile?.personal?.nationality || '',
      maritalStatus: profile?.personal?.maritalStatus || '',
      email: profile?.personal?.email || '',
      mobileNumber: profile?.personal?.mobileNumber || '',
      emergencyPhone: profile?.personal?.emergencyPhone || '',
      emergencyContactNumber: profile?.personal?.emergencyContactNumber || '',
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
      roles: {
        generalLabor: !!profile?.constructionExperience?.roles?.generalLabor,
        masonHelper: !!profile?.constructionExperience?.roles?.masonHelper,
        carpenterHelper: !!profile?.constructionExperience?.roles?.carpenterHelper,
        steelRebarHelper: !!profile?.constructionExperience?.roles?.steelRebarHelper,
        electricalHelper: !!profile?.constructionExperience?.roles?.electricalHelper,
        plumbingHelper: !!profile?.constructionExperience?.roles?.plumbingHelper,
        equipmentToolOperator: !!profile?.constructionExperience?.roles?.equipmentToolOperator,
        siteCleaner: !!profile?.constructionExperience?.roles?.siteCleaner,
        other: profile?.constructionExperience?.roles?.other || '',
      },
      yearsOfExperience: profile?.constructionExperience?.yearsOfExperience || '',
      lastCompanyOrProjectName: profile?.constructionExperience?.lastCompanyOrProjectName || '',
    },
    skills: {
      materialHandlingLifting: !!profile?.skills?.materialHandlingLifting,
      concreteMixing: !!profile?.skills?.concreteMixing,
      basicToolHandling: !!profile?.skills?.basicToolHandling,
      painting: !!profile?.skills?.painting,
      drywall: !!profile?.skills?.drywall,
      finishing: !!profile?.skills?.finishing,
      siteCleaningMaintenance: !!profile?.skills?.siteCleaningMaintenance,
      scaffoldingAssistance: !!profile?.skills?.scaffoldingAssistance,
      canFollowSafetyInstructions: !!profile?.skills?.canFollowSafetyInstructions,
      otherSkills: profile?.skills?.otherSkills || '',
    },
    availability: {
      availableToStartFrom: profile?.availability?.availableToStartFrom ? new Date(profile.availability.availableToStartFrom).toISOString().slice(0, 10) : '',
      preferredWorkType: profile?.availability?.preferredWorkType || '',
      willingToWorkOvertime: !!profile?.availability?.willingToWorkOvertime,
      willingToWorkAtDifferentJobSites: !!profile?.availability?.willingToWorkAtDifferentJobSites,
    },
    healthSafety: {
      anyMedicalConditionAffectingWork: !!profile?.healthSafety?.anyMedicalConditionAffectingWork,
      medicalConditionDetails: profile?.healthSafety?.medicalConditionDetails || '',
    },
    declaration: {
      applicantSignatureName: profile?.declaration?.applicantSignatureName || '',
      signatureDataUrl: profile?.declaration?.signatureDataUrl || '',
      date: profile?.declaration?.date ? new Date(profile.declaration.date).toISOString().slice(0, 10) : '',
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
    if (isApproved) {
      toast.info('Your application is approved and cannot be edited.');
      return;
    }
    try {
      const payload = {
        dateOfApplication: form.dateOfApplication ? new Date(form.dateOfApplication).toISOString() : undefined,
        personal: {
          ...form.personal,
          dateOfBirth: form.personal?.dateOfBirth ? new Date(form.personal.dateOfBirth).toISOString() : undefined,
        },
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
        healthSafety: {
          ...form.healthSafety,
          anyMedicalConditionAffectingWork: !!form.healthSafety?.anyMedicalConditionAffectingWork,
        },
        declaration: {
          ...form.declaration,
          date: form.declaration?.date ? new Date(form.declaration.date).toISOString() : undefined,
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
    if (isApproved) {
      toast.info('Your application is approved and cannot be re-submitted.');
      return;
    }

    const msg = status === 'submitted'
      ? 'Your application is already submitted. Re-submit now?'
      : 'Submit your application? You can still edit later, but status will be submitted.';
    if (!window.confirm(msg)) return;
    try {
      await submit().unwrap();
      toast.success('Submitted');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to submit');
    }
  };

  const openDocDialog = () => {
    if (isApproved) {
      toast.info('Your application is approved and cannot be edited.');
      return;
    }
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
    if (isApproved) {
      toast.info('Your application is approved and cannot be edited.');
      return;
    }
    setForm((p) => ({ ...p, documents: (p.documents || []).filter((_, i) => i !== idx) }));
  };

  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load profile.</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4">My Resume / Application</Typography>
        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
          <Button variant="outlined" onClick={onSave} disabled={isSaving || isApproved}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="contained" onClick={onSubmit} disabled={isSubmitting || isApproved}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Typography variant="subtitle1">Application Status</Typography>
          <Chip
            label={status}
            color={status === 'approved' ? 'success' : status === 'rejected' ? 'error' : status === 'submitted' ? 'warning' : 'default'}
            size="small"
          />
        </Stack>
        {isApproved && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Your application is approved and is now locked.
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Personal Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date of Application"
              type="date"
              value={form.dateOfApplication}
              onChange={(e) => setForm((p) => ({ ...p, dateOfApplication: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Full Name"
              value={form.personal.fullName}
              onChange={(e) => setNested('personal.fullName', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Guardian Name"
              value={form.personal.guardianName}
              onChange={(e) => setNested('personal.guardianName', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date of Birth"
              type="date"
              value={form.personal.dateOfBirth}
              onChange={(e) => setNested('personal.dateOfBirth', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isApproved}>
              <InputLabel id="gender">Gender</InputLabel>
              <Select
                labelId="gender"
                label="Gender"
                value={form.personal.gender}
                onChange={(e) => setNested('personal.gender', e.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isApproved}>
              <InputLabel id="marital">Marital Status</InputLabel>
              <Select
                labelId="marital"
                label="Marital Status"
                value={form.personal.maritalStatus}
                onChange={(e) => setNested('personal.maritalStatus', e.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="single">Single</MenuItem>
                <MenuItem value="married">Married</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nationality"
              value={form.personal.nationality}
              onChange={(e) => setNested('personal.nationality', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              value={form.personal.email}
              onChange={(e) => setNested('personal.email', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Mobile"
              value={form.personal.mobileNumber}
              onChange={(e) => setNested('personal.mobileNumber', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Emergency Phone"
              value={form.personal.emergencyPhone}
              onChange={(e) => setNested('personal.emergencyPhone', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Emergency Contact Number"
              value={form.personal.emergencyContactNumber}
              onChange={(e) => setNested('personal.emergencyContactNumber', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Current Residential Address"
              value={form.personal.currentResidentialAddress}
              onChange={(e) => setNested('personal.currentResidentialAddress', e.target.value)}
              fullWidth
              multiline
              minRows={2}
              disabled={isApproved}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Identification</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isApproved}>
              <InputLabel id="idType">ID Type</InputLabel>
              <Select
                labelId="idType"
                label="ID Type"
                value={form.identification.idType}
                onChange={(e) => setNested('identification.idType', e.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="nationalid">National ID</MenuItem>
                <MenuItem value="passport">Passport</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="ID Number"
              value={form.identification.idNumber}
              onChange={(e) => setNested('identification.idNumber', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isApproved}>
              <InputLabel id="numType">Number Type</InputLabel>
              <Select
                labelId="numType"
                label="Number Type"
                value={form.identification.numberType}
                onChange={(e) => setNested('identification.numberType', e.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="social_security">Social Security</MenuItem>
                <MenuItem value="tax_id">Tax ID</MenuItem>
                <MenuItem value="iem">IEM</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Number"
              value={form.identification.numberValue}
              onChange={(e) => setNested('identification.numberValue', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Construction Experience</Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!form.constructionExperience.hasPreviousExperience}
                onChange={(e) => setNested('constructionExperience.hasPreviousExperience', e.target.checked)}
                disabled={isApproved}
              />
            }
            label="Do you have previous construction experience?"
          />
          <Divider />
          <Typography variant="body2" color="text.secondary">Roles (check all that apply)</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.generalLabor} onChange={(e) => setNested('constructionExperience.roles.generalLabor', e.target.checked)} disabled={isApproved} />}
                label="General Labor"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.masonHelper} onChange={(e) => setNested('constructionExperience.roles.masonHelper', e.target.checked)} disabled={isApproved} />}
                label="Mason Helper"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.carpenterHelper} onChange={(e) => setNested('constructionExperience.roles.carpenterHelper', e.target.checked)} disabled={isApproved} />}
                label="Carpenter Helper"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.steelRebarHelper} onChange={(e) => setNested('constructionExperience.roles.steelRebarHelper', e.target.checked)} disabled={isApproved} />}
                label="Steel / Rebar Helper"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.electricalHelper} onChange={(e) => setNested('constructionExperience.roles.electricalHelper', e.target.checked)} disabled={isApproved} />}
                label="Electrical Helper"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.plumbingHelper} onChange={(e) => setNested('constructionExperience.roles.plumbingHelper', e.target.checked)} disabled={isApproved} />}
                label="Plumbing Helper"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.equipmentToolOperator} onChange={(e) => setNested('constructionExperience.roles.equipmentToolOperator', e.target.checked)} disabled={isApproved} />}
                label="Equipment / Tool Operator"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!form.constructionExperience.roles.siteCleaner} onChange={(e) => setNested('constructionExperience.roles.siteCleaner', e.target.checked)} disabled={isApproved} />}
                label="Site Cleaner"
              />
            </Grid>
          </Grid>
          <TextField
            label="Other (Role)"
            value={form.constructionExperience.roles.other}
            onChange={(e) => setNested('constructionExperience.roles.other', e.target.value)}
            fullWidth
            disabled={isApproved}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Years of Experience"
              value={form.constructionExperience.yearsOfExperience}
              onChange={(e) => setNested('constructionExperience.yearsOfExperience', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
            <TextField
              label="Last Company / Project Name"
              value={form.constructionExperience.lastCompanyOrProjectName}
              onChange={(e) => setNested('constructionExperience.lastCompanyOrProjectName', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Skills</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Check all that apply</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.materialHandlingLifting} onChange={(e) => setNested('skills.materialHandlingLifting', e.target.checked)} disabled={isApproved} />} label="Material Handling / Lifting" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.concreteMixing} onChange={(e) => setNested('skills.concreteMixing', e.target.checked)} disabled={isApproved} />} label="Concrete Mixing" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.basicToolHandling} onChange={(e) => setNested('skills.basicToolHandling', e.target.checked)} disabled={isApproved} />} label="Basic Tool Handling" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.painting} onChange={(e) => setNested('skills.painting', e.target.checked)} disabled={isApproved} />} label="Painting" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.drywall} onChange={(e) => setNested('skills.drywall', e.target.checked)} disabled={isApproved} />} label="Drywall" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.finishing} onChange={(e) => setNested('skills.finishing', e.target.checked)} disabled={isApproved} />} label="Finishing" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.siteCleaningMaintenance} onChange={(e) => setNested('skills.siteCleaningMaintenance', e.target.checked)} disabled={isApproved} />} label="Site Cleaning / Maintenance" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.scaffoldingAssistance} onChange={(e) => setNested('skills.scaffoldingAssistance', e.target.checked)} disabled={isApproved} />} label="Scaffolding Assistance" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!form.skills.canFollowSafetyInstructions} onChange={(e) => setNested('skills.canFollowSafetyInstructions', e.target.checked)} disabled={isApproved} />} label="Can Follow Safety Instructions" />
          </Grid>
        </Grid>
        <TextField
          sx={{ mt: 1 }}
          label="Other Skills"
          value={form.skills.otherSkills}
          onChange={(e) => setNested('skills.otherSkills', e.target.value)}
          fullWidth
          multiline
          minRows={2}
          disabled={isApproved}
        />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Availability</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Available To Start From"
              type="date"
              value={form.availability.availableToStartFrom}
              onChange={(e) => setNested('availability.availableToStartFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isApproved}>
              <InputLabel id="pwt">Preferred Work Type</InputLabel>
              <Select
                labelId="pwt"
                label="Preferred Work Type"
                value={form.availability.preferredWorkType}
                onChange={(e) => setNested('availability.preferredWorkType', e.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="daily_wage">Daily Wage</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Checkbox checked={!!form.availability.willingToWorkOvertime} onChange={(e) => setNested('availability.willingToWorkOvertime', e.target.checked)} disabled={isApproved} />}
              label="Willing to work overtime"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Checkbox checked={!!form.availability.willingToWorkAtDifferentJobSites} onChange={(e) => setNested('availability.willingToWorkAtDifferentJobSites', e.target.checked)} disabled={isApproved} />}
              label="Willing to work at different job sites"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Health & Safety</Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={<Checkbox checked={!!form.healthSafety.anyMedicalConditionAffectingWork} onChange={(e) => setNested('healthSafety.anyMedicalConditionAffectingWork', e.target.checked)} disabled={isApproved} />}
            label="Any medical condition that may affect work?"
          />
          <TextField
            label="Medical Condition Details"
            value={form.healthSafety.medicalConditionDetails}
            onChange={(e) => setNested('healthSafety.medicalConditionDetails', e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={isApproved || !form.healthSafety.anyMedicalConditionAffectingWork}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Declaration</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Applicant Signature Name"
              value={form.declaration.applicantSignatureName}
              onChange={(e) => setNested('declaration.applicantSignatureName', e.target.value)}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Declaration Date"
              type="date"
              value={form.declaration.date}
              onChange={(e) => setNested('declaration.date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={isApproved}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Documents</Typography>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={openDocDialog} disabled={isApproved}>
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
                  <IconButton color="error" onClick={() => onRemoveDocument(idx)} disabled={isApproved}>
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
