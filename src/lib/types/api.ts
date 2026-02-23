// ── Generic Frappe API Response Types ──

export interface FrappeListResponse<T> {
  data: T[];
}

export interface FrappeSingleResponse<T> {
  data: T;
}

export interface FrappeMethodResponse<T = unknown> {
  message: T;
}

export interface FrappeError {
  exc_type: string;
  exception: string;
  _server_messages?: string;
  httpStatusCode?: number;
}

export interface PaginationParams {
  limit_start?: number;
  limit_page_length?: number;
  order_by?: string;
}

export interface FilterParam {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "like" | "not like" | "in" | "not in" | "between";
  value: string | number | string[] | number[];
}
