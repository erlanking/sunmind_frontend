export type TimePeriod = 'day' | 'week' | 'month';

export interface User {
  id: number;
  name: string;
  email: string;
  roles?: { role_name: string }[];
}

export interface Review {
  id: string;
  userId?: string;
  userName?: string;
  author?: string;
  text?: string;
  comment?: string;
  rating: number;
  date?: string;
  createdAt?: string;
}

export interface NewReview {
  rating: number;
  comment?: string;
  author?: string;
  text?: string;
  date?: string;
}
