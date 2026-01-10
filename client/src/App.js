import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './app/store';
import { SettingsProvider } from './contexts/SettingsContext';
import { BuildingProvider } from './contexts/BuildingContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
import ErrorBoundary from './components/common/ErrorBoundary';
import BuildingSchedule from './pages/scheduling/BuildingSchedule';
import WorkerDashboard from './pages/workers/WorkerDashboard';
import EditWorker from './pages/workers/EditWorker';
import WorkerDetails from './pages/workers/WorkerDetails';
import WorkerManagement from './pages/workers/WorkerManagement';
import UserManagement from './pages/admin/UserManagement';
import WorkOrderApproval from './pages/admin/WorkOrderApproval';
import TimeTrackingManagement from './pages/admin/TimeTrackingManagement';
import AdminWorkerManagement from './pages/admin/AdminWorkerManagement';
import AdminWorkLogs from './pages/admin/AdminWorkLogs';
import Setup from './pages/admin/Setup';
import CategoryManagementPage from './pages/setup/CategoryManagementPage';
import SiteVisit from './pages/estimates/SiteVisit';
import ApartmentSearch from './pages/search/ApartmentSearch';
import WorkerSchedules from './pages/workers/WorkerSchedules';
import ProjectsPendingApproval from './pages/admin/ProjectsPendingApproval';
import CreateProjectEstimate from './pages/project-estimates/CreateProjectEstimate';
import EditProjectEstimate from './pages/project-estimates/EditProjectEstimate';
import ProjectEstimateDetails from './pages/project-estimates/ProjectEstimateDetails';
import ProjectEstimatesNew from './pages/estimates/ProjectEstimates';
import CustomerServicesPrices from './pages/pricing/CustomerServicesPrices';
import Calls from './pages/calls/Calls';
import TimeLogs from './pages/time-logs/TimeLogs';
import MyTimeLogs from './pages/time-logs/MyTimeLogs';
import PayrollReport from './pages/reports/PayrollReport';
import ActivityLog from './pages/admin/ActivityLog';
import GeneralCleaningPage from './pages/cleaning/GeneralCleaningPage';
import WorkContactsPage from './pages/workContacts/WorkContactsPage';

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
          <NotificationProvider>
            <ErrorBoundary>
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

                    {/* General Cleaning Page */}
                    <Route 
                      path="general-cleaning" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:all']}>
                          <GeneralCleaningPage />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Work Contacts */}
                    <Route 
                      path="work-contacts" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:all']}>
                          <WorkContactsPage />
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
                    <Route 
                      path="buildings/:buildingId/site-visit" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:buildings']}>
                          <SiteVisit />
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
                      path="workers/:id" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:workers']}>
                          <WorkerManagement />
                        </RoleBasedRoute>
                      } 
                    />
                    <Route 
                      path="workers/:id/details" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:workers']}>
                          <WorkerDetails />
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

                    {/* Worker Schedules */}
                    <Route 
                      path="worker-schedules" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:schedules']}>
                          <WorkerSchedules />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Time Management */}
                    <Route 
                      path="time-tracking-management" 
                      element={
                        <RoleBasedRoute requiredPermissions={['view:costs', 'manage:users']}>
                          <TimeTrackingManagement />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Admin Worker Management */}
                    <Route 
                      path="admin-worker-management" 
                      element={
                        <RoleBasedRoute requiredPermissions={['manage:users']}>
                          <AdminWorkerManagement />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Admin Work Logs Management */}
                    <Route 
                      path="admin-work-logs" 
                      element={
                        <RoleBasedRoute requiredPermissions={['manage:users']}>
                          <AdminWorkLogs />
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

                    {/* Pricing */}
                    <Route 
                      path="pricing" 
                      element={
                        <RoleBasedRoute requiredPermissions={['read:buildings']}>
                          <CustomerServicesPrices />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Calls */}
                    <Route
                      path="calls"
                      element={
                        <RoleBasedRoute requiredPermissions={['read:all']}>
                          <Calls />
                        </RoleBasedRoute>
                      }
                    />

                    {/* Time Logs */}
                    <Route 
                      path="time-logs" 
                      element={
                        <RoleBasedRoute requiredPermissions={['manage:users']}>
                          <TimeLogs />
                        </RoleBasedRoute>
                      } 
                    />
                    <Route 
                      path="my-time-logs" 
                      element={<MyTimeLogs />} 
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

                    {/* Apartment Search - accessible to all authenticated users */}
                    <Route 
                      path="apartment-search" 
                      element={<ApartmentSearch />} 
                    />

                    {/* User Management - Comprehensive user management */}
                    <Route 
                      path="user-management" 
                      element={
                        <RoleBasedRoute requiredPermissions={['manage:users']}>
                          <UserManagement />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Work Order Approval */}
                    <Route 
                      path="work-order-approval" 
                      element={
                        <RoleBasedRoute requiredPermissions={['view:costs', 'manage:users']}>
                          <WorkOrderApproval />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Pending Project Approval */}
                    <Route
                      path="projects-pending-approval"
                      element={
                        <RoleBasedRoute requiredPermissions={['view:costs', 'manage:users']}>
                          <ProjectsPendingApproval />
                        </RoleBasedRoute>
                      }
                    />

                    {/* Project Estimates */}
                    <Route
                      path="estimates"
                      element={
                        <RoleBasedRoute requiredPermissions={['view:costs', 'manage:users']}>
                          <ProjectEstimatesNew />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="estimates/new"
                      element={
                        <RoleBasedRoute requiredPermissions={['create:workorders']}>
                          <CreateProjectEstimate />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="estimates/:id"
                      element={
                        <RoleBasedRoute requiredPermissions={['view:costs']}>
                          <ProjectEstimateDetails />
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="estimates/:id/edit"
                      element={
                        <RoleBasedRoute requiredPermissions={['create:workorders']}>
                          <EditProjectEstimate />
                        </RoleBasedRoute>
                      }
                    />

                    {/* System Setup - Admin Only */}
                    <Route 
                      path="setup" 
                      element={
                        <RoleBasedRoute requiredPermissions={['manage:system']}>
                          <Setup />
                        </RoleBasedRoute>
                      } 
                    />
                    <Route 
                      path="setup/categories" 
                      element={
                        <RoleBasedRoute requiredPermissions={['manage:system']}>
                          <CategoryManagementPage />
                        </RoleBasedRoute>
                      } 
                    />

                    {/* Profile and Settings - accessible to all */}
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />

                    {/* Reports */}
                    <Route 
                      path="reports/payroll"
                      element={
                        <RoleBasedRoute requiredPermissions={['view:costs', 'manage:users']}>
                          <PayrollReport />
                        </RoleBasedRoute>
                      }
                    />

                    {/* Activity Log - Superuser Only */}
                    <Route 
                      path="activity-log"
                      element={
                        <RoleBasedRoute requiredPermissions={['is:superuser']}>
                          <ActivityLog />
                        </RoleBasedRoute>
                      }
                    />
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
            </ErrorBoundary>
            
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
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={settings.theme}
          />
          </NotificationProvider>
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
