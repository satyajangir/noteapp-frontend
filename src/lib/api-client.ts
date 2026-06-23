/**
 * API client for the FastAPI backend.
 * Handles authentication, token refresh, and request/response formatting.
 */

import { useAuthStore } from '../stores/auth-store';

// ── Configuration ────────────────────────────────────────────────────

const API_BASE_URL = __DEV__
  ? 'http://192.168.1.30:8000/api/v1'
  : 'https://api.notesapp.com/api/v1';

const WS_BASE_URL = __DEV__
  ? 'ws://192.168.1.30:8000'
  : 'wss://api.notesapp.com';

// ── Types ────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  status: number;
}

interface ApiError {
  detail: string;
  status: number;
}

// ── API Client ───────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // ── Core Request Method ─────────────────────────────────────────

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { tokens } = useAuthStore.getState();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken && {
        Authorization: `Bearer ${tokens.accessToken}`,
      }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 — attempt token refresh
    if (response.status === 401 && tokens?.refreshToken) {
      const newToken = await this.refreshToken(tokens.refreshToken);
      if (newToken) {
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        });
        if (!retryResponse.ok) {
          throw await this.parseError(retryResponse);
        }
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json();
      } else {
        // Refresh failed — logout
        await useAuthStore.getState().clearAuth();
        throw { detail: 'Session expired', status: 401 } as ApiError;
      }
    }

    if (!response.ok) {
      throw await this.parseError(response);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // ── Token Refresh (deduplicated) ────────────────────────────────

  private async refreshToken(refreshToken: string): Promise<string | null> {
    // Deduplicate concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        await useAuthStore.getState().updateTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
        });

        return data.access_token;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ── Error Parsing ───────────────────────────────────────────────

  private async parseError(response: Response): Promise<ApiError> {
    try {
      const data = await response.json();
      return { detail: data.detail || 'Unknown error', status: response.status };
    } catch {
      return {
        detail: `Request failed with status ${response.status}`,
        status: response.status,
      };
    }
  }

  // ── Convenience Methods ─────────────────────────────────────────

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ── WebSocket ───────────────────────────────────────────────────

  createWebSocket(noteId: string): WebSocket {
    const { tokens } = useAuthStore.getState();
    const url = `${WS_BASE_URL}/ws/collaborate/${noteId}?token=${tokens?.accessToken}`;
    return new WebSocket(url);
  }
}

// ── Singleton ────────────────────────────────────────────────────────

export const api = new ApiClient(API_BASE_URL);

// ── Auth API ─────────────────────────────────────────────────────────

export const authApi = {
  googleAuth: (idToken: string) =>
    api.post<any>('/auth/google', { id_token: idToken }),

  register: (email: string, password: string, displayName: string) =>
    api.post<any>('/auth/register', {
      email,
      password,
      display_name: displayName,
    }),

  login: (email: string, password: string) =>
    api.post<any>('/auth/login', { email, password }),

  getProfile: () => api.get<any>('/auth/me'),
};

// ── Notes API ────────────────────────────────────────────────────────

export const notesApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    archived?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.search) query.set('search', params.search);
    if (params?.archived) query.set('archived', 'true');
    return api.get<any>(`/notes?${query.toString()}`);
  },

  get: (id: string) => api.get<any>(`/notes/${id}`),

  create: (data: { title?: string; content_preview?: string; color?: string }) =>
    api.post<any>('/notes', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<any>(`/notes/${id}`, data),

  delete: (id: string) => api.delete<any>(`/notes/${id}`),

  restore: (id: string) => api.post<any>(`/notes/${id}/restore`),

  permanentDelete: (id: string) => api.delete<any>(`/notes/${id}/permanent`),

  share: (id: string, email: string, role: string = 'editor') =>
    api.post<any>(`/notes/${id}/share`, { email, role }),

  acceptShare: (id: string) => api.post<any>(`/notes/${id}/accept`),

  removeCollaborator: (noteId: string, userId: string) =>
    api.delete<any>(`/notes/${noteId}/collaborators/${userId}`),
};

// ── Sync API ─────────────────────────────────────────────────────────

export const syncApi = {
  pull: (deviceId: string, lastServerSeq: number) =>
    api.post<any>('/sync/pull', {
      device_id: deviceId,
      last_server_seq: lastServerSeq,
    }),

  push: (deviceId: string, operations: unknown[]) =>
    api.post<any>('/sync/push', {
      device_id: deviceId,
      operations,
    }),

  status: (deviceId: string) => api.get<any>(`/sync/status/${deviceId}`),
};

// ── Drive API ────────────────────────────────────────────────────────

export const driveApi = {
  backup: (includeMedia: boolean = true) =>
    api.post<any>('/drive/backup', { include_media: includeMedia }),

  getStatus: () => api.get<any>('/drive/backup/status'),

  updateSettings: (autoBackup?: boolean, frequency?: string) => {
    const params = new URLSearchParams();
    if (autoBackup !== undefined) params.set('auto_backup', String(autoBackup));
    if (frequency) params.set('frequency', frequency);
    return api.patch<any>(`/drive/backup/settings?${params.toString()}`, {});
  },

  listBackups: () => api.get<any>('/drive/backups'),

  restore: (fileId: string) => api.post<any>(`/drive/restore/${fileId}`),
};
