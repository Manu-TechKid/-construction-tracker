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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLoginMutation } from '../../features/auth/authApiSlice';
import { useDispatch } from 'react-redux';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const [formErrors, setFormErrors] = useState(null);

  // Get the 'from' location or default to '/dashboard'
  const from = location.state?.from?.pathname || '/dashboard';

  // Form validation schema
  const validationSchema = Yup.object().shape({
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
        console.log('Attempting login for:', values.email);
        
        const result = await login(values).unwrap();
        console.log('Login successful:', result);
        
        // Redirect to the originally requested page or dashboard
        navigate(from, { replace: true });
      } catch (err) {
        console.error('Login error:', err);
        
        // Better error handling for mobile
        let errorMessage = 'Login failed. Please try again.';
        
        if (err?.status === 401) {
          errorMessage = 'Invalid email or password.';
        } else if (err?.status === 429) {
          errorMessage = 'Too many login attempts. Please wait and try again.';
        } else if (err?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (err?.data?.message) {
          errorMessage = err.data.message;
        }
        
        setFormErrors(errorMessage);
      }
    },
  });

  // simplified UI to ensure everything renders clearly

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: isMobile ? '100%' : 400,
      mx: 'auto',
      p: isMobile ? 2 : 3,
      minHeight: isMobile ? '100vh' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isMobile ? 'center' : 'flex-start'
    }}>
      <Typography 
        component="h1" 
        variant={isMobile ? "h6" : "h5"} 
        sx={{ 
          mb: 3, 
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        Sign in to your account
      </Typography>

      {formErrors && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formErrors}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Stack spacing={isMobile ? 3 : 2}>
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
            autoFocus={!isMobile}
            size={isMobile ? "medium" : "medium"}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: isMobile ? '16px' : '14px', // Prevents zoom on iOS
              }
            }}
          />

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
            sx={{
              '& .MuiInputBase-input': {
                fontSize: isMobile ? '16px' : '14px', // Prevents zoom on iOS
              }
            }}
          />

          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            disabled={isLoading || formik.isSubmitting} 
            size={isMobile ? "large" : "medium"}
            sx={{ 
              py: isMobile ? 2 : 1.5,
              fontSize: isMobile ? '18px' : '14px',
              mt: 2,
              position: 'relative'
            }}
          >
            {(isLoading || formik.isSubmitting) ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                {isMobile ? 'Signing In...' : 'Loading...'}
              </>
            ) : (
              'Sign In'
            )}
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
