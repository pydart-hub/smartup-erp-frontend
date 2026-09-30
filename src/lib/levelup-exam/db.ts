import { PrismaClient } from "@/generated/levelup-client";

const globalForPrisma = globalThis as unknown as {
  levelupPrisma: PrismaClient | undefined;
};

export const levelupDb =
  globalForPrisma.levelupPrisma ??
  new PrismaClient({
    datasourceUrl: process.env.LEVELUP_DATABASE_URL,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.levelupPrisma = levelupDb;
}
