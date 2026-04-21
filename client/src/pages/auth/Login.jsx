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
  Link,
  useMediaQuery,
  useTheme,
  Container,
  Paper,
} from '@mui/material';
import { useLoginMutation } from '../../features/auth/authApiSlice';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [login, { isLoading }] = useLoginMutation();
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
    <Container 
      maxWidth={isMobile ? 'xs' : 'sm'} 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: isMobile ? 2 : 4,
        px: isMobile ? 1 : 2
      }}
    >
      <Paper 
        elevation={isMobile ? 0 : 3}
        sx={{ 
          p: isMobile ? 3 : 4,
          width: '100%',
          borderRadius: isMobile ? 0 : 2,
          boxShadow: isMobile ? 'none' : '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
      <Typography 
        component="h1" 
        variant={isMobile ? "h5" : "h4"} 
        sx={{ 
          mb: isMobile ? 2 : 3, 
          textAlign: 'center',
          fontWeight: 'bold',
          color: 'primary.main',
          fontSize: isMobile ? '1.5rem' : '2rem'
        }}
      >
        Construction Tracker
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{ 
          mb: isMobile ? 3 : 4, 
          textAlign: 'center',
          color: 'text.secondary'
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

          <Box textAlign="center" sx={{ mt: isMobile ? 3 : 2 }}>
            <Link 
              component={RouterLink} 
              to="/forgot-password" 
              variant="body2" 
              sx={{ 
                display: 'block', 
                mb: 1,
                fontSize: isMobile ? '0.9rem' : '0.875rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Forgot your password?
            </Link>
            <Link 
              component={RouterLink} 
              to="/register" 
              variant="body2"
              sx={{ 
                fontSize: isMobile ? '0.9rem' : '0.875rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Don't have an account? Sign Up
            </Link>
          </Box>
        </Stack>
      </form>
      </Paper>
    </Container>
  );
};

export default Login;
