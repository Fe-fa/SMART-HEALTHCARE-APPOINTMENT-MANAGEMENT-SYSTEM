import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@store/hooks';

export const PublicRoute = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (isAuthenticated && user) {
    // Force uppercase to match keys regardless of backend format
    const role = String(user.role).toUpperCase();
    
    const roleHome: Record<string, string> = {
      ADMIN: '/admin/dashboard',
      DOCTOR: '/doctor/dashboard',
      PATIENT: '/patient/dashboard',
      NURSE: '/doctor/dashboard',
    };

    const targetPath = roleHome[role] || '/';
    console.log(`🛡️ PublicRoute: User is ${role}, redirecting to ${targetPath}`);
    
    return <Navigate to={targetPath} replace />;
  }

  return <Outlet />;
};