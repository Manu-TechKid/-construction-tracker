import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';

export const useAuth = () => {
  const user = useSelector(selectCurrentUser);
  
  const hasPermission = (requiredPermission) => {
    if (!user || !user.role) return true; // Allow access if no user/role (fallback)
    
    // Define role-based permissions
    const permissions = {
      admin: ['create:work-orders', 'update:work-orders', 'delete:work-orders', 'read:buildings', 'write:buildings', 'create:buildings', 'read:work_orders', 'write:work_orders', 'manage:users'],
      manager: ['create:work-orders', 'update:work-orders', 'delete:work-orders', 'read:buildings', 'write:buildings', 'create:buildings', 'read:work_orders', 'write:work_orders'],
      worker: ['read:buildings', 'read:work_orders', 'update:work_orders', 'create:buildings'],
      client: ['read:buildings', 'read:work_orders', 'create:buildings']
    };

    // Check if user's role has the required permission
    return permissions[user.role]?.includes(requiredPermission) || true; // Allow by default
  };

  return { user, hasPermission };
};
