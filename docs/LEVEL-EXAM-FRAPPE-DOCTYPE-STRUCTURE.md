# Level Exam Frappe Doctype Structure

The Level Exam module now uses Frappe custom doctypes as its only execution path.
The old local/runtime Level Exam store is no longer used by the Level Exam APIs.

That means:
- exam catalog reads come from Frappe doctypes
- assignments come from Frappe doctypes
- in-progress attempts and answers are stored in Frappe doctypes
- submitted results are stored and read from Frappe doctypes
- if these doctypes are missing, the API now fails instead of silently falling back

## Required Doctypes

### 1. `Level Exam Student Snapshot`

Fields:
- `student_id` : Data, Unique
- `student` : Link -> `Student`
- `student_name` : Data
- `branch` : Data
- `program` : Data
- `student_group` : Link -> `Student Group`
- `level_code` : Data
- `board_code` : Data
- `is_active` : Check
- `snapshot_json` : Long Text

### 2. `Level Exam`

Fields:
- `exam_id` : Data, Unique
- `title` : Data
- `subject_code` : Data
- `subject_name` : Data
- `level_code` : Data
- `board_code` : Data
- `instructions` : Long Text
- `duration_minutes` : Int
- `total_questions` : Int
- `total_marks` : Float
- `available_from` : Datetime
- `available_until` : Datetime
- `exam_status` : Data
- `exam_json` : Long Text

### 3. `Level Exam Assignment`

Fields:
- `assignment_id` : Data, Unique
- `exam_id` : Data
- `student` : Link -> `Student`
- `title` : Data
- `subject_code` : Data
- `subject_name` : Data
- `level_code` : Data
- `board_code` : Data
- `assignment_status` : Data
- `exam_status` : Data
- `available_from` : Datetime
- `available_until` : Datetime
- `submitted_at` : Datetime
- `percentage` : Float
- `assignment_json` : Long Text

### 4. `Level Exam Attempt`

Fields:
- `attempt_id` : Data, Unique
- `exam_id` : Data
- `student` : Link -> `Student`
- `student_name` : Data
- `title` : Data
- `subject_name` : Data
- `level_code` : Data
- `board_code` : Data
- `status` : Data
- `started_at` : Datetime
- `submitted_at` : Datetime
- `duration_minutes` : Int
- `total_questions` : Int
- `total_marks` : Float
- `answered_count` : Int
- `remaining_seconds` : Int
- `score_obtained` : Float
- `percentage` : Float
- `correct_count` : Int
- `wrong_count` : Int
- `unanswered_count` : Int
- `answers_json` : Long Text
- `attempt_json` : Long Text
- `result_json` : Long Text

### 5. `Level Exam Source`

Fields:
- `source_title` : Data
- `subject` : Data
- `class_scope` : Data
- `status` : Data
- `notes` : Long Text
- `attachment_name` : Data

### 6. `Level Exam Question`

Fields:
- `subject` : Data
- `class_level` : Data
- `source` : Link -> `Level Exam Source`
- `question_text` : Long Text
- `difficulty` : Data
- `correct_option_key` : Data
- `explanation` : Long Text
- `is_active` : Check
- `review_status` : Data
- `options_json` : Long Text

## Environment Overrides

These names can be overridden if your backend uses different doctype names:

- `FRAPPE_LEVEL_EXAM_STUDENT_DOCTYPE`
- `FRAPPE_LEVEL_EXAM_DOCTYPE`
- `FRAPPE_LEVEL_EXAM_ASSIGNMENT_DOCTYPE`
- `FRAPPE_LEVEL_EXAM_ATTEMPT_DOCTYPE`
- `FRAPPE_LEVEL_EXAM_SOURCE_DOCTYPE`
- `FRAPPE_LEVEL_EXAM_QUESTION_DOCTYPE`

If they are not set, the frontend uses the default names above.
