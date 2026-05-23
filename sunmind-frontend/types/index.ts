export type TimePeriod = 'day' | 'week' | 'month';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface NewReview {
  rating: number;
  comment: string;
}
