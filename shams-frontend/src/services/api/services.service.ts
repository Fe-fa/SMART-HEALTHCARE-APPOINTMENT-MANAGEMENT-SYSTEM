import { apiClient } from './client';
import type {
  ApiResponse,
  Service,
  ServiceStats,
  CreateServiceData,
  UpdateServiceData,
} from '@types';
import { AppointmentType } from '@types';

export const servicesApiService = {
  // ─── Public: active services ───────────────────────────────────────────────
  getActive: async (): Promise<Service[]> => {
    const res = await apiClient.get<ApiResponse<Service[]>>('/services/active');
    return res.data;
  },

  // ─── Public: by appointment type ──────────────────────────────────────────
  getByType: async (type: AppointmentType): Promise<Service[]> => {
    const res = await apiClient.get<ApiResponse<Service[]>>('/services/by-type', {
      params: { type },
    });
    return res.data;
  },

  // ─── Admin: all services ──────────────────────────────────────────────────
  getAll: async (): Promise<Service[]> => {
    const res = await apiClient.get<ApiResponse<Service[]>>('/services');
    return res.data;
  },

  // ─── Admin: stats ─────────────────────────────────────────────────────────
  getStats: async (): Promise<ServiceStats> => {
    const res = await apiClient.get<ApiResponse<ServiceStats>>('/services/stats');
    return res.data;
  },

  // ─── Admin: create ────────────────────────────────────────────────────────
  create: async (data: CreateServiceData): Promise<Service> => {
    const res = await apiClient.post<ApiResponse<Service>>('/services', data);
    return res.data;
  },

  // ─── Admin: update ────────────────────────────────────────────────────────
  update: async (id: number, data: UpdateServiceData): Promise<Service> => {
    const res = await apiClient.patch<ApiResponse<Service>>(`/services/${id}`, data);
    return res.data;
  },

  // ─── Admin: toggle active ─────────────────────────────────────────────────
  toggleActive: async (id: number): Promise<Service> => {
    const res = await apiClient.patch<ApiResponse<Service>>(`/services/${id}/toggle`, {});
    return res.data;
  },

  // ─── Admin: delete ────────────────────────────────────────────────────────
  delete: async (id: number): Promise<Service> => {
    const res = await apiClient.delete<ApiResponse<Service>>(`/services/${id}`);
    return res.data;
  },
};