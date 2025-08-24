import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';

export const useAuth = () => {
  const user = useSelector(selectCurrentUser);
  
  const hasPermission = (requiredPermission) => {
    if (!user || !user.role) return false;
    
    // Define role-based permissions
    const permissions = {
      admin: ['read:buildings', 'write:buildings', 'read:work_orders', 'write:work_orders', 'manage:users'],
      manager: ['read:buildings', 'write:buildings', 'read:work_orders', 'write:work_orders'],
      worker: ['read:buildings', 'read:work_orders', 'update:work_orders'],
      client: ['read:buildings', 'read:work_orders']
    };

    // Check if user's role has the required permission
    return permissions[user.role]?.includes(requiredPermission) || false;
  };

  return { user, hasPermission };
};
