import type { Href } from 'expo-router';

// Los tokens de invitación son randomBytes(12).toString('hex') en el backend
// (PlansService.getOrCreateInvitation). El parámetro ?invite= de la ruta lo
// controla quien abre el enlace, así que solo se usa para redirigir si tiene
// exactamente esa forma — nunca se interpola en una ruta sin validar.
const INVITE_TOKEN_PATTERN = /^[a-f0-9]{24}$/;

export function parseInviteParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && INVITE_TOKEN_PATTERN.test(raw) ? raw : null;
}

export function inviteHref(inviteToken: string): Href {
  return `/invite/${inviteToken}` as Href;
}

export function loginWithInviteHref(inviteToken: string, mode: 'login' | 'signup'): Href {
  return { pathname: '/login', params: { invite: inviteToken, mode } } as Href;
}

export function onboardingWithInviteHref(inviteToken: string): Href {
  return { pathname: '/onboarding', params: { invite: inviteToken } } as Href;
}
