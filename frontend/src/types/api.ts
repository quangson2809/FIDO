export interface ApiResponse<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
