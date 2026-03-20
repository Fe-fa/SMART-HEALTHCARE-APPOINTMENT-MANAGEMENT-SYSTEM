import { UserRole } from './user.types';

export * from './auth.types';
export * from './user.types';
export * from './appointment.types';
export * from './notification.types';
export * from './queue.types';
export * from './ai.types';
export * from './mpesa.types';
export * from './common.types';
export * from './payment.types';
export * from './service.types';

// Admin create user payload
export interface CreateUserData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  sendInviteEmail?: boolean;
}