const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface SessionRefreshHandlers {
  getRefreshToken: () => string | null;
  onRefreshed: (accessToken: string, refreshToken: string) => void;
  onRefreshFailed: () => void;
}

let sessionRefreshHandlers: SessionRefreshHandlers | null = null;
let refreshInFlight: Promise<string | null> | null = null;

// Permite que auth-context.tsx conecte la renovación automática de sesión sin
// que este módulo dependa directamente de React ni del contexto de auth.
export function setSessionRefreshHandlers(handlers: SessionRefreshHandlers | null) {
  sessionRefreshHandlers = handlers;
}

// Si varias peticiones caducan a la vez, solo se refresca una vez y las demás
// esperan ese mismo resultado (los refresh tokens de Supabase rotan: usar el
// mismo token dos veces invalidaría el segundo intento).
async function refreshAccessToken(): Promise<string | null> {
  if (!sessionRefreshHandlers) return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = sessionRefreshHandlers?.getRefreshToken();
      if (!refreshToken) return null;
      try {
        const result = await request<{ accessToken: string; refreshToken: string }>(
          '/auth/refresh',
          { method: 'POST', body: JSON.stringify({ refreshToken }) },
        );
        sessionRefreshHandlers?.onRefreshed(result.accessToken, result.refreshToken);
        return result.accessToken;
      } catch (err) {
        // Un fallo de red no significa que la sesión sea inválida: solo se
        // cierra sesión cuando el servidor rechaza explícitamente el refresh token.
        if (err instanceof ApiError) {
          sessionRefreshHandlers?.onRefreshFailed();
        }
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  isRetry = false,
): Promise<T> {
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

  if (response.status === 401 && token && !isRetry && path !== '/auth/refresh') {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return request<T>(path, options, newAccessToken, true);
    }
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body && (body.message as string)) || 'Ha ocurrido un error inesperado.';
    throw new ApiError(Array.isArray(message) ? message.join(' ') : message, response.status);
  }

  return body as T;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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

export interface ExpenseSplit {
  userId: string;
  name: string;
  amountOwed: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  createdAt: string;
  splits: ExpenseSplit[];
}

export interface ExpenseInput {
  description: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
}

export interface BalanceEntry {
  userId: string;
  name: string;
  net: number;
}

export interface SettlementTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  paid: boolean;
}

export interface BalancesResult {
  expensesClosed: boolean;
  myNet: number;
  balances: BalanceEntry[];
  settlement: SettlementTransfer[];
}

export interface PlanListItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PlanList {
  id: string;
  title: string;
  templateId: string | null;
  items: PlanListItem[];
}

