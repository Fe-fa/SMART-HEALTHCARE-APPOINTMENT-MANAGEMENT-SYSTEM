import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './slices/authSlice';
import appointmentReducer  from './slices/appointmentSlice';
import notificationReducer from './slices/notificationSlice';
import queueReducer        from './slices/queueSlice';
import userReducer         from './slices/userSlice';
import paymentReducer      from './slices/paymentSlice';

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    appointments:  appointmentReducer,
    notifications: notificationReducer,
    queue:         queueReducer,
    users:         userReducer,
    payments:      paymentReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
