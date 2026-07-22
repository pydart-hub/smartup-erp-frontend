import { z } from "zod";

export const salesAdmissionSchema = z.object({
  student_name: z.string().min(2, "Student name must be at least 2 characters"),
  class_name: z.string().min(1, "Class / Program is required"),
  plan: z.enum(["Basic", "Intermediate", "Advanced"], {
    message: "Please select a valid plan (Basic, Intermediate, or Advanced)",
  }),
  branch: z.string().min(1, "Branch is required"),
  admission_date: z.string().min(1, "Admission date is required"),
  remarks: z.string().optional(),
});

export type SalesAdmissionFormValues = z.infer<typeof salesAdmissionSchema>;
