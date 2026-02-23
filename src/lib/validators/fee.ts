import { z } from "zod";

export const feeStructureSchema = z.object({
  program: z.string().min(1, "Class is required"),
  academic_term: z.string().optional(),
  components: z.array(
    z.object({
      fees_category: z.string().min(1, "Fee category is required"),
      description: z.string().optional(),
      amount: z.number().min(0, "Amount must be positive"),
    })
  ).min(1, "At least one fee component is required"),
});

export type FeeStructureFormValues = z.infer<typeof feeStructureSchema>;

export const paymentSchema = z.object({
  student: z.string().min(1, "Student is required"),
  fee_record: z.string().min(1, "Fee record is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  mode_of_payment: z.string().min(1, "Payment mode is required"),
  reference_no: z.string().optional(),
  remarks: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
