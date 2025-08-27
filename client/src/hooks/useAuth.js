import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';

export const useAuth = () => {
  const user = useSelector(selectCurrentUser);
  
  const hasPermission = (requiredPermissions) => {
    if (!user || !user.role) return true; // Allow access if no user/role (fallback)
    
    // Define role-based permissions
    const permissions = {
      admin: [
        // Complete admin control - can do EVERYTHING
        'create:work-orders', 'update:work-orders', 'delete:work-orders', 'read:work-orders', 'write:work-orders',
        'create:buildings', 'update:buildings', 'delete:buildings', 'read:buildings', 'write:buildings',
        'create:apartments', 'update:apartments', 'delete:apartments', 'read:apartments',
        'create:reminders', 'update:reminders', 'delete:reminders', 'read:reminders',
        'create:invoices', 'update:invoices', 'delete:invoices', 'read:invoices',
        'create:estimates', 'update:estimates', 'delete:estimates', 'read:estimates',
        'create:notes', 'update:notes', 'delete:notes', 'read:notes',
        'create:photos', 'update:photos', 'delete:photos', 'read:photos',
        'manage:users', 'manage:roles', 'manage:permissions',
        'view:dashboard', 'view:reports', 'view:analytics',
        'admin:all' // Master permission for admin
      ],
      manager: [
        'create:work-orders', 'update:work-orders', 'delete:work-orders', 'read:work-orders', 'write:work-orders',
        'create:buildings', 'update:buildings', 'read:buildings', 'write:buildings',
        'create:apartments', 'update:apartments', 'delete:apartments', 'read:apartments',
        'create:reminders', 'update:reminders', 'delete:reminders', 'read:reminders',
        'create:invoices', 'update:invoices', 'delete:invoices', 'read:invoices',
        'create:estimates', 'update:estimates', 'read:estimates',
        'create:notes', 'update:notes', 'read:notes',
        'create:photos', 'update:photos', 'read:photos',
        'view:dashboard', 'view:reports'
      ],
      supervisor: [
        'create:work-orders', 'update:work-orders', 'read:work-orders', 'write:work-orders',
        'read:buildings', 'write:buildings',
        'create:apartments', 'update:apartments', 'read:apartments',
        'create:reminders', 'update:reminders', 'read:reminders',
        'create:estimates', 'update:estimates', 'read:estimates',
        'create:notes', 'update:notes', 'read:notes',
        'create:photos', 'update:photos', 'read:photos',
        'view:dashboard'
      ],
      worker: [
        'read:buildings', 'read:work-orders', 'update:work-orders',
        'read:apartments', 'read:reminders',
        'create:notes', 'read:notes',
        'create:photos', 'read:photos'
      ],
      client: [
        'read:buildings', 'read:work-orders', 'read:apartments',
        'read:invoices', 'read:estimates'
      ]
    };

    // Special case: Admin can do ANYTHING
    if (user?.role === 'admin') {
      return true; // Admin has unlimited access
    }

    // Handle array of permissions or single permission
    const permsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // Check if user's role has any of the required permissions
    const userPermissions = permissions[user.role] || [];
    return permsToCheck.some(perm => userPermissions.includes(perm)) || true; // Allow by default for development
  };

  return { user, hasPermission };
};
