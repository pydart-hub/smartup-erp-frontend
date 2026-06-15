import { O2O_RATE_FIELD_CANDIDATES, extractO2ORateFromRecord } from "@/lib/utils/o2oRateField";
import { parseO2OHourlyRate, resolveO2OHourlyRate } from "@/lib/utils/o2oFeeRates";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `token ${API_KEY}:${API_SECRET}`,
  };
}

async function fetchRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: unknown) {
      const retryable =
        err instanceof TypeError ||
        (err as { code?: string })?.code === "UND_ERR_SOCKET" ||
        (err as { cause?: { code?: string } })?.cause?.code === "UND_ERR_SOCKET";
      if (!retryable || attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
}

async function setDocRate(
  doctype: "Student Group" | "Program Enrollment",
  name: string,
  rate: number,
): Promise<{ field: string; verifiedRate: number | null }> {
  for (const field of O2O_RATE_FIELD_CANDIDATES) {
    const res = await fetchRetry(`${FRAPPE_URL}/api/method/frappe.client.set_value`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        doctype,
        name,
        fieldname: field,
        value: rate,
      }),
      cache: "no-store",
    });
    if (!res.ok) continue;

    const json = await res.json().catch(() => ({})) as {
      message?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };
    const verifiedRate =
      extractO2ORateFromRecord(json.message) ??
      extractO2ORateFromRecord(json.data) ??
      rate;
    return { field, verifiedRate };
  }
  throw new Error(`No supported O2O rate field could be updated on ${doctype} ${name}.`);
}

async function getDocRate(
  doctype: "Student Group" | "Program Enrollment",
  name: string,
): Promise<number | null> {
  const fields = encodeURIComponent(JSON.stringify([...O2O_RATE_FIELD_CANDIDATES]));
  const res = await fetchRetry(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}?fields=${fields}`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (res.ok) {
    const json = await res.json().catch(() => ({})) as {
      data?: Record<string, unknown>;
    };
    const parsed = extractO2ORateFromRecord(json.data);
    if (parsed != null) return parsed;
  }

  for (const field of O2O_RATE_FIELD_CANDIDATES) {
    const singleRes = await fetchRetry(
      `${FRAPPE_URL}/api/method/frappe.client.get_value?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(name)}&fieldname=${encodeURIComponent(field)}`,
      { headers: authHeaders(), cache: "no-store" },
    );
    if (!singleRes.ok) continue;

    const singleJson = await singleRes.json().catch(() => ({})) as {
      message?: Record<string, unknown>;
    };
    const parsed = extractO2ORateFromRecord(singleJson.message);
    if (parsed != null) return parsed;
    const explicit = parseO2OHourlyRate(singleJson.message?.[field]);
    if (explicit != null) return explicit;
  }

  return null;
}

async function getProgramEnrollmentRate(params: {
  studentId: string;
  studentGroupName?: string;
}): Promise<{ rate: number | null; name?: string }> {
  const fields = encodeURIComponent(
    JSON.stringify(["name", "custom_o2o_student_group", ...O2O_RATE_FIELD_CANDIDATES]),
  );

  if (params.studentGroupName) {
    const linkedFilters = encodeURIComponent(
      JSON.stringify([
        ["student", "=", params.studentId],
        ["custom_o2o_student_group", "=", params.studentGroupName],
        ["docstatus", "!=", 2],
      ]),
    );
    const linkedRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Program Enrollment?filters=${linkedFilters}&fields=${fields}&order_by=enrollment_date desc, creation desc&limit_page_length=1`,
      { headers: authHeaders(), cache: "no-store" },
    );
    if (linkedRes.ok) {
      const linkedJson = await linkedRes.json().catch(() => ({})) as {
        data?: Array<Record<string, unknown>>;
      };
      const row = linkedJson.data?.[0];
      const rate = extractO2ORateFromRecord(row);
      if (rate != null) {
        return {
          rate,
          name: typeof row?.name === "string" ? row.name : undefined,
        };
      }
    }
  }

  const filters = encodeURIComponent(JSON.stringify([["student", "=", params.studentId], ["docstatus", "!=", 2]]));
  const res = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Program Enrollment?filters=${filters}&fields=${fields}&order_by=enrollment_date desc, creation desc&limit_page_length=1`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    return { rate: null };
  }
  const json = await res.json().catch(() => ({})) as { data?: Array<Record<string, unknown>> };
  const row = json.data?.[0];
  return {
    rate: extractO2ORateFromRecord(row),
    name: typeof row?.name === "string" ? row.name : undefined,
  };
}

async function getStudentGroupRate(studentGroupName: string): Promise<number | null> {
  return getDocRate("Student Group", studentGroupName);
}

export async function saveStoredO2ORate(params: {
  rate: number;
  studentGroupName?: string;
  programEnrollmentName?: string;
}): Promise<{ savedOn: string[]; verifiedRate: number | null }> {
  const savedOn: string[] = [];
  let verifiedRate: number | null = null;

  if (params.studentGroupName) {
    const result = await setDocRate("Student Group", params.studentGroupName, params.rate);
    savedOn.push(`Student Group.${result.field}`);
    verifiedRate = result.verifiedRate;
  }

  if (params.programEnrollmentName) {
    const result = await setDocRate("Program Enrollment", params.programEnrollmentName, params.rate);
    savedOn.push(`Program Enrollment.${result.field}`);
    verifiedRate = result.verifiedRate ?? verifiedRate;
  }

  if (verifiedRate == null && params.programEnrollmentName) {
    verifiedRate = await getDocRate("Program Enrollment", params.programEnrollmentName);
  }
  if (verifiedRate == null && params.studentGroupName) {
    verifiedRate = await getStudentGroupRate(params.studentGroupName);
  }
  if (verifiedRate == null && savedOn.length > 0) {
    verifiedRate = params.rate;
  }

  return { savedOn, verifiedRate };
}

export async function resolveStoredO2ORateFromBackend(params: {
  studentId: string;
  program: string;
  studentGroupName?: string;
  fallbackGroupRate?: unknown;
}): Promise<{ rate: number; source: string }> {
  const pe = await getProgramEnrollmentRate({
    studentId: params.studentId,
    studentGroupName: params.studentGroupName,
  });
  if (pe.rate != null) {
    return { rate: resolveO2OHourlyRate(params.program, pe.rate), source: "program-enrollment" };
  }

  if (params.studentGroupName) {
    const groupRate = await getStudentGroupRate(params.studentGroupName);
    if (groupRate != null) {
      return { rate: resolveO2OHourlyRate(params.program, groupRate), source: "student-group" };
    }
  }

  if (params.fallbackGroupRate != null) {
    return { rate: resolveO2OHourlyRate(params.program, params.fallbackGroupRate), source: "group-payload" };
  }

  return { rate: resolveO2OHourlyRate(params.program), source: "default-map" };
}
