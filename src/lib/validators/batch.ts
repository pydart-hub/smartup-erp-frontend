import { z } from "zod";
import { MAX_BATCH_CAPACITY } from "@/lib/utils/constants";

export const batchSchema = z.object({
  program: z.string().min(1, "Class is required"),
  batch: z.string().min(1, "Batch name is required"),
  max_strength: z.number().min(1).max(200).default(MAX_BATCH_CAPACITY),
  class_start_time: z.string().optional(),
  class_end_time: z.string().optional(),
  class_incharge: z.string().optional(),
});

export type BatchFormValues = z.infer<typeof batchSchema>;

export const classSchema = z.object({
  program_name: z.string().min(1, "Class name is required"),
  department: z.string().optional(),
});

export type ClassFormValues = z.infer<typeof classSchema>;
