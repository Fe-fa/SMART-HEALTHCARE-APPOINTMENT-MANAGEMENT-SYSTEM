import { AppointmentType } from './appointment.types';

export enum PaymentStatus {
  PENDING   = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
  REFUNDED  = 'REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD  = 'CREDIT_CARD',
  CASH         = 'CASH',
  INSURANCE    = 'INSURANCE',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export interface Payment {
  id: number;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  appointmentId: number;
  patientId?: number;
  serviceId?: number;
  notes?: string;
  currency: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  service?: { id: number; name: string; price: number; type: AppointmentType };
  appointment?: any;
}

export interface Transaction {
  id: number;
  referenceNumber: string;
  paymentId: number;
  patientId: number;
  appointmentId: number;
  serviceId?: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalRef?: string;
  description?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: number; firstName: string; lastName: string; email: string; phone: string };
  appointment?: { id: number; appointmentDate: string; appointmentType: AppointmentType; status: string };
  service?: { id: number; name: string; type: AppointmentType };
  payment?: { id: number; method: PaymentMethod; status: PaymentStatus; paidAt?: string };
}

export interface PaymentStats {
  totalRevenue: number;
  counts: {
    pending: number;
    completed: number;
    refunded: number;
    failed: number;
    total: number;
  };
  revenueByMethod: {
    method: PaymentMethod;
    _sum: { amount: number };
    _count: { id: number };
  }[];
  monthlyRevenue: { month: string; revenue: number; count: number }[];
  recentTransactions: Transaction[];
}

export interface CreatePaymentData {
  appointmentId: number;
  method: PaymentMethod;
  serviceId?: number;
  externalRef?: string;
  notes?: string;
}

export interface CreatePaymentResponse {
  payment: Payment;
  referenceNumber: string;
}