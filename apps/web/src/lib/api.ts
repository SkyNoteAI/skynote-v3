import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  const url = `${API_BASE_URL}${API_BASE_PATH}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = response.status.toString();

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        errorCode = errorData.error.code || errorCode;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) =>
    makeRequest<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: async () =>
    makeRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  refresh: async () =>
    makeRequest<{ token: string }>('/auth/refresh', {
      method: 'POST',
    }),

  me: async () => makeRequest<{ user: any }>('/auth/me'),
};

// Notes API
export const notesApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    folder?: string;
    search?: string;
    tags?: string;
    sort?: string;
    order?: string;
    include_deleted?: string;
  }) =>
    makeRequest<{ notes: any[]; total: number; page: number; limit: number }>(
      `/notes?${new URLSearchParams(params as any).toString()}`
    ),

  get: async (id: string) => makeRequest<{ note: any }>(`/notes/${id}`),

  create: async (note: {
    title: string;
    content: any;
    folder?: string;
    tags?: string[];
  }) =>
    makeRequest<{ note: any }>('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    }),

  update: async (
    id: string,
    note: {
      title?: string;
      content?: any;
      folder?: string;
      tags?: string[];
      is_starred?: boolean;
    }
  ) =>
    makeRequest<{ note: any }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    }),

  delete: async (id: string) =>
    makeRequest<{ success: boolean }>(`/notes/${id}`, {
      method: 'DELETE',
    }),

  restore: async (id: string) =>
    makeRequest<{ note: any }>(`/notes/${id}/restore`, {
      method: 'POST',
    }),

  search: async (params: {
    query: string;
    mode?: 'keyword' | 'semantic';
    filters?: any;
    limit?: number;
    sort?: string;
    order?: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.query);
    if (params.mode) searchParams.append('mode', params.mode);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);

    // Add filters
    if (params.filters) {
      if (params.filters.tags)
        searchParams.append('tags', params.filters.tags.join(','));
      if (params.filters.folders)
        searchParams.append('folders', params.filters.folders.join(','));
      if (params.filters.starred) searchParams.append('starred', 'true');
      if (params.filters.dateRange?.start)
        searchParams.append('date_start', params.filters.dateRange.start);
      if (params.filters.dateRange?.end)
        searchParams.append('date_end', params.filters.dateRange.end);
    }

    return makeRequest<{ results: any[]; total: number; took?: number }>(
      `/search?${searchParams.toString()}`
    );
  },

  searchSuggestions: async (params: { query: string; limit?: number }) =>
    makeRequest<{ suggestions: string[] }>(
      `/search/suggestions?${new URLSearchParams(params as any).toString()}`
    ),

  getFilterOptions: async () =>
    makeRequest<{ tags: any[]; folders: any[] }>('/search/filters'),
};

// Search API
export const searchApi = {
  search: async (params: {
    q: string;
    limit?: number;
    offset?: number;
    folder?: string;
    tags?: string[];
  }) =>
    makeRequest<{ results: any[]; total: number }>(
      `/search?${new URLSearchParams(params as any).toString()}`
    ),

  semantic: async (params: { q: string; limit?: number; offset?: number }) =>
    makeRequest<{ results: any[]; total: number }>(
      `/search/semantic?${new URLSearchParams(params as any).toString()}`
    ),

  similar: async (id: string, params?: { limit?: number }) =>
    makeRequest<{ results: any[] }>(
      `/search/similar/${id}?${new URLSearchParams(params as any).toString()}`
    ),

  history: async (params?: { limit?: number; offset?: number }) =>
    makeRequest<{ history: any[] }>(
      `/search/history?${new URLSearchParams(params as any).toString()}`
    ),
};

// Chat API
export const chatApi = {
  send: async (message: string, contextLimit?: number) =>
    makeRequest<{ response: string; sources: any[] }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context_limit: contextLimit }),
    }),
};
