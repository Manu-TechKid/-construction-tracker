import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useResetPasswordMutation } from '../../features/auth/authApiSlice';

const validationSchema = Yup.object({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  passwordConfirm: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: {
      password: '',
      passwordConfirm: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        
        await resetPassword({
          token,
          password: values.password,
          passwordConfirm: values.passwordConfirm,
        }).unwrap();
        
        // Redirect to login with success message
        navigate('/login', { 
          state: { message: 'Password reset successful. Please log in with your new password.' }
        });
      } catch (err) {
        setError(err?.data?.message || 'Failed to reset password');
      }
    },
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reset Password
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your new password below.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        id="password"
        name="password"
        label="New Password"
        type="password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
        margin="normal"
        autoComplete="new-password"
        autoFocus
      />

      <TextField
        fullWidth
        id="passwordConfirm"
        name="passwordConfirm"
        label="Confirm New Password"
        type="password"
        value={formik.values.passwordConfirm}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.passwordConfirm && Boolean(formik.errors.passwordConfirm)}
        helperText={formik.touched.passwordConfirm && formik.errors.passwordConfirm}
        margin="normal"
        autoComplete="new-password"
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={isLoading}
        sx={{ mt: 3, mb: 2 }}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Reset Password'}
      </Button>
    </Box>
  );
};

export default ResetPassword;
