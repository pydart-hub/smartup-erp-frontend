import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getBranchManagerDefaultCompany() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("smartup_session");

  if (!sessionCookie) {
    redirect("/auth/login");
  }

  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    const roles = Array.isArray(sessionData.roles) ? sessionData.roles : [];
    const defaultCompany = String(sessionData.default_company || "").trim();

    if (!roles.includes("Branch Manager") || !defaultCompany) {
      redirect("/dashboard/branch-manager");
    }

    return defaultCompany;
  } catch {
    redirect("/auth/login");
  }
}
