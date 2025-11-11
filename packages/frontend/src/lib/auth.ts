import apiClient from './api-client';

// MVP simplified types
interface MVPUser {
  id: string;
  email: string;
}

interface MVPAuthResponse {
  user: MVPUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authService = {
  async register(email: string, password: string): Promise<MVPAuthResponse> {
    const response = await apiClient.post<MVPAuthResponse>('/auth/register', {
      email,
      password,
    });

    // Store tokens from MVP response format
    localStorage.setItem('accessToken', response.data.tokens.accessToken);
    localStorage.setItem('refreshToken', response.data.tokens.refreshToken);

    return response.data;
  },

  async login(email: string, password: string): Promise<MVPAuthResponse> {
    const response = await apiClient.post<MVPAuthResponse>('/auth/login', {
      email,
      password,
    });

    // Store tokens from MVP response format
    localStorage.setItem('accessToken', response.data.tokens.accessToken);
    localStorage.setItem('refreshToken', response.data.tokens.refreshToken);

    return response.data;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      // Clear tokens regardless of API response
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  async getCurrentUser(): Promise<MVPUser | null> {
    try {
      const response = await apiClient.get<{ user: MVPUser }>('/auth/me');
      return response.data.user;
    } catch {
      return null;
    }
  },
};
