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

export interface Friend {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface PendingRequest {
  friendshipId: string;
  from: Friend;
  createdAt: string;
}

export type FriendRelation = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface FriendSearchResult extends Friend {
  relation: FriendRelation;
  friendshipId: string | null;
}

export type PlanType = 'viaje' | 'comida' | 'evento' | 'plan_casual';
export type RsvpStatus = 'pending' | 'yes' | 'maybe' | 'no';

export interface PlanParticipant {
  id: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  role: string;
  rsvpStatus: RsvpStatus;
}

export interface Plan {
  id: string;
  ownerId: string;
  title: string;
  type: PlanType;
  startDate: string;
  endDate: string | null;
  time: string | null;
  location: string | null;
  participants: PlanParticipant[];
}

export interface PlanInput {
  title: string;
  type: PlanType;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  invitedFriendIds?: string[];
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<MeResponse>('/users/me', {}, token),
  listFriends: (token: string) => request<Friend[]>('/friendships', {}, token),
  listFriendRequests: (token: string) => request<PendingRequest[]>('/friendships/requests', {}, token),
  searchFriends: (token: string, q: string) =>
    request<FriendSearchResult[]>(`/friendships/search?q=${encodeURIComponent(q)}`, {}, token),
  sendFriendRequest: (token: string, addresseeId: string) =>
    request<{ id: string }>('/friendships', { method: 'POST', body: JSON.stringify({ addresseeId }) }, token),
  acceptFriendRequest: (token: string, friendshipId: string) =>
    request<{ success: true }>(`/friendships/${friendshipId}/accept`, { method: 'PATCH' }, token),
  removeFriendRequest: (token: string, friendshipId: string) =>
    request<{ success: true }>(`/friendships/${friendshipId}`, { method: 'DELETE' }, token),
  listPlans: (token: string) => request<Plan[]>('/plans', {}, token),
  getPlan: (token: string, id: string) => request<Plan>(`/plans/${id}`, {}, token),
  createPlan: (token: string, input: PlanInput) =>
    request<Plan>('/plans', { method: 'POST', body: JSON.stringify(input) }, token),
  updatePlan: (token: string, id: string, input: Partial<PlanInput>) =>
    request<Plan>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deletePlan: (token: string, id: string) =>
    request<{ success: true }>(`/plans/${id}`, { method: 'DELETE' }, token),
  setRsvp: (token: string, id: string, status: Exclude<RsvpStatus, 'pending'>) =>
    request<Plan>(`/plans/${id}/rsvp`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
};
