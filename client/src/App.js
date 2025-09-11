import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import { CircularProgress, Box } from '@mui/material';
import 'react-toastify/dist/ReactToastify.css';

import theme from './theme';
import { selectCurrentToken, selectCurrentUser } from './features/auth/authSlice';
import { useRefreshMutation } from './features/auth/authApiSlice';
import { setCredentials } from './features/auth/authSlice';

// Layout Components
import Layout from './components/layout/Layout';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

// Auth Components (keep these as regular imports for faster login)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Lazy load main pages for better performance
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Buildings = lazy(() => import('./pages/buildings/Buildings'));
const BuildingDetails = lazy(() => import('./pages/buildings/BuildingDetails'));
const CreateBuilding = lazy(() => import('./pages/buildings/CreateBuilding'));
const BuildingEdit = lazy(() => import('./pages/buildings/BuildingEdit'));
const WorkOrders = lazy(() => import('./pages/workOrders/WorkOrders'));
const WorkOrderForm = lazy(() => import('./pages/workOrders/WorkOrderForm'));
const WorkOrderDetails = lazy(() => import('./pages/workOrders/WorkOrderDetails'));
const WorkProgress = lazy(() => import('./pages/workOrders/WorkProgress'));
const Workers = lazy(() => import('./pages/workers/Workers'));
const CreateWorker = lazy(() => import('./pages/workers/CreateWorker'));
const Reminders = lazy(() => import('./pages/reminders/Reminders'));
const CreateReminder = lazy(() => import('./pages/reminders/CreateReminder'));
const EditReminder = lazy(() => import('./pages/reminders/EditReminder'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const CreateInvoice = lazy(() => import('./pages/invoices/CreateInvoice'));
const InvoiceDetails = lazy(() => import('./pages/invoices/InvoiceDetails'));
const EditInvoice = lazy(() => import('./pages/invoices/EditInvoice'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Settings = lazy(() => import('./pages/settings/Settings'));

// New Components
import NotesSheet from './components/notes/NotesSheet';
import BuildingSchedule from './pages/scheduling/BuildingSchedule';
import WorkerDashboard from './pages/workers/WorkerDashboard';
import EditWorker from './pages/workers/EditWorker';
import WorkerApproval from './pages/admin/WorkerApproval';

// Route Protection
import ProtectedRoute from './components/auth/ProtectedRoute';

// Loading component for lazy loaded routes
const LoadingFallback = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="60vh"
  >
    <CircularProgress size={40} />
  </Box>
);
import PublicRoute from './components/auth/PublicRoute';

// Role-based route wrapper
const RoleBasedRoute = ({ children, requiredPermissions }) => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(requiredPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Worker redirect component
const WorkerRedirect = () => {
  const { isWorker } = useAuth();
  
  if (isWorker) {
    return <Navigate to="/worker-dashboard" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
};

const AppContent = () => {
  const { settings } = useSettings();
  const theme = createAppTheme(settings.theme);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <BuildingProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <AuthLayout>
                  <Login />
                </AuthLayout>
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <AuthLayout>
                  <Register />
                </AuthLayout>
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              {/* Default redirect based on role */}
              <Route index element={<WorkerRedirect />} />
              
              {/* Main Dashboard - not for workers */}
              <Route 
                path="dashboard" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:all', 'read:workorders']}>
                    <Dashboard />
                  </RoleBasedRoute>
                } 
              />
              
              {/* Worker Dashboard - only for workers */}
              <Route 
                path="worker-dashboard" 
                element={
                  <RoleBasedRoute requiredPermissions={['view:dashboard:worker']}>
                    <WorkerDashboard />
                  </RoleBasedRoute>
                } 
              />

              {/* Buildings */}
              <Route 
                path="buildings" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:buildings']}>
                    <Buildings />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="buildings/create" 
                element={
                  <RoleBasedRoute requiredPermissions={['create:buildings']}>
                    <CreateBuilding />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="buildings/:id/edit" 
                element={
                  <RoleBasedRoute requiredPermissions={['update:buildings']}>
                    <BuildingEdit />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="buildings/:id" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:buildings']}>
                    <BuildingDetails />
                  </RoleBasedRoute>
                } 
              />

              {/* Work Orders */}
              <Route 
                path="work-orders" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:workorders']}>
                    <WorkOrders />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="work-orders/new" 
                element={
                  <RoleBasedRoute requiredPermissions={['create:workorders']}>
                    <WorkOrderForm />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="work-orders/:id/edit" 
                element={
                  <RoleBasedRoute requiredPermissions={['update:workorders']}>
                    <WorkOrderForm />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="work-orders/progress" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:workorders']}>
                    <WorkProgress />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="work-orders/:id" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:workorders']}>
                    <WorkOrderDetails />
                  </RoleBasedRoute>
                } 
              />

              {/* Workers - not accessible by workers themselves */}
              <Route 
                path="workers" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:workers']}>
                    <Workers />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="workers/create" 
                element={
                  <RoleBasedRoute requiredPermissions={['create:workers']}>
                    <CreateWorker />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="workers/:id/edit" 
                element={
                  <RoleBasedRoute requiredPermissions={['update:workers']}>
                    <EditWorker />
                  </RoleBasedRoute>
                } 
              />

              {/* Invoices - not for workers */}
              <Route 
                path="invoices" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:invoices']}>
                    <Invoices />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="invoices/create" 
                element={
                  <RoleBasedRoute requiredPermissions={['create:invoices']}>
                    <CreateInvoice />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="invoices/:id" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:invoices']}>
                    <InvoiceDetails />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="invoices/:id/edit" 
                element={
                  <RoleBasedRoute requiredPermissions={['update:invoices']}>
                    <EditInvoice />
                  </RoleBasedRoute>
                } 
              />

              {/* Reminders */}
              <Route 
                path="reminders" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:reminders']}>
                    <Reminders />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="reminders/create" 
                element={
                  <RoleBasedRoute requiredPermissions={['create:reminders']}>
                    <CreateReminder />
                  </RoleBasedRoute>
                } 
              />
              <Route 
                path="reminders/:id/edit" 
                element={
                  <RoleBasedRoute requiredPermissions={['update:reminders']}>
                    <EditReminder />
                  </RoleBasedRoute>
                } 
              />

              {/* Notes */}
              <Route 
                path="notes" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:notes']}>
                    <NotesSheet />
                  </RoleBasedRoute>
                } 
              />

              {/* Schedule */}
              <Route 
                path="schedule" 
                element={
                  <RoleBasedRoute requiredPermissions={['read:schedules']}>
                    <BuildingSchedule />
                  </RoleBasedRoute>
                } 
              />

              {/* Worker Approval */}
              <Route 
                path="worker-approval" 
                element={
                  <RoleBasedRoute requiredPermissions={['approve:workers']}>
                    <WorkerApproval />
                  </RoleBasedRoute>
                } 
              />

              {/* Profile and Settings - accessible to all */}
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Unauthorized page */}
            <Route 
              path="/unauthorized" 
              element={
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this page.</p>
                </div>
              } 
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={settings.theme}
          />
        </BuildingProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <Provider store={store}>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </Provider>
  );
}

export default App;
