import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  Box, 
  Button, 
  TextField, 
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Link,
} from '@mui/material';
import { useLoginMutation } from '../../features/auth/authApiSlice';
import { useDispatch } from 'react-redux';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const [formErrors, setFormErrors] = useState(null);

  // Get the 'from' location or default to '/dashboard'
  const from = location.state?.from?.pathname || '/dashboard';

  // Form validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Enter a valid email')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setFormErrors(null);
        await login(values).unwrap();
        // Redirect to the originally requested page or dashboard
        navigate(from, { replace: true });
      } catch (err) {
        console.error('Login error:', err);
        setFormErrors(err?.data?.message || 'Login failed. Please try again.');
      }
    },
  });

  // simplified UI to ensure everything renders clearly

  return (
    <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto' }}>
      <Typography component="h1" variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
        Sign in to your account
      </Typography>

      {formErrors && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formErrors}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email Address"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            autoComplete="email"
            autoFocus
          />

          <Divider flexItem />

          <TextField
            fullWidth
            id="password"
            name="password"
            label="Password"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            autoComplete="current-password"
          />

          <Button type="submit" fullWidth variant="contained" disabled={isLoading} sx={{ py: 1.5 }}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>

          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ display: 'block', mb: 1 }}>
              Forgot your password?
            </Link>
            <Link component={RouterLink} to="/register" variant="body2">
              Don't have an account? Sign Up
            </Link>
          </Box>
        </Stack>
      </form>
    </Box>
  );
};

export default Login;
