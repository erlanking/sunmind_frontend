import type { Review, NewReview } from '@/types';
import { API_CONFIG, getAuthToken } from './config';

class ApiClient {
  private baseUrl = API_CONFIG.baseUrl;

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (options?.headers) {
      Object.assign(headers, options.headers);
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async getReviews(): Promise<Review[]> {
    return this.request<Review[]>('/api/reviews');
  }

  async addReview(review: NewReview): Promise<Review> {
    return this.request<Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }
}

export const apiClient = new ApiClient();
