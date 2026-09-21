import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";
const auth = `token ${apiKey}:${apiSecret}`;

const TARGET_GROUPS = ["Test", "Unit Test 1", "Unit Test 2"];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Resilient fetch with exponential backoff for network hiccups or rate limits
async function fetchWithRetry(url, options = {}, retries = 5, backoff = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429) {
        console.warn(`[HTTP ${res.status}] retrying in ${backoff}ms (attempt ${attempt}/${retries})...`);
        await sleep(backoff);
        backoff *= 1.5;
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Network Error: ${err.message}] retrying in ${backoff}ms (attempt ${attempt}/${retries})...`);
      await sleep(backoff);
      backoff *= 1.5;
    }
  }
}

// Concurrency runner
async function runConcurrent(items, fn, concurrency = 8) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function cancelDoc(doctype, name) {
  const res = await fetchWithRetry(`${frappeUrl}/api/method/frappe.client.cancel`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ doctype, name }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (!txt.includes("already cancelled") && !txt.includes("Cannot cancel")) {
      console.warn(`Warning cancelling ${doctype} ${name}: ${txt.slice(0, 100)}`);
    }
  }
}

async function deleteBulk(doctype, names) {
  if (names.length === 0) return;
  const res = await fetchWithRetry(`${frappeUrl}/api/method/frappe.desk.reportview.delete_items`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      doctype,
      items: JSON.stringify(names),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`Warning deleting ${doctype} batch: ${txt.slice(0, 100)}`);
  }
}

async function cleanGroupResults(group) {
  console.log(`\n--- Cleaning Assessment Results for group: [${group}] ---`);
  if (!TARGET_GROUPS.includes(group)) {
    throw new Error(`CRITICAL SECURITY ABORT: Attempted to clean unauthorized group: ${group}`);
  }

  let totalDeleted = 0;
  while (true) {
    const fetchUrl = `${frappeUrl}/api/resource/Assessment%20Result?filters=[["assessment_group","=","${encodeURIComponent(
      group
    )}"]]&fields=["name","docstatus","assessment_group"]&limit_page_length=100`;
    const res = await fetchWithRetry(fetchUrl, { headers: { Authorization: auth } });
    const data = (await res.json()).data || [];

    if (data.length === 0) break;

    // Strict guard check on every single fetched item
    for (const item of data) {
      if (item.assessment_group !== group) {
        throw new Error(
          `CRITICAL SAFETY VIOLATION: Item ${item.name} belongs to group "${item.assessment_group}", expected "${group}". Aborting!`
        );
      }
    }

    const toCancel = data.filter((d) => d.docstatus === 1).map((d) => d.name);
    if (toCancel.length > 0) {
      await runConcurrent(toCancel, (name) => cancelDoc("Assessment Result", name), 8);
    }

    const allNames = data.map((d) => d.name);
    await deleteBulk("Assessment Result", allNames);

    totalDeleted += allNames.length;
    process.stdout.write(`Deleted ${totalDeleted} results for [${group}]...\r`);
    await sleep(200);
  }
  console.log(`\nCompleted results for [${group}]: total deleted in this run = ${totalDeleted}`);
}

async function cleanGroupPlans(group) {
  console.log(`\n--- Cleaning Assessment Plans for group: [${group}] ---`);
  if (!TARGET_GROUPS.includes(group)) {
    throw new Error(`CRITICAL SECURITY ABORT: Unauthorized group: ${group}`);
  }

  const fetchUrl = `${frappeUrl}/api/resource/Assessment%20Plan?filters=[["assessment_group","=","${encodeURIComponent(
    group
  )}"]]&fields=["name","docstatus","assessment_group"]&limit_page_length=500`;
  const res = await fetchWithRetry(fetchUrl, { headers: { Authorization: auth } });
  const data = (await res.json()).data || [];

  console.log(`Found ${data.length} plans to delete for [${group}].`);
  if (data.length === 0) return;

  for (const item of data) {
    if (item.assessment_group !== group) {
      throw new Error(`CRITICAL SAFETY VIOLATION: Plan ${item.name} belongs to "${item.assessment_group}"!`);
    }
  }

  const toCancel = data.filter((d) => d.docstatus === 1).map((d) => d.name);
  if (toCancel.length > 0) {
    await runConcurrent(toCancel, (name) => cancelDoc("Assessment Plan", name), 8);
  }

  const allNames = data.map((d) => d.name);
  for (let i = 0; i < allNames.length; i += 50) {
    const chunk = allNames.slice(i, i + 50);
    await deleteBulk("Assessment Plan", chunk);
    await sleep(150);
  }
  console.log(`Deleted all ${allNames.length} plans for [${group}].`);
}

async function deleteGroupDoc(group) {
  console.log(`Deleting Assessment Group record: [${group}]...`);
  const res = await fetchWithRetry(`${frappeUrl}/api/resource/Assessment%20Group/${encodeURIComponent(group)}`, {
    method: "DELETE",
    headers: { Authorization: auth },
  });
  console.log(`Assessment Group [${group}] delete response:`, res.status);
}

async function main() {
  console.log("Starting resilient targeted exam deletion for:", TARGET_GROUPS);

  for (const group of TARGET_GROUPS) {
    // 1. Delete all Assessment Results
    await cleanGroupResults(group);

    // 2. Delete all Assessment Plans
    await cleanGroupPlans(group);

    // 3. Delete Assessment Group record
    await deleteGroupDoc(group);
  }

  console.log("\n=======================================================");
  console.log("ALL TARGETED EXAMS AND RESULTS CLEANED SUCCESSFULLY!");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
