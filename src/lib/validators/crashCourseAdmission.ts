/**
 * Zod validation schema for Crash Course Admission
 */

import { z } from "zod";

export const crashCourseAdmissionSchema = z.object({
  // Step 1: Student Information
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name is too long"),
  last_name: z.string().max(100).optional(),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  gender: z.enum(["Male", "Female", "Other"], {
    message: "Gender is required",
  }),
  student_email_id: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  student_mobile_number: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian phone number")
    .optional()
    .or(z.literal("")),
  aadhaar_number: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be 12 digits")
    .optional()
    .or(z.literal("")),
  custom_school_name: z.string().max(200).optional(),
  custom_place: z.string().max(100).optional(),

  // Step 2: Guardian Information
  guardian_name: z
    .string()
    .min(1, "Guardian name is required")
    .max(100, "Guardian name is too long"),
  guardian_email: z
    .string()
    .min(1, "Guardian email is required")
    .email("Invalid email address"),
  guardian_mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian phone number"),
  guardian_relation: z.string().min(1, "Relation is required"),
  guardian_password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),

  // Step 3: Academic & Batch
  branch: z.string().min(1, "Branch is required"),
  class_level: z.enum(["9th", "10th", "Plus One", "Plus Two"], {
    message: "Class level is required",
  }),
  academic_year: z.string().default("2026-2027"),
  batch_name: z.string().optional(),
  selected_languages: z
    .array(z.enum(["English", "Hindi", "Malayalam"]))
    .default([]),

  // Step 4: Payment
  payment_mode: z
    .enum(["Cash", "Bank Transfer", "UPI", "Razorpay"])
    .default("Cash"),
  paid_amount: z.number().min(0).optional(),
  payment_reference: z.string().optional(),
});

export type CrashCourseAdmissionFormValues = z.infer<
  typeof crashCourseAdmissionSchema
>;
