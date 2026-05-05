export type AlumniQualificationLevel = "UG" | "PG";

export interface AlumniRecord {
  name: string;
  full_name: string;
  phone: string;
  address: string;
  email: string;
  passout_year: string;
  current_position: string;
  last_studied_institute: string;
  qualification_level: AlumniQualificationLevel;
  special_skills_remark?: string;
  owner?: string;
  modified_by?: string;
  creation?: string;
  modified?: string;
}

export interface AlumniFormInput {
  full_name: string;
  phone: string;
  address: string;
  email: string;
  passout_year: string;
  current_position: string;
  last_studied_institute: string;
  qualification_level: AlumniQualificationLevel;
  special_skills_remark?: string;
}

export interface AlumniListParams {
  q?: string;
  passout_year?: string;
  qualification_level?: AlumniQualificationLevel | "";
  page?: number;
  pageSize?: number;
}

export interface AlumniListSummary {
  total: number;
  currentYearPassouts: number;
  ugCount: number;
  pgCount: number;
}

export interface AlumniListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  warning?: string;
}

export interface AlumniListResponse {
  data: AlumniRecord[];
  meta: AlumniListMeta;
  summary: AlumniListSummary;
}
