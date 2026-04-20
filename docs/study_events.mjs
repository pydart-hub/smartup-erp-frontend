const BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

// 1. Find all Course Schedules with custom_event_type set
const fields = [
  "name", "custom_branch", "title", "schedule_date", "from_time", "to_time",
  "custom_event_type", "custom_event_title",
  "course", "student_group", "instructor", "instructor_name",
  "custom_topic", "custom_topic_covered", "room", "class_schedule_color",
].join('","');

const filters = encodeURIComponent(JSON.stringify([["custom_event_type", "!=", ""]]));
const fieldParam = encodeURIComponent(`["${fields}"]`);

const res = await get(`/api/resource/Course%20Schedule?filters=${filters}&fields=${fieldParam}&limit_page_length=100`);

console.log("\n=== EVENTS COUNT:", res.data?.length ?? 0, "===\n");

if (res.data?.length) {
  // Show all distinct event types
  const types = [...new Set(res.data.map(e => e.custom_event_type))];
  console.log("Distinct event types:", types);

  // Show all fields present on first record
  console.log("\n--- First record (all fields) ---");
  console.log(JSON.stringify(res.data[0], null, 2));

  // Show summary of all events
  console.log("\n--- All events summary ---");
  res.data.forEach((e, i) => {
    console.log(`[${i+1}] ${e.schedule_date} | ${e.custom_event_type} | title="${e.custom_event_title || e.title}" | group=${e.student_group} | instructor=${e.instructor_name} | branch=${e.branch} | covered=${e.custom_topic_covered}`);
  });
} else {
  console.log("No events found. Checking raw response:");
  console.log(JSON.stringify(res, null, 2));
}

// 2. Also check what fields the Course Schedule doctype has
console.log("\n=== Checking Course Schedule meta for event-related fields ===");
const meta = await get("/api/resource/DocType/Course%20Schedule");
const eventFields = (meta.data?.fields || []).filter(f =>
  f.fieldname.includes("event") || f.fieldname.includes("title")
);
console.log("Event-related fields in doctype:");
eventFields.forEach(f => console.log(`  ${f.fieldname} (${f.fieldtype}) — label: "${f.label}"`));
