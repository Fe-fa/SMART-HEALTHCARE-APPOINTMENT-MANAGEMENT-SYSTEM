import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationService } from '@services/api/notification.service';
import type { Notification } from '@types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  panelOpen: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  panelOpen: false,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async () => {
    const response = await notificationService.getAll();
    return response.data;
  },
);

export const fetchUnreadNotifications = createAsyncThunk(
  'notifications/fetchUnread',
  async () => {
    const response = await notificationService.getUnread();
    return response.data;
  },
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id: number) => {
    await notificationService.markAsRead(id);
    return id;
  },
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    await notificationService.markAllAsRead();
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Called by the socket service when a live notification arrives
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Prepend and deduplicate
      const exists = state.notifications.some((n) => n.id === action.payload.id);
      if (!exists) {
        state.notifications.unshift(action.payload);
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },
    togglePanel: (state) => {
      state.panelOpen = !state.panelOpen;
    },
    closePanel: (state) => {
      state.panelOpen = false;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAll
      .addCase(fetchNotifications.pending,   (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading       = false;
        state.notifications = action.payload ?? [];
        state.unreadCount   = (action.payload ?? []).filter(
          (n: Notification) => !n.isRead,
        ).length;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })

      // fetchUnread
      .addCase(fetchUnreadNotifications.fulfilled, (state, action) => {
        state.unreadCount = (action.payload ?? []).length;
      })

      // markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        const n = state.notifications.find((n) => n.id === action.payload);
        if (n && !n.isRead) {
          n.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // markAllAsRead
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => { n.isRead = true; });
        state.unreadCount = 0;
      });
  },
});

export const { addNotification, togglePanel, closePanel, setUnreadCount } =
  notificationSlice.actions;
export default notificationSlice.reducer;