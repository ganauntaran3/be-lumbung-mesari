export interface PaginationResult<T> {
  data: T[]
  page: number
  limit: number
  totalData: number
  totalPage: number
  next: boolean
  prev: boolean
}

export interface PaginationOptions {
  /** Page number (1-based) */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Column to sort by */
  sortBy?: string
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Additional filters for the query */
  filters?: Record<string, any>
}

/**
 * Default pagination values
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc' as const,
  maxLimit: 100
} as const
