import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "smartup-scholar-secret-key-2026";

export function generateAdminToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac("sha256", SECRET).update(`scholar-admin-${timestamp}`).digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [timestamp, signature] = parts;

  // Max age: 12 hours
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (isNaN(tokenAge) || tokenAge < 0 || tokenAge > 12 * 60 * 60 * 1000) {
    return false;
  }

  const expectedSignature = crypto.createHmac("sha256", SECRET).update(`scholar-admin-${timestamp}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}
