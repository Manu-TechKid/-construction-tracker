import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { selectIsAuthenticated } from './features/auth/authSlice';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import Buildings from './pages/buildings/Buildings';
import BuildingDetails from './pages/buildings/BuildingDetails';
import CreateBuilding from './pages/buildings/CreateBuilding';
import WorkOrders from './pages/workOrders/WorkOrders';
import WorkOrderDetails from './pages/workOrders/WorkOrderDetails';
import CreateWorkOrder from './pages/workOrders/CreateWorkOrder';
import Workers from './pages/workers/Workers';
import WorkerDetails from './pages/workers/WorkerDetails';
import CreateWorker from './pages/workers/CreateWorker';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

// Reminder Pages
import Reminders from './pages/reminders/Reminders';
import ReminderDetail from './pages/reminders/ReminderDetail';
import CreateReminder from './pages/reminders/CreateReminder';
import EditReminder from './pages/reminders/EditReminder';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthLayout>
                  <Login />
                </AuthLayout>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <AuthLayout>
                  <Register />
                </AuthLayout>
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <PublicRoute>
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Buildings Routes */}
            <Route path="buildings">
              <Route index element={<Buildings />} />
              <Route path="new" element={<CreateBuilding />} />
              <Route path=":id" element={<BuildingDetails />} />
            </Route>
            
            {/* Work Orders Routes */}
            <Route path="work-orders">
              <Route index element={<WorkOrders />} />
              <Route path="new" element={<CreateWorkOrder />} />
              <Route path=":id" element={<WorkOrderDetails />} />
            </Route>
            
            {/* Workers Routes */}
            <Route path="workers">
              <Route index element={<Workers />} />
              <Route path="new" element={<CreateWorker />} />
              <Route path=":id" element={<WorkerDetails />} />
            </Route>
            
            {/* Reminders Routes */}
            <Route path="reminders">
              <Route index element={<Reminders />} />
              <Route path="new" element={<CreateReminder />} />
              <Route path=":id" element={<ReminderDetail />} />
              <Route path=":id/edit" element={<EditReminder />} />
            </Route>
            
            {/* User Routes */}
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />

              {/* 404 Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Box>
    </ThemeProvider>
  );
}

export default App;
