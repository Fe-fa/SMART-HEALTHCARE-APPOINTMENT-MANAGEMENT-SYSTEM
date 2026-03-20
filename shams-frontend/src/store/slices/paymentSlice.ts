import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { paymentService } from '@services/api/payment.service';
import type {
  Payment,
  Transaction,
  PaymentStats,
  CreatePaymentData,
  CreatePaymentResponse,
  PaginatedResponse,
} from '@types';

interface PaymentState {
  payments: Payment[];
  transactions: Transaction[];
  stats: PaymentStats | null;
  currentPayment: Payment | null;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  pagination: PaginatedResponse<Payment>['pagination'] | null;
  transactionPagination: PaginatedResponse<Transaction>['pagination'] | null;
}

const initialState: PaymentState = {
  payments: [],
  transactions: [],
  stats: null,
  currentPayment: null,
  loading: false,
  statsLoading: false,
  error: null,
  pagination: null,
  transactionPagination: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const createPayment = createAsyncThunk(
  'payments/create',
  async (data: CreatePaymentData, { rejectWithValue }) => {
    try {
      return await paymentService.create(data);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? 'Payment failed',
      );
    }
  },
);

export const fetchPayments = createAsyncThunk(
  'payments/fetchAll',
  async (params?: Record<string, unknown>) => {
    return paymentService.getAll(params);
  },
);

export const fetchTransactions = createAsyncThunk(
  'payments/fetchTransactions',
  async (params?: Record<string, unknown>) => {
    return paymentService.getTransactions(params);
  },
);

export const fetchPaymentStats = createAsyncThunk(
  'payments/fetchStats',
  async () => {
    return paymentService.getStats();
  },
);

export const fetchPaymentByAppointment = createAsyncThunk(
  'payments/fetchByAppointment',
  async (appointmentId: number, { rejectWithValue }) => {
    try {
      return await paymentService.getByAppointment(appointmentId);
    } catch {
      return rejectWithValue(null);
    }
  },
);

export const refundPayment = createAsyncThunk(
  'payments/refund',
  async (id: number) => {
    return paymentService.refund(id);
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError:          (state) => { state.error = null; },
    clearCurrentPayment: (state) => { state.currentPayment = null; },
    setCurrentPayment:   (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
    },
  },
  extraReducers: (builder) => {
    // createPayment
    builder
      .addCase(createPayment.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(createPayment.fulfilled, (state, { payload }: { payload: CreatePaymentResponse }) => {
        state.loading = false;
        state.currentPayment = payload.payment;
        state.payments.unshift(payload.payment);
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? 'Payment failed';
      });

    // fetchPayments
    builder
      .addCase(fetchPayments.pending,   (state) => { state.loading = true; })
      .addCase(fetchPayments.fulfilled, (state, { payload }) => {
        state.loading     = false;
        state.payments    = payload.data;
        state.pagination  = payload.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message ?? 'Failed to fetch payments';
      });

    // fetchTransactions
    builder
      .addCase(fetchTransactions.pending,   (state) => { state.loading = true; })
      .addCase(fetchTransactions.fulfilled, (state, { payload }) => {
        state.loading               = false;
        state.transactions          = payload.data;
        state.transactionPagination = payload.pagination;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message ?? 'Failed to fetch transactions';
      });

    // fetchPaymentStats
    builder
      .addCase(fetchPaymentStats.pending,   (state) => { state.statsLoading = true; })
      .addCase(fetchPaymentStats.fulfilled, (state, { payload }) => {
        state.statsLoading = false;
        state.stats        = payload;
      })
      .addCase(fetchPaymentStats.rejected, (state) => { state.statsLoading = false; });

    // fetchPaymentByAppointment
    builder.addCase(fetchPaymentByAppointment.fulfilled, (state, { payload }) => {
      if (payload) state.currentPayment = payload;
    });

    // refundPayment
    builder.addCase(refundPayment.fulfilled, (state, { payload }) => {
      const idx = state.payments.findIndex((p) => p.id === payload.id);
      if (idx !== -1) state.payments[idx] = payload;
      if (state.currentPayment?.id === payload.id) state.currentPayment = payload;
    });
  },
});

export const { clearError, clearCurrentPayment, setCurrentPayment } = paymentSlice.actions;
export default paymentSlice.reducer;