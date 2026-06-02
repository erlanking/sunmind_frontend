export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    'https://sunmind.softjol.site',
  wsURL:
    process.env.NEXT_PUBLIC_WS_URL ||
    'wss://sunmind.softjol.site',
};

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}
