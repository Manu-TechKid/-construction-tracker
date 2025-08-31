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
    'read:reminders', 'create:reminders', 'update:reminders', 'delete:reminders',
    'read:schedules', 'create:schedules', 'update:schedules', 'delete:schedules',
    'read:notes', 'create:notes', 'update:notes', 'delete:notes',
    'assign:workers', 'manage:users', 'view:costs', 'view:reports', 'approve:workers'
  ],
  manager: [
    'read:buildings', 'create:buildings', 'update:buildings', 'delete:buildings',
    'read:workorders', 'create:workorders', 'update:workorders', 'delete:workorders',
    'read:workers', 'create:workers', 'update:workers', 'delete:workers',
    'read:invoices', 'create:invoices', 'update:invoices', 'delete:invoices',
    'read:reminders', 'create:reminders', 'update:reminders', 'delete:reminders',
    'read:schedules', 'create:schedules', 'update:schedules', 'delete:schedules',
    'read:notes', 'create:notes', 'update:notes', 'delete:notes',
    'assign:workers', 'view:costs', 'view:reports', 'approve:workers'
  ],
  supervisor: [
    'read:buildings', 'read:workorders', 'create:workorders', 'update:workorders',
    'read:workers', 'update:workers',
    'read:reminders', 'create:reminders', 'update:reminders',
    'read:schedules', 'create:schedules', 'update:schedules',
    'read:notes', 'create:notes', 'update:notes',
    'assign:workers', 'view:costs'
  ],
  worker: [
    'read:workorders', 'update:workorders:own',
    'read:schedules:own', 'read:notes:own', 'create:notes:own',
    'view:dashboard:worker'
  ]
};

export const useAuth = () => {
  const user = useSelector(selectCurrentUser);

  const hasPermission = (requiredPermissions) => {
    if (!user || !user.role) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
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
    isAuthenticated: !!user,
    hasPermission,
    canAccessWorkerDashboard,
    canAccessMainDashboard,
    canViewCosts,
    canManageUsers,
    canAssignWorkers,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isSupervisor: user?.role === 'supervisor',
    isWorker: user?.role === 'worker'
  };
};
