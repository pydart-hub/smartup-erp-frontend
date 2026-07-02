import https from "https";

// Ignore self-signed SSL certificate warnings for Nginx loopback
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = 8443;
const HOST_HEADER = "smartuplearning.net";
const BASE_URL = `https://${TARGET_HOST}:${TARGET_PORT}`;

// The publishing ID for "Class 8 Biology Diagnosis Exam" which we verified exists
const PUBLISHING_ID = "0e24bd16-b8cf-40a5-a5aa-db9547cc31bf";

// Configuration
const TOTAL_USERS = 700;
const BATCH_SIZE = 50; // Run 50 concurrent users at a time to prevent local connection exhaustion
const DELAY_BETWEEN_BATCHES_MS = 200;

// Stats collection
const stats = {
  activeExams: { success: 0, fail: 0, latencies: [] },
  history: { success: 0, fail: 0, latencies: [] },
  start: { success: 0, fail: 0, latencies: [] },
  attemptPage: { success: 0, fail: 0, latencies: [] },
  saveAnswers: { success: 0, fail: 0, latencies: [] },
  submit: { success: 0, fail: 0, latencies: [] },
};

// HTTP request helper utilizing Host header and keepalive
function makeRequest(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const data = body ? JSON.stringify(body) : "";

    const headers = {
      Host: HOST_HEADER,
      "Content-Type": "application/json",
      ...extraHeaders,
    };

    if (body) {
      headers["Content-Length"] = Buffer.byteLength(data);
    }

    const req = https.request(
      {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: path,
        method: method,
        headers: headers,
        agent: new https.Agent({ keepAlive: true, maxSockets: 100 }),
      },
      (res) => {
        let bodyText = "";
        res.on("data", (chunk) => {
          bodyText += chunk;
        });
        res.on("end", () => {
          const duration = Date.now() - start;
          const ok = res.statusCode >= 200 && res.statusCode < 400;
          let parsed = null;
          if (ok && res.headers["content-type"]?.includes("application/json")) {
            try {
              parsed = JSON.parse(bodyText);
            } catch (e) {}
          }
          resolve({ ok, statusCode: res.statusCode, duration, parsed, headers: res.headers });
        });
      }
    );

    req.on("error", (err) => {
      resolve({ ok: false, statusCode: 0, duration: Date.now() - start, error: err.message });
    });

    if (body) {
      req.write(data);
    }
    req.end();
  });
}

