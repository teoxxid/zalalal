export { api } from '../../services/api';
export { default } from '../../services/api';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  warning?: string;
}
