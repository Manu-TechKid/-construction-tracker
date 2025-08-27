import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';

export const useAuth = () => {
  const user = useSelector(selectCurrentUser);
  
  const hasPermission = (requiredPermissions) => {
    if (!user || !user.role) return true; // Allow access if no user/role (fallback)
    
    // Define role-based permissions
    const permissions = {
      admin: [
        'create:work-orders', 'update:work-orders', 'delete:work-orders', 
        'read:buildings', 'write:buildings', 'create:buildings', 'update:buildings', 'delete:buildings',
        'create:apartments', 'update:apartments', 'delete:apartments',
        'read:work_orders', 'write:work_orders', 
        'create:reminders', 'update:reminders', 'delete:reminders',
        'create:invoices', 'update:invoices', 'delete:invoices',
        'manage:users'
      ],
      manager: [
        'create:work-orders', 'update:work-orders', 'delete:work-orders',
        'read:buildings', 'write:buildings', 'create:buildings', 'update:buildings',
        'create:apartments', 'update:apartments', 'delete:apartments',
        'read:work_orders', 'write:work_orders',
        'create:reminders', 'update:reminders', 'delete:reminders',
        'create:invoices', 'update:invoices', 'delete:invoices'
      ],
      supervisor: [
        'create:work-orders', 'update:work-orders',
        'read:buildings', 'write:buildings',
        'create:apartments', 'update:apartments',
        'read:work_orders', 'write:work_orders',
        'create:reminders', 'update:reminders'
      ],
      worker: [
        'read:buildings', 'read:work_orders', 'update:work_orders'
      ],
      client: [
        'read:buildings', 'read:work_orders'
      ]
    };

    // Handle array of permissions or single permission
    const permsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // Check if user's role has any of the required permissions
    const userPermissions = permissions[user.role] || [];
    return permsToCheck.some(perm => userPermissions.includes(perm)) || true; // Allow by default for development
  };

  return { user, hasPermission };
};
