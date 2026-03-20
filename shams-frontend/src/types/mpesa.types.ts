/**
 * mpesa.types.ts
 * 
 * Type definitions for M-Pesa STK Push and query operations
 */

export interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  description: string;
}

export interface StkPushResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode?: string;
  ResultDesc?: string;
}

export interface MpesaQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
  ResultType?: number;
}