import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@services/api/auth.service';
import { socketService } from '@services/socket/socket.service';
import type { User, LoginCredentials, RegisterData } from '@types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const TOKEN_KEY = 'shams_token';
const USER_KEY = 'shams_user';

// ─── Safe Rehydration Helpers ──────────────────────────────────────────────
const isValid = (val: string | null) => val && val !== 'undefined' && val !== 'null';

const getInitialUser = (): User | null => {
  const storedUser = localStorage.getItem(USER_KEY);
  if (!isValid(storedUser)) return null;
  try {
    return JSON.parse(storedUser!) as User;
  } catch (e) {
    console.error("AuthSlice: Failed to parse stored user", e);
    return null;
  }
};

const storedToken = localStorage.getItem(TOKEN_KEY);

const initialState: AuthState = {
  user: getInitialUser(),
  accessToken: isValid(storedToken) ? storedToken : null,
  isAuthenticated: !!isValid(storedToken), 
  loading: false,
  error: null,
};

// Auto-connect socket if session exists
if (initialState.accessToken) {
  socketService.connect(initialState.accessToken);
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log("😊AuthSlice: Attempting login...");
      const response = await authService.login(credentials);
      console.log("😊AuthSlice: Login successful", response);
      return response.data; // Expects { user: User, accessToken: string }
    } catch (err: any) {
      console.log("😞AuthSlice: Login failed", err);
      return rejectWithValue(
        err?.response?.data?.message ?? err?.message ?? 'Login failed'
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? err?.message ?? 'Registration failed'
      );
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      socketService.disconnect();
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        const { user, accessToken } = action.payload;

        if (!user || !accessToken) {
          state.loading = false;
          state.error = "Incomplete response from server";
          state.isAuthenticated = false;
          return;
        }

        state.loading = false;
        state.user = user;
        state.accessToken = accessToken;
        state.isAuthenticated = true; // ✅ CRITICAL: This triggers your LoginPage useEffect
        state.error = null;

        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        socketService.connect(accessToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = (action.payload as string) ?? 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Registration failed';
      });
  },
});

export const { logout, setUser, clearError } = authSlice.actions;
export default authSlice.reducer;