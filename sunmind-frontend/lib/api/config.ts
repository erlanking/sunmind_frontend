export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    'https://sunmindthebestbackend-production.up.railway.app',
  wsUrl:
    process.env.NEXT_PUBLIC_WS_URL ||
    'wss://sunmindthebestbackend-production.up.railway.app',
};

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}
