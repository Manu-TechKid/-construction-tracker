import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import { CircularProgress, Box } from '@mui/material';
import 'react-toastify/dist/ReactToastify.css';

import theme from './theme/theme';

// Layout Components
import RoleBasedRoute from './components/auth/RoleBasedRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';

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

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              <Route path="dashboard" element={
                <RoleBasedRoute requiredPermissions={['read:all', 'read:workorders']}>
                  <Dashboard />
                </RoleBasedRoute>
              } />

              <Route path="buildings" element={
                <RoleBasedRoute requiredPermissions={['read:buildings']}>
                  <Buildings />
                </RoleBasedRoute>
              } />
              <Route path="buildings/create" element={
                <RoleBasedRoute requiredPermissions={['create:buildings']}>
                  <CreateBuilding />
                </RoleBasedRoute>
              } />
              <Route path="buildings/:id/edit" element={
                <RoleBasedRoute requiredPermissions={['update:buildings']}>
                  <BuildingEdit />
                </RoleBasedRoute>
              } />
              <Route path="buildings/:id" element={
                <RoleBasedRoute requiredPermissions={['read:buildings']}>
                  <BuildingDetails />
                </RoleBasedRoute>
              } />

              <Route path="work-orders" element={
                <RoleBasedRoute requiredPermissions={['read:workorders']}>
                  <WorkOrders />
                </RoleBasedRoute>
              } />
              <Route path="work-orders/new" element={
                <RoleBasedRoute requiredPermissions={['create:workorders']}>
                  <WorkOrderForm />
                </RoleBasedRoute>
              } />
              <Route path="work-orders/:id/edit" element={
                <RoleBasedRoute requiredPermissions={['update:workorders']}>
                  <WorkOrderForm />
                </RoleBasedRoute>
              } />
              <Route path="work-orders/progress" element={
                <RoleBasedRoute requiredPermissions={['read:workorders']}>
                  <WorkProgress />
                </RoleBasedRoute>
              } />
              <Route path="work-orders/:id" element={
                <RoleBasedRoute requiredPermissions={['read:workorders']}>
                  <WorkOrderDetails />
                </RoleBasedRoute>
              } />

              <Route path="workers" element={
                <RoleBasedRoute requiredPermissions={['read:workers']}>
                  <Workers />
                </RoleBasedRoute>
              } />
              <Route path="workers/create" element={
                <RoleBasedRoute requiredPermissions={['create:workers']}>
                  <CreateWorker />
                </RoleBasedRoute>
              } />

              <Route path="reminders" element={
                <RoleBasedRoute requiredPermissions={['read:reminders']}>
                  <Reminders />
                </RoleBasedRoute>
              } />
              <Route path="reminders/create" element={
                <RoleBasedRoute requiredPermissions={['create:reminders']}>
                  <CreateReminder />
                </RoleBasedRoute>
              } />
              <Route path="reminders/:id/edit" element={
                <RoleBasedRoute requiredPermissions={['update:reminders']}>
                  <EditReminder />
                </RoleBasedRoute>
              } />

              <Route path="invoices" element={
                <RoleBasedRoute requiredPermissions={['read:invoices']}>
                  <Invoices />
                </RoleBasedRoute>
              } />
              <Route path="invoices/create" element={
                <RoleBasedRoute requiredPermissions={['create:invoices']}>
                  <CreateInvoice />
                </RoleBasedRoute>
              } />
              <Route path="invoices/:id" element={
                <RoleBasedRoute requiredPermissions={['read:invoices']}>
                  <InvoiceDetails />
                </RoleBasedRoute>
              } />
              <Route path="invoices/:id/edit" element={
                <RoleBasedRoute requiredPermissions={['update:invoices']}>
                  <EditInvoice />
                </RoleBasedRoute>
              } />

              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  );
};

export default App;
