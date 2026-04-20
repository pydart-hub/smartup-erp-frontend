import { z } from "zod";

export const studentSchema = z.object({
  // Step 1 — Student Info
  student_type: z.enum(["fresher", "existing", "rejoining", "demo", "free_access"], { message: "Student type is required" }),
  full_name: z.string().min(1, "Name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { message: "Gender is required" }),
  blood_group: z.enum(["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  student_email_id: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  student_mobile_number: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits").optional().or(z.literal("")),
  aadhaar_number: z.string().regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits").optional().or(z.literal("")),
  disabilities: z.string().optional(),
  custom_place: z.string().optional(),
  custom_school_name: z.string().optional(),

  // Step 2 — Guardian
  guardian_name: z.string().min(1, "Guardian name is required"),
  guardian_email: z.string().email("Guardian email is required for parent login"),
  guardian_mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  guardian_relation: z.string().min(1, "Relation is required"),
  guardian_password: z.string().min(8, "Password must be at least 8 characters"),

  // Step 3 — Academic
  custom_branch: z.string().min(1, "Branch is required"),       // Company name
  program: z.string().min(1, "Class is required"),              // Program name
  academic_year: z.string().min(1, "Academic year is required"),// Academic Year
  custom_srr_id: z.string().optional(),                         // Auto-generated SRR ID
  student_batch_name: z.string().min(1, "Batch is required"),    // Student Group name
  enrollment_date: z.string().min(1, "Enrollment date is required"),

  // Step 4 — Fee Details (plan and instalments validated in onSubmit for non-demo)
  custom_plan: z.string(),
  custom_no_of_instalments: z.string(),
  fee_structure: z.string().optional(),                         // resolved Fee Structure name
  custom_mode_of_payment: z.enum(["Cash", "Online", ""], { message: "Mode of payment is required" }).optional(),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
