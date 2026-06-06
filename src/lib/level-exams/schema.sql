create table if not exists level_exam_subjects (
  code text primary key,
  name text not null
);

create table if not exists level_exam_levels (
  code text primary key,
  name text not null
);

create table if not exists level_exam_question_sources (
  id uuid primary key,
  subject_code text not null references level_exam_subjects(code),
  original_file_name text not null,
  storage_path text,
  status text not null default 'review_pending',
  uploaded_at timestamptz not null default now()
);

create table if not exists level_exam_questions (
  id uuid primary key,
  source_id uuid references level_exam_question_sources(id),
  subject_code text not null references level_exam_subjects(code),
  level_code text not null references level_exam_levels(code),
  stem text not null,
  explanation text,
  difficulty text not null default 'medium',
  status text not null default 'approved',
  is_active boolean not null default true
);

create table if not exists level_exam_question_options (
  id uuid primary key,
  question_id uuid not null references level_exam_questions(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  is_correct boolean not null default false
);

create unique index if not exists idx_level_exam_option_key
  on level_exam_question_options(question_id, option_key);

create table if not exists level_exam_student_snapshots (
  frappe_student_id text primary key,
  student_name text not null,
  branch text,
  program text,
  student_group text,
  level_code text not null references level_exam_levels(code),
  is_active boolean not null default true,
  synced_at timestamptz not null default now()
);

create table if not exists level_exam_exams (
  id uuid primary key,
  title text not null,
  subject_code text not null references level_exam_subjects(code),
  level_code text not null references level_exam_levels(code),
  instructions text not null,
  duration_minutes integer not null,
  total_questions integer not null,
  total_marks numeric(8,2) not null,
  available_from timestamptz not null,
  available_until timestamptz not null,
  status text not null default 'published'
);

create table if not exists level_exam_exam_questions (
  exam_id uuid not null references level_exam_exams(id) on delete cascade,
  question_id uuid not null references level_exam_questions(id),
  display_order integer not null,
  marks numeric(8,2) not null default 1,
  primary key (exam_id, question_id)
);

create table if not exists level_exam_assignments (
  id uuid primary key,
  exam_id uuid not null references level_exam_exams(id) on delete cascade,
  frappe_student_id text not null references level_exam_student_snapshots(frappe_student_id),
  assigned_at timestamptz not null default now(),
  status text not null default 'assigned'
);

create unique index if not exists idx_level_exam_assignment_unique
  on level_exam_assignments(exam_id, frappe_student_id);

create table if not exists level_exam_attempts (
  id uuid primary key,
  exam_id uuid not null references level_exam_exams(id) on delete cascade,
  frappe_student_id text not null references level_exam_student_snapshots(frappe_student_id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress',
  score_obtained numeric(8,2),
  total_marks numeric(8,2),
  percentage numeric(5,2),
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  unanswered_count integer not null default 0
);

create unique index if not exists idx_level_exam_active_attempt
  on level_exam_attempts(exam_id, frappe_student_id)
  where status = 'in_progress';

create table if not exists level_exam_attempt_answers (
  id uuid primary key,
  attempt_id uuid not null references level_exam_attempts(id) on delete cascade,
  question_id uuid not null references level_exam_questions(id),
  selected_option_id uuid references level_exam_question_options(id),
  answered_at timestamptz not null default now()
);

create unique index if not exists idx_level_exam_answer_unique
  on level_exam_attempt_answers(attempt_id, question_id);
