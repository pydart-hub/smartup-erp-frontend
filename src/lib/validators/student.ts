import { z } from "zod";

export const studentSchema = z.object({
  // Step 1 — Student Info
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { message: "Gender is required" }),
  blood_group: z.enum(["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  student_email_id: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  student_mobile_number: z.string().optional(),

  // Step 2 — Academic
  custom_branch: z.string().min(1, "Branch is required"),       // Company name
  program: z.string().min(1, "Class is required"),              // Program name
  academic_year: z.string().min(1, "Academic year is required"),// Academic Year
  custom_srr_id: z.string().optional(),                         // Auto-generated SRR ID
  student_batch_name: z.string().optional(),                    // Batch code e.g. "CHL-25"
  enrollment_date: z.string().min(1, "Enrollment date is required"),

  // Step 3 — Guardian
  guardian_name: z.string().min(1, "Guardian name is required"),
  guardian_email: z.string().email("Guardian email is required for parent login"),
  guardian_mobile: z.string().min(10, "Valid mobile number required"),
  guardian_relation: z.string().min(1, "Relation is required"),
  guardian_password: z.string().min(8, "Password must be at least 8 characters"),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
