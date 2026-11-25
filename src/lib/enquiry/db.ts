import { PrismaClient } from "@/generated/enquiry-client";

const globalForPrisma = globalThis as unknown as {
  enquiryPrisma: PrismaClient | undefined;
};

export const enquiryDb =
  globalForPrisma.enquiryPrisma ??
  new PrismaClient({
    datasourceUrl: process.env.ENQUIRY_DATABASE_URL,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.enquiryPrisma = enquiryDb;
}

