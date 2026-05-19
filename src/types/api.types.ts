export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export function createSuccessResponse<T>(data: T, status = 200): ApiResponse<T> {
  return { data, error: null, status };
}

export function createErrorResponse(message: string, status = 500): ApiResponse<never> {
  return { data: null, error: message, status };
}
