const apiPrefix = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiPrefix}${path}`, { ...init, headers, credentials: 'same-origin' });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => undefined) as T | { code?: string; message?: string } | undefined;
  if (!response.ok) {
    const error = payload as { code?: string; message?: string } | undefined;
    throw new ApiError(response.status, error?.code || 'REQUEST_FAILED', error?.message || '请求未完成，请稍后重试。');
  }
  return payload as T;
};

export type CurrentUser = { id: string; email: string };

export const authApi = {
  register: (email: string, password: string) => request<{ user: CurrentUser }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<{ user: CurrentUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: CurrentUser }>('/auth/me'),
};

export const contentApi = {
  bootstrap: () => request<{ posts: unknown[]; photos: unknown[]; weights: unknown[]; todos: unknown[] }>('/bootstrap'),
  createPost: (post: unknown) => request('/posts', { method: 'POST', body: JSON.stringify(post) }),
  updatePost: (id: string, post: unknown) => request(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(post) }),
  deletePost: (id: string) => request<void>(`/posts/${id}`, { method: 'DELETE' }),
  uploadPhoto: (file: Blob, colors: unknown) => {
    const form = new FormData();
    form.append('file', file, 'photo.jpg');
    if (colors) form.append('extractedColors', JSON.stringify(colors));
    return request('/photos', { method: 'POST', body: form });
  },
  uploadInlineImage: (file: Blob) => {
    const form = new FormData();
    form.append('file', file, 'image.jpg');
    return request<{ id: string; url: string }>('/media/inline', { method: 'POST', body: form });
  },
  updatePhoto: (id: string, input: unknown) => request(`/photos/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePhoto: (id: string) => request<void>(`/photos/${id}`, { method: 'DELETE' }),
  addWeight: (weight: number) => request('/weights', { method: 'POST', body: JSON.stringify({ weight }) }),
  deleteWeight: (id: string) => request<void>(`/weights/${id}`, { method: 'DELETE' }),
  addTodo: (todo: unknown) => request('/todos', { method: 'POST', body: JSON.stringify(todo) }),
  updateTodo: (id: string, todo: unknown) => request(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(todo) }),
  deleteTodo: (id: string) => request<void>(`/todos/${id}`, { method: 'DELETE' }),
};

export const newsUrl = (params: URLSearchParams) => `${apiPrefix}/news?${params.toString()}`;
