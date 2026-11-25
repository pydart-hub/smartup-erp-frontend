const ENQUIRY_ADMIN_USER =
  process.env.ENQUIRY_ADMIN_USER || "enquiry@SmartUp";
const ENQUIRY_ADMIN_PASS =
  process.env.ENQUIRY_ADMIN_PASS || "enquiry@SmartUp!";

export function verifyEnquiryAdminCredentials(
  username: string,
  password: string
): boolean {
  const cleanUser = username.trim();
  const isEnquiryAdmin =
    cleanUser === ENQUIRY_ADMIN_USER && password === ENQUIRY_ADMIN_PASS;
  const isMasterAdmin =
    cleanUser === "admin@SmartUp" && password === "admin@SmartUp!";
  return isEnquiryAdmin || isMasterAdmin;
}

export function verifyEnquiryAdminPassword(password: string): boolean {
  if (!password) return false;
  return password === ENQUIRY_ADMIN_PASS || password === "admin@SmartUp!";
}
