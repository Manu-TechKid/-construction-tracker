import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import { Lock as LockIcon, Person as PersonIcon, Edit as EditIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { selectCurrentUser } from '../../features/auth/authSlice';
import ChangePassword from '../../components/auth/ChangePassword';
import { useUpdateMyProfileMutation } from '../../features/auth/authApiSlice';

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string(),
  department: Yup.string(),
});

const Profile = () => {
  const user = useSelector(selectCurrentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [updateMyProfile, { isLoading }] = useUpdateMyProfileMutation();

  const formik = useFormik({
    initialValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await updateMyProfile({
          name: values.name,
          email: values.email,
          phone: values.phone,
        }).unwrap();
        setUpdateSuccess(true);
        setIsEditing(false);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } catch (error) {
        console.error('Profile update failed:', error);
      } finally {
      }
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
    setUpdateSuccess(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    formik.resetForm();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Info Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Typography variant="h5">{user?.name || 'User'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.role || 'User'} • Member since {new Date(user?.createdAt || Date.now()).getFullYear()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.name && Boolean(formik.errors.name)}
                      helperText={formik.touched.name && formik.errors.name}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.email && Boolean(formik.errors.email)}
                      helperText={formik.touched.email && formik.errors.email}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      name="phone"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.phone && Boolean(formik.errors.phone)}
                      helperText={formik.touched.phone && formik.errors.phone}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      name="department"
                      value={formik.values.department}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.department && Boolean(formik.errors.department)}
                      helperText={formik.touched.department && formik.errors.department}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  {!isEditing ? (
                    <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isLoading}
                        startIcon={isLoading && <CircularProgress size={20} />}
                      >
                        Save Changes
                      </Button>
                      <Button variant="outlined" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </>
                  )}
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔒 Account Security
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
                <Typography variant="body1">
                  {user?.role || 'User'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Account Status
                </Typography>
                <Typography variant="body1" color="success.main">
                  {user?.isActive ? 'Active' : 'Inactive'}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Login
                </Typography>
                <Typography variant="body1">
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setChangePasswordOpen(true)}
                sx={{ mb: 1 }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <ChangePassword
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </Container>
  );
};

export default Profile;
