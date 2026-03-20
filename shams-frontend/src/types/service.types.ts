import { AppointmentType } from './appointment.types';

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  type: AppointmentType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  byType: { type: AppointmentType; _count: { id: number } }[];
}

export interface CreateServiceData {
  name: string;
  description?: string;
  price: number;
  type: AppointmentType;
  isActive?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  price?: number;
  type?: AppointmentType;
  isActive?: boolean;
}