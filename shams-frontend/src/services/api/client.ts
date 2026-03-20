import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── MUST MATCH AUTH SLICE CONSTANTS ─────────────────────────────────────────
const TOKEN_KEY = 'shams_token';
const USER_KEY  = 'shams_user';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // ─── Request Interceptor: Attach the correct token ───────────────────────
    this.instance.interceptors.request.use(
      (config) => {
        // Corrected key to match authSlice
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ─── Response Interceptor: Handle Unauthorized errors ────────────────────
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        // If the backend says 401, the token is likely invalid or expired
        if (error.response?.status === 401) {
          console.warn('🛡️ ApiClient: Unauthorized access. Clearing session...');
          
          // Clear the correct keys
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);

          // Prevent infinite loops: only redirect if not already on the login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Typed Wrapper Methods ────────────────────────────────────────────────
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();