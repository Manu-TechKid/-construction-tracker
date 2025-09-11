import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './app/store';
import { SettingsProvider } from './contexts/SettingsContext';
import { BuildingProvider } from './contexts/BuildingContext';
import { useSettings } from './contexts/SettingsContext';
import { useAuth } from './hooks/useAuth';
import { createAppTheme } from './theme/theme';

// Layout Components
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Main Pages
import Dashboard from './pages/dashboard/Dashboard';
import Buildings from './pages/buildings/Buildings';
import BuildingDetails from './pages/buildings/BuildingDetails';
import CreateBuilding from './pages/buildings/CreateBuilding';
import BuildingEdit from './pages/buildings/BuildingEdit';
import WorkOrders from './pages/workOrders/WorkOrders';
import WorkOrderForm from './pages/workOrders/WorkOrderForm';
import WorkOrderDetails from './pages/workOrders/WorkOrderDetails';
import WorkProgress from './pages/workOrders/WorkProgress';
import Workers from './pages/workers/Workers';
import CreateWorker from './pages/workers/CreateWorker';
import Reminders from './pages/reminders/Reminders';
import CreateReminder from './pages/reminders/CreateReminder';
import EditReminder from './pages/reminders/EditReminder';
import Invoices from './pages/invoices/Invoices';
import CreateInvoice from './pages/invoices/CreateInvoice';
import InvoiceDetails from './pages/invoices/InvoiceDetails';
import EditInvoice from './pages/invoices/EditInvoice';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

// New Components
import NotesSheet from './components/notes/NotesSheet';
import BuildingSchedule from './pages/scheduling/BuildingSchedule';
import WorkerDashboard from './pages/workers/WorkerDashboard';
import EditWorker from './pages/workers/EditWorker';
import WorkerApproval from './pages/admin/WorkerApproval';

// Route Protection
import ProtectedRoute from './components/auth/ProtectedRoute';
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
