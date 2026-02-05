import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';

// Define role-based permissions
const ROLE_PERMISSIONS = {
  admin: [
    'read:all', 'create:all', 'update:all', 'delete:all',
    'read:buildings', 'create:buildings', 'update:buildings', 'delete:buildings',
    'read:workorders', 'create:workorders', 'update:workorders', 'delete:workorders',
    'read:workers', 'create:workers', 'update:workers', 'delete:workers',
    'read:invoices', 'create:invoices', 'update:invoices', 'delete:invoices',
    'read:vendors', 'create:vendors', 'update:vendors', 'delete:vendors',
    'read:checks', 'create:checks', 'update:checks', 'delete:checks', 'print:checks',
    'read:employeeprofiles', 'review:employeeprofiles', 'delete:employeeprofiles',
    'read:reminders', 'create:reminders', 'update:reminders', 'delete:reminders',
    'read:schedules', 'create:schedules', 'update:schedules', 'delete:schedules',
    'read:notes', 'create:notes', 'update:notes', 'delete:notes',
    'read:timetracking', 'create:timetracking', 'update:timetracking', 'delete:timetracking',
    'approve:timetracking', 'assign:workers', 'manage:users', 'view:costs', 'view:reports', 'approve:workers'
  ],
  manager: [
    'read:buildings', 'create:buildings', 'update:buildings', 'delete:buildings',
    'read:workorders', 'create:workorders', 'update:workorders', 'delete:workorders',
    'read:workers', 'create:workers', 'update:workers', 'delete:workers',
    'read:invoices', 'create:invoices', 'update:invoices', 'delete:invoices',
    'read:vendors', 'create:vendors', 'update:vendors', 'delete:vendors',
    'read:checks', 'create:checks', 'update:checks', 'delete:checks', 'print:checks',
    'read:employeeprofiles', 'review:employeeprofiles', 'delete:employeeprofiles',
    'read:reminders', 'create:reminders', 'update:reminders', 'delete:reminders',
    'read:schedules', 'create:schedules', 'update:schedules', 'delete:schedules',
    'read:notes', 'create:notes', 'update:notes', 'delete:notes',
    'read:timetracking', 'create:timetracking', 'update:timetracking', 'approve:timetracking',
    'assign:workers', 'view:costs', 'view:reports', 'approve:workers'
  ],
  supervisor: [
    'read:buildings', 'read:workorders', 'create:workorders', 'update:workorders',
    'read:workers', 'update:workers',
    'read:vendors',
    'read:checks', 'create:checks', 'update:checks', 'print:checks',
    'read:employeeprofiles',
    'read:reminders', 'create:reminders', 'update:reminders',
    'read:schedules', 'create:schedules', 'update:schedules',
    'read:notes', 'create:notes', 'update:notes',
    'read:timetracking', 'create:timetracking', 'update:timetracking',
    'assign:workers', 'view:costs'
  ],
  worker: [
    'read:workorders', 'update:workorders:own',
    'read:schedules:own', 'read:notes:own', 'create:notes:own',
    'read:timetracking:own', 'create:timetracking:own', 'update:timetracking:own',
    'view:dashboard:worker'
  ]
};

export const useAuth = () => {
  const rawUser = useSelector(selectCurrentUser);
  
  // Normalize user object to have both id and _id for compatibility
  const user = rawUser ? {
    ...rawUser,
    id: rawUser._id || rawUser.id, // Ensure id field exists
    _id: rawUser._id || rawUser.id  // Ensure _id field exists
  } : null;

  const isSuperuser = user?.role === 'superuser';
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const isWorker = user?.role === 'worker';

  const hasPermission = (requiredPermissions) => {
    if (!user || !user.role) return false;
    
    // Superuser and Admin have all permissions
    if (isSuperuser || isAdmin) return true;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // If requiredPermissions is a string, convert to array
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    // Check if user has at least one of the required permissions
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const canAccessWorkerDashboard = () => {
    return user?.role === 'worker' || hasPermission(['view:dashboard:worker', 'read:all']);
  };

  const canAccessMainDashboard = () => {
    return user?.role !== 'worker' || hasPermission(['read:all']);
  };

  const canViewCosts = () => {
    return hasPermission(['view:costs', 'read:all']);
  };

  const canManageUsers = () => {
    return hasPermission(['manage:users', 'read:all']);
  };

  const canAssignWorkers = () => {
    return hasPermission(['assign:workers', 'read:all']);
  };

  return {
    user,
    isSuperuser,
    isAdmin,
    isManager,
    isSupervisor,
    isWorker,
    hasPermission,
    canAccessMainDashboard,
    canAccessWorkerDashboard,
    canViewCosts,
    canManageUsers,
    canAssignWorkers
  };
};
