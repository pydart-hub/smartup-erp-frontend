## Fees
- Module: Education
- Is Child Table: 0

| fieldname | fieldtype | label | options | reqd |
|-----------|-----------|-------|---------|------|
| naming_series | Select | Naming Series | EDU-FEE-.YYYY.- | 0 |
| student | Link | Student | Student | 1 |
| student_name | Data | Student Name |  | 0 |
| include_payment | Check | Include Payment |  | 0 |
| send_payment_request | Check | Send Payment Request |  | 0 |
| company | Link | Institution | Company | 1 |
| posting_date | Date | Date |  | 1 |
| posting_time | Time | Posting Time |  | 0 |
| due_date | Date | Due Date |  | 1 |
| set_posting_time | Check | Edit Posting Date and Time |  | 0 |
| program_enrollment | Link | Program Enrollment | Program Enrollment | 1 |
| program | Link | Program | Program | 0 |
| academic_year | Link | Academic Year | Academic Year | 0 |
| academic_term | Link | Academic Term | Academic Term | 0 |
| fee_structure | Link | Fee Structure | Fee Structure | 1 |
| fee_schedule | Link | Fee Schedule | Fee Schedule | 0 |
| currency | Link | Currency | Currency | 0 |
| components | Table | Components | Fee Component | 1 |
| amended_from | Link | Amended From | Fees | 0 |
| grand_total | Currency | Grand Total |  | 0 |
| grand_total_in_words | Data | In Words |  | 0 |
| outstanding_amount | Currency | Outstanding Amount |  | 0 |
| contact_email | Data | Student Email | Email | 0 |
| student_category | Link | Student Category | Student Category | 0 |
| student_batch | Link | Student Batch | Student Batch Name | 0 |
| receivable_account | Link | Receivable Account | Account | 1 |
| income_account | Link | Income Account | Account | 0 |
| cost_center | Link | Cost Center | Cost Center | 0 |
| letter_head | Link | Letter Head | Letter Head | 0 |
| select_print_heading | Link | Print Heading | Print Heading | 0 |

## Fee Structure
- Module: Education
- Is Child Table: 0

| fieldname | fieldtype | label | options | reqd |
|-----------|-----------|-------|---------|------|
| naming_series | Select | Naming Series | EDU-FST-.YYYY.- | 0 |
| program | Link | Program | Program | 1 |
| student_category | Link | Student Category | Student Category | 0 |
| academic_year | Link | Academic Year | Academic Year | 1 |
| academic_term | Link | Academic Term | Academic Term | 0 |
| components | Table | Components | Fee Component | 1 |
| total_amount | Currency | Total Amount |  | 0 |
| receivable_account | Link | Receivable Account | Account | 1 |
| company | Link | Company | Company | 0 |
| amended_from | Link | Amended From | Fee Structure | 0 |
| cost_center | Link | Cost Center | Cost Center | 0 |

## Fee Schedule
- Module: Education
- Is Child Table: 0

| fieldname | fieldtype | label | options | reqd |
|-----------|-----------|-------|---------|------|
| fee_structure | Link | Fee Structure | Fee Structure | 1 |
| posting_date | Date | Posting Date |  | 1 |
| due_date | Date | Due Date |  | 1 |
| naming_series | Select | Naming Series | EDU-FSH-.YYYY.- | 0 |
| send_email | Check | Send Payment Request Email |  | 0 |
| student_category | Link | Student Category | Student Category | 0 |
| program | Link | Program | Program | 0 |
| academic_year | Link | Academic Year | Academic Year | 1 |
| academic_term | Link | Academic Term | Academic Term | 0 |
| currency | Link | Currency | Currency | 0 |
| student_groups | Table |  | Fee Schedule Student Group | 1 |
| components | Table | Components | Fee Component | 0 |
| total_amount | Currency | Total Amount per Student |  | 0 |
| grand_total | Currency | Grand Total |  | 0 |
| grand_total_in_words | Data | In Words |  | 0 |
| letter_head | Link | Letter Head | Letter Head | 0 |
| select_print_heading | Link | Print Heading | Print Heading | 0 |
| receivable_account | Link | Receivable Account | Account | 0 |
| company | Link | Institution | Company | 0 |
| amended_from | Link | Amended From | Fee Schedule | 0 |
| cost_center | Link | Cost Center | Cost Center | 0 |
| error_log | Small Text | Error Log |  | 0 |
| status | Select | Status | Draft
Cancelled
Invoice Pending
Order Pending
In Process
Invoice Created
Order Created
Failed | 0 |

## Fee Category
- Module: Education
- Is Child Table: 0

| fieldname | fieldtype | label | options | reqd |
|-----------|-----------|-------|---------|------|
| category_name | Data | Name |  | 1 |
| description | Small Text | Description |  | 0 |
| item | Link | Item | Item | 0 |
| item_defaults | Table | Accounting Defaults | Fee Category Default | 0 |

## Fee Component
- Module: Education
- Is Child Table: 1

| fieldname | fieldtype | label | options | reqd |
|-----------|-----------|-------|---------|------|
| fees_category | Link | Fees Category | Fee Category | 1 |
| description | Small Text | Description |  | 0 |
| amount | Currency | Amount |  | 1 |
| item | Link | Item | Item | 0 |
| discount | Percent | Discount(%) |  | 0 |
| total | Float | Total |  | 0 |

## Fee Schedule Student Group
- Module: Education
- Is Child Table: 1

| fieldname | fieldtype | label | options | reqd |
|-----------|-----------|-------|---------|------|
| student_group | Link | Student Group | Student Group | 1 |
| total_students | Data | Total Students |  | 0 |