export interface ListTemplate {
  id: string;
  title: string;
  items: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface ReminderShare {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface ReminderItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Reminder {
  id: string;
  ownerId: string;
  ownerName: string;
  date: string;
  title: string;
  time: string | null;
  done: boolean;
  sharedWith: ReminderShare[];
  items: ReminderItem[];
}

export interface ReminderInput {
  title: string;
  date: string;
  time?: string;
  sharedWith?: string[];
  items?: string[];
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) =>
    request<{ success: true }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (accessToken: string, newPassword: string) =>
    request<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ accessToken, newPassword }),
    }),
  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
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
  listExpenses: (token: string, planId: string) => request<Expense[]>(`/plans/${planId}/expenses`, {}, token),
  createExpense: (token: string, planId: string, input: ExpenseInput) =>
    request<Expense>(`/plans/${planId}/expenses`, { method: 'POST', body: JSON.stringify(input) }, token),
  updateExpense: (token: string, planId: string, expenseId: string, input: Partial<ExpenseInput>) =>
    request<Expense>(
      `/plans/${planId}/expenses/${expenseId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      token,
    ),
  deleteExpense: (token: string, planId: string, expenseId: string) =>
    request<{ success: true }>(`/plans/${planId}/expenses/${expenseId}`, { method: 'DELETE' }, token),
  getBalances: (token: string, planId: string) =>
    request<BalancesResult>(`/plans/${planId}/expenses/balances`, {}, token),
  closeAccounts: (token: string, planId: string) =>
    request<{ expensesClosed: boolean }>(`/plans/${planId}/expenses/close-accounts`, { method: 'POST' }, token),
  reopenAccounts: (token: string, planId: string) =>
    request<{ expensesClosed: boolean }>(`/plans/${planId}/expenses/reopen-accounts`, { method: 'POST' }, token),
  markTransferPaid: (token: string, planId: string, fromId: string, toId: string) =>
    request<BalancesResult>(
      `/plans/${planId}/expenses/settlements/pay`,
      { method: 'PATCH', body: JSON.stringify({ fromId, toId }) },
      token,
    ),
  unmarkTransferPaid: (token: string, planId: string, fromId: string, toId: string) =>
    request<BalancesResult>(
      `/plans/${planId}/expenses/settlements/pay`,
      { method: 'DELETE', body: JSON.stringify({ fromId, toId }) },
      token,
    ),
  listLists: (token: string, planId: string) => request<PlanList[]>(`/plans/${planId}/lists`, {}, token),
  createList: (token: string, planId: string, input: { title?: string; templateId?: string }) =>
    request<PlanList>(`/plans/${planId}/lists`, { method: 'POST', body: JSON.stringify(input) }, token),
  deleteList: (token: string, planId: string, listId: string) =>
    request<{ success: true }>(`/plans/${planId}/lists/${listId}`, { method: 'DELETE' }, token),
  addListItem: (token: string, planId: string, listId: string, text: string) =>
    request<PlanList>(`/plans/${planId}/lists/${listId}/items`, { method: 'POST', body: JSON.stringify({ text }) }, token),
  updateListItem: (token: string, planId: string, listId: string, itemId: string, done: boolean) =>
    request<PlanList>(
      `/plans/${planId}/lists/${listId}/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify({ done }) },
      token,
    ),
  deleteListItem: (token: string, planId: string, listId: string, itemId: string) =>
    request<PlanList>(`/plans/${planId}/lists/${listId}/items/${itemId}`, { method: 'DELETE' }, token),
  saveListAsTemplate: (token: string, planId: string, listId: string) =>
    request<PlanList>(`/plans/${planId}/lists/${listId}/template`, { method: 'POST' }, token),
  unsaveListTemplate: (token: string, planId: string, listId: string) =>
    request<PlanList>(`/plans/${planId}/lists/${listId}/template`, { method: 'DELETE' }, token),
  listTemplates: (token: string) => request<ListTemplate[]>('/list-templates', {}, token),
  createListTemplate: (token: string, input: { title: string; items: string[] }) =>
    request<ListTemplate>('/list-templates', { method: 'POST', body: JSON.stringify(input) }, token),
  updateListTemplate: (token: string, templateId: string, input: { title?: string; items?: string[] }) =>
    request<ListTemplate>(`/list-templates/${templateId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deleteListTemplate: (token: string, templateId: string) =>
    request<{ success: true }>(`/list-templates/${templateId}`, { method: 'DELETE' }, token),
  listMessages: (token: string, planId: string) => request<ChatMessage[]>(`/plans/${planId}/messages`, {}, token),
  sendMessage: (token: string, planId: string, content: string) =>
    request<ChatMessage>(`/plans/${planId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }, token),
  listReminders: (token: string) => request<Reminder[]>('/reminders', {}, token),
  createReminder: (token: string, input: ReminderInput) =>
    request<Reminder>('/reminders', { method: 'POST', body: JSON.stringify(input) }, token),
  updateReminder: (token: string, id: string, input: Partial<Omit<ReminderInput, 'items'>>) =>
    request<Reminder>(`/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deleteReminder: (token: string, id: string) =>
    request<{ success: true }>(`/reminders/${id}`, { method: 'DELETE' }, token),
  setReminderDone: (token: string, id: string, done: boolean) =>
    request<Reminder>(`/reminders/${id}/done`, { method: 'PATCH', body: JSON.stringify({ done }) }, token),
  addReminderItem: (token: string, id: string, text: string) =>
    request<Reminder>(`/reminders/${id}/items`, { method: 'POST', body: JSON.stringify({ text }) }, token),
  updateReminderItem: (token: string, id: string, itemId: string, done: boolean) =>
    request<Reminder>(`/reminders/${id}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ done }) }, token),
  deleteReminderItem: (token: string, id: string, itemId: string) =>
    request<Reminder>(`/reminders/${id}/items/${itemId}`, { method: 'DELETE' }, token),
};
