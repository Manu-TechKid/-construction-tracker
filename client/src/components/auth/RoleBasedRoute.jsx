import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';

const RoleBasedRoute = ({ children, requiredPermissions = [] }) => {
  const user = useSelector(selectCurrentUser);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For now, allow all authenticated users access
  // This can be enhanced later with proper permission checking
  const hasPermission = () => {
    if (!requiredPermissions.length) return true;
    
    // Basic role-based access
    if (user.role === 'admin') return true;
    if (user.role === 'manager') return true;
    if (user.role === 'worker') {
      // Workers can only access certain routes
      const workerAllowedPermissions = [
        'read:workorders',
        'view:dashboard:worker',
        'read:buildings'
      ];
      return requiredPermissions.some(permission => 
        workerAllowedPermissions.includes(permission)
      );
    }
    
    return false;
  };

  if (!hasPermission()) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return children;
};

export default RoleBasedRoute;
