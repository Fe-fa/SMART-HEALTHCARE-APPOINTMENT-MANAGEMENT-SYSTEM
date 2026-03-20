import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@store/hooks';
import { UserRole } from '@types';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // 💡 FIX: Redirect to their OWN dashboard, not back to login!
    const roleHome = {
      ADMIN: '/admin/dashboard',
      DOCTOR: '/doctor/dashboard',
      PATIENT: '/patient/dashboard',
      NURSE: '/doctor/dashboard',
    };
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }

  return <Outlet />;
};