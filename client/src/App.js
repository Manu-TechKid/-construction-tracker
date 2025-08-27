import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './app/store';
import { SettingsProvider } from './contexts/SettingsContext';
import { BuildingProvider } from './contexts/BuildingContext';
import { useSettings } from './contexts/SettingsContext';
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
import CreateWorkOrder from './pages/workOrders/CreateWorkOrder';
import WorkOrderDetails from './pages/workOrders/WorkOrderDetails';
import Workers from './pages/workers/Workers';
import CreateWorker from './pages/workers/CreateWorker';
import Reminders from './pages/reminders/Reminders';
import CreateReminder from './pages/reminders/CreateReminder';
import Invoices from './pages/invoices/Invoices';
import CreateInvoice from './pages/invoices/CreateInvoice';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

// New Components
import NotesSheet from './components/notes/NotesSheet';
import BuildingSchedule from './pages/scheduling/BuildingSchedule';

// Route Protection
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';

const AppContent = () => {
  const { settings } = useSettings();
  const theme = createAppTheme(settings.theme);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BuildingProvider>
        <Router>
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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Buildings */}
              <Route path="buildings" element={<Buildings />} />
              <Route path="buildings/create" element={<CreateBuilding />} />
              <Route path="buildings/:id" element={<BuildingDetails />} />
              <Route path="buildings/:id/edit" element={<BuildingEdit />} />
              
              {/* Work Orders */}
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="work-orders/create" element={<CreateWorkOrder />} />
              <Route path="work-orders/:id" element={<WorkOrderDetails />} />
              
              {/* Workers */}
              <Route path="workers" element={<Workers />} />
              <Route path="workers/create" element={<CreateWorker />} />
              
              {/* Reminders */}
              <Route path="reminders" element={<Reminders />} />
              <Route path="reminders/create" element={<CreateReminder />} />
              
              {/* Invoices */}
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/create" element={<CreateInvoice />} />
              
              {/* New Routes */}
              <Route path="notes" element={<NotesSheet />} />
              <Route path="schedule" element={<BuildingSchedule />} />
              
              {/* User */}
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </BuildingProvider>
      
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