function calculateMetrics(latencies) {
  if (latencies.length === 0) return { avg: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const max = sorted[sorted.length - 1];
  return { avg, p50, p95, max };
}

async function simulateStudent(userIndex) {
  const phone = `90999${String(userIndex).padStart(5, "0")}`; // Unique 10 digit phone
  const studentName = `LoadTest Student ${userIndex}`;

  // 1. Fetch active exams
  const activeRes = await makeRequest("GET", `/api/public-exam/active?classLevel=8`);
  if (activeRes.ok) {
    stats.activeExams.success++;
    stats.activeExams.latencies.push(activeRes.duration);
  } else {
    stats.activeExams.fail++;
    return; // Stop flow on failure
  }

  // 2. Fetch history
  const historyRes = await makeRequest("GET", `/api/public-exam/history?phone=${phone}`);
  if (historyRes.ok) {
    stats.history.success++;
    stats.history.latencies.push(historyRes.duration);
  } else {
    stats.history.fail++;
    return;
  }

  // 3. Start exam
  const startRes = await makeRequest("POST", `/api/public-exam/start`, {
    studentName,
    studentBranch: "Kadavanthara",
    studentPhone: phone,
    classLevel: "8",
    publishingId: PUBLISHING_ID,
  });
  
  let attemptId, sessionToken;
  if (startRes.ok && startRes.parsed) {
    stats.start.success++;
    stats.start.latencies.push(startRes.duration);
    attemptId = startRes.parsed.attemptId;
    sessionToken = startRes.parsed.sessionToken;
  } else {
    stats.start.fail++;
    return;
  }

  // Extract session token from cookie if needed
  const cookieHeader = startRes.headers["set-cookie"]?.[0] || "";
  const cookieValue = cookieHeader.split(";")[0] || "";

  // 4. Load attempt page (triggers server-side render DB lookup)
  const pageRes = await makeRequest("GET", `/exam-site/attempt/${attemptId}`, null, {
    Cookie: cookieValue,
  });
  if (pageRes.ok) {
    stats.attemptPage.success++;
    stats.attemptPage.latencies.push(pageRes.duration);
  } else {
    stats.attemptPage.fail++;
    return;
  }

  // 5. Save answers (debounced batch save)
  const saveRes = await makeRequest(
    "POST",
    `/api/public-exam/attempt/${attemptId}/answers`,
    {
      answers: [
        { questionId: "dummy-q-id-1", selectedOption: "A" },
        { questionId: "dummy-q-id-2", selectedOption: "C" },
      ],
    },
    {
      Cookie: cookieValue,
      "x-exam-session-token": sessionToken,
    }
  );
  if (saveRes.ok) {
    stats.saveAnswers.success++;
    stats.saveAnswers.latencies.push(saveRes.duration);
  } else {
    stats.saveAnswers.fail++;
    return;
  }

  // 6. Submit exam
  const submitRes = await makeRequest(
    "POST",
    `/api/public-exam/attempt/${attemptId}/submit`,
    { autoSubmitted: false },
    {
      Cookie: cookieValue,
      "x-exam-session-token": sessionToken,
    }
  );
  if (submitRes.ok) {
    stats.submit.success++;
    stats.submit.latencies.push(submitRes.duration);
  } else {
    stats.submit.fail++;
  }
}

async function runLoadTest() {
  console.log(`=========================================`);
  console.log(`🚀 Starting Load Test: Simulating ${TOTAL_USERS} Users`);
  console.log(`   Target: ${BASE_URL} (Host: ${HOST_HEADER})`);
  console.log(`   Batch Size: ${BATCH_SIZE} | Delay: ${DELAY_BETWEEN_BATCHES_MS}ms`);
  console.log(`=========================================\n`);

  const startTime = Date.now();
  let completed = 0;

  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
    const batchPromises = [];
    const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_USERS - i);

    for (let j = 0; j < currentBatchSize; j++) {
      const userIndex = i + j + 1;
      batchPromises.push(simulateStudent(userIndex));
    }

    await Promise.all(batchPromises);
    completed += currentBatchSize;
    process.stdout.write(`Processed ${completed}/${TOTAL_USERS} students...\r`);
    
    if (i + BATCH_SIZE < TOTAL_USERS) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ Load Test Completed in ${totalTimeSec} seconds!`);
  console.log(`=========================================`);
  console.log(`📊 PERFORMANCE REPORT (LATENCIES IN MS)`);
  console.log(`=========================================`);

  const endpoints = [
    { name: "1. GET Active Exams   ", data: stats.activeExams },
    { name: "2. GET Student History ", data: stats.history },
    { name: "3. POST Start Exam     ", data: stats.start },
    { name: "4. GET Attempt Page    ", data: stats.attemptPage },
    { name: "5. POST Save Answers   ", data: stats.saveAnswers },
    { name: "6. POST Submit Exam    ", data: stats.submit },
  ];

  console.log(
    `Endpoint               | Success | Fail | Avg (ms) | P50 (ms) | P95 (ms) | Max (ms)`
  );
  console.log(
    `-----------------------+---------+------+----------+----------+----------+---------`
  );

  for (const ep of endpoints) {
    const { avg, p50, p95, max } = calculateMetrics(ep.data.latencies);
    console.log(
      `${ep.name} | ${String(ep.data.success).padEnd(7)} | ${String(ep.data.fail).padEnd(4)} | ${String(avg).padEnd(8)} | ${String(p50).padEnd(8)} | ${String(p95).padEnd(8)} | ${max}`
    );
  }
  console.log(`=========================================\n`);
}

runLoadTest().catch(console.error);
