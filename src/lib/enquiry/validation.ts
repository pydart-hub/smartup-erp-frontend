import crypto from "crypto";
import { z } from "zod";
import { validateFullE164PhoneStrict } from "@/lib/constants/countries";

export const CLASS_LEVELS = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

export const PLAN_OPTIONS = [
  "1:1 Personal",
  "1:3 Small Group",
  "Micro Batch",
  "Not sure",
] as const;

export const BOARD_OPTIONS = [
  "CBSE",
  "ICSE",
  "Kerala State",
  "Other",
] as const;

export const STREAM_OPTIONS = ["Science", "Commerce"] as const;

export const CALL_TIME_OPTIONS = [
  "Evening (GCC)",
  "Morning",
  "Afternoon",
  "Weekend",
] as const;

export const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "demo_scheduled",
  "diagnostic_done",
  "enrolled",
  "not_interested",
] as const;

export const enquiryRegistrationSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(2, "Please enter the student's full name.")
    .max(120, "Student name is too long."),
  parentName: z
    .string()
    .trim()
    .min(2, "Please enter the parent/guardian's name.")
    .max(120, "Parent name is too long."),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[^\d+]/g, ""))
    .superRefine((val, ctx) => {
      const result = validateFullE164PhoneStrict(val);
      if (!result.isValid) {
        ctx.addIssue({
          code: "custom",
          message:
            result.error || "Please enter a valid WhatsApp / mobile number.",
        });
      }
    }),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Please enter a valid email address."
    ),
  country: z.string().trim().min(2, "Please select your country."),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  classLevel: z.enum(CLASS_LEVELS),
  stream: z.enum(STREAM_OPTIONS).default("Science"),
  board: z.enum(BOARD_OPTIONS).default("CBSE"),
  preferredPlan: z.enum(PLAN_OPTIONS).default("Not sure"),
  schoolName: z.string().trim().max(160).optional().or(z.literal("")),
  preferredCallTime: z.enum(CALL_TIME_OPTIONS).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
  referrer: z.string().trim().max(300).optional(),
});

export type EnquiryRegistrationInput = z.infer<typeof enquiryRegistrationSchema>;

export function generateEnquiryRefCode(): string {
  const numPart = String(crypto.randomInt(1000, 10000));
  const alphaPart = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SU-CC-${numPart}${alphaPart}`;
}
