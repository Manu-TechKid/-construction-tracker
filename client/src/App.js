import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { lightTheme, darkTheme } from './theme/theme';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

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
import Invoices from './pages/invoices/Invoices';
import CreateInvoice from './pages/invoices/CreateInvoice';

// Reminder Pages
import Reminders from './pages/reminders/Reminders';
import ReminderDetail from './pages/reminders/ReminderDetail';
import CreateReminder from './pages/reminders/CreateReminder';
import EditReminder from './pages/reminders/EditReminder';

// Theme wrapper component
function ThemedApp({ children }) {
  const { settings } = useSettings();
  const theme = settings.theme === 'dark' ? darkTheme : lightTheme;

  // Apply language to document
  React.useEffect(() => {
    document.documentElement.lang = settings.language || 'en';
  }, [settings.language]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <Register />
            </AuthLayout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthLayout>
              <ForgotPassword />
            </AuthLayout>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <AuthLayout>
              <ResetPassword />
            </AuthLayout>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <DashboardLayout />
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
          
          {/* Invoices Routes */}
          <Route path="invoices">
            <Route index element={<Invoices />} />
            <Route path="new" element={<CreateInvoice />} />
          </Route>
          
          {/* Reminders Routes */}
          <Route path="reminders">
            <Route index element={<Reminders />} />
            <Route path=":id" element={<ReminderDetail />} />
            <Route path="new" element={<CreateReminder />} />
            <Route path=":id/edit" element={<EditReminder />} />
          </Route>
          
          {/* User Routes */}
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />

          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SettingsProvider>
        <ThemedApp>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              autoHideDuration={3000}
            >
              <AppContent />
            </SnackbarProvider>
          </LocalizationProvider>
        </ThemedApp>
      </SettingsProvider>
    </Provider>
  );
}

export default App;
