#!/usr/bin/env node

import https from 'https';

const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    
    const options = {
      hostname: 'smartup.m.frappe.cloud',
      path: `/api/resource${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function checkStudent(studentId) {
  try {
    const result = await makeRequest('GET', `/Student/${studentId}`);
    return { exists: true, data: result.data };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkPE(studentId) {
  try {
    const result = await makeRequest('GET', `/Program%20Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","docstatus"]&limit_page_length=10`);
    return result.data || [];
  } catch (err) {
    console.error(`Error checking PE for ${studentId}:`, err.message);
    return [];
  }
}

async function main() {
  const targets = ['THP-056', 'FKO-124', 'KDV-006', 'KDV-004', 'VYT-039'];
  
  console.log('=== Checking Target Students ===\n');
  
  for (const id of targets) {
    console.log(`\n${id}:`);
    
    // Check if student exists
    const student = await checkStudent(id);
    if (student.exists) {
      console.log(`  ✅ Student exists: ${student.data.student_name}`);
    } else {
      console.log(`  ❌ Student NOT found: ${student.error}`);
      continue;
    }
    
    // Check if PE exists
    const pes = await checkPE(id);
    if (pes.length > 0) {
      for (const pe of pes) {
        const status = pe.docstatus === 1 ? 'SUBMITTED' : pe.docstatus === 0 ? 'DRAFT' : 'CANCELLED';
        console.log(`  PE found: ${pe.name} (${status})`);
      }
    } else {
      console.log(`  ⚠️  No PE found`);
    }
  }
}

main().catch(console.error);
