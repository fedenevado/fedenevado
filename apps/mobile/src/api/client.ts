const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  if (!API_URL) {
    throw new Error(
      'Falta EXPO_PUBLIC_API_URL. Configúralo en apps/mobile/.env (ver .env.example).',
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body && (body.message as string)) || 'Ha ocurrido un error inesperado.';
    throw new ApiError(Array.isArray(message) ? message.join(' ') : message, response.status);
  }

  return body as T;
}

export interface AuthResponse {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<MeResponse>('/users/me', {}, token),
};
