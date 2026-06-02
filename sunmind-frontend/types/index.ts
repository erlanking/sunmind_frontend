export type TimePeriod = 'day' | 'week' | 'month';

export type LightMode = 'economy' | 'default' | 'maximum';

export interface LightSettings {
  isOn: boolean;
  brightness: number;
  mode: LightMode;
}

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
