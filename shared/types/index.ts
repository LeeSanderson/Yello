// Shared types between frontend and backend

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  service: string;
  timestamp?: string;
}