import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Payment,
  Transaction,
  PaymentStats,
  CreatePaymentData,
  CreatePaymentResponse,
} from '@types';

export const paymentService = {
  // ─── Patient: pay for appointment ─────────────────────────────────────────
  create: async (data: CreatePaymentData): Promise<CreatePaymentResponse> => {
    const res = await apiClient.post<ApiResponse<CreatePaymentResponse>>('/payments', data);
    return res.data;
  },

  // ─── Get payment for a specific appointment ────────────────────────────────
  getByAppointment: async (appointmentId: number): Promise<Payment> => {
    const res = await apiClient.get<ApiResponse<Payment>>(
      `/payments/appointment/${appointmentId}`,
    );
    return res.data;
  },

  // ─── Get all payments (admin: all, patient: own) ───────────────────────────
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Payment>> => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Payment>>>('/payments', { params });
    return res.data;
  },

  // ─── Master transactions list (admin) ─────────────────────────────────────
  getTransactions: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<Transaction>> => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Transaction>>>(
      '/payments/transactions',
      { params },
    );
    return res.data;
  },

  // ─── Stats / reports (admin) ──────────────────────────────────────────────
  getStats: async (): Promise<PaymentStats> => {
    const res = await apiClient.get<ApiResponse<PaymentStats>>('/payments/stats');
    return res.data;
  },

  // ─── Refund (admin) ───────────────────────────────────────────────────────
  refund: async (id: number): Promise<Payment> => {
    const res = await apiClient.patch<ApiResponse<Payment>>(`/payments/${id}/refund`, {});
    return res.data;
  },
};