const url = 'https://smartup.m.frappe.cloud';
const key = '03330270e330d49';
const sec = '9c2261ae11ac2d2';

function parseClassLevel(program, course, studentGroup) {
  const text = `${program || ''} ${course || ''} ${studentGroup || ''}`;
  const match = text.match(/\b(8|9|10)(?:th)?\b/i);
  if (match) return parseInt(match[1], 10);
  return 10;
}

function calculateDiagnosedLevel(score, maxScore, classLevel) {
  if (!maxScore || maxScore <= 0) return '5th';

  if (classLevel === 8) {
    if (maxScore === 15) {
      if (score <= 3) return '5th';
      if (score <= 7) return '6th';
      if (score <= 11) return '7th';
      return '8th';
    }
    if (maxScore === 16) {
      if (score <= 4) return '5th';
      if (score <= 8) return '6th';
      if (score <= 12) return '7th';
      return '8th';
    }
    const idx = Math.min(3, Math.floor((score / maxScore) * 4));
    return ['5th', '6th', '7th', '8th'][idx];
  }

  if (classLevel === 9) {
    if (maxScore === 20 || maxScore === 21) {
      if (score <= 4) return '5th';
      if (score <= 8) return '6th';
      if (score <= 12) return '7th';
      if (score <= 16) return '8th';
      return '9th';
    }
    const idx = Math.min(4, Math.floor((score / maxScore) * 5));
    return ['5th', '6th', '7th', '8th', '9th'][idx];
  }

  // 10th Standard
  if (maxScore === 25) {
    if (score <= 4) return '5th';
    if (score <= 8) return '6th';
    if (score <= 12) return '7th';
    if (score <= 16) return '8th';
    if (score <= 20) return '9th';
    return '10th';
  }
  if (maxScore === 26) {
    if (score <= 4) return '5th';
    if (score <= 8) return '6th';
    if (score <= 13) return '7th';
    if (score <= 17) return '8th';
    if (score <= 21) return '9th';
    return '10th';
  }
  const idx = Math.min(5, Math.floor((score / maxScore) * 6));
  return ['5th', '6th', '7th', '8th', '9th', '10th'][idx];
}

async function run() {
  const headers = {
    Authorization: `token ${key}:${sec}`,
    'Content-Type': 'application/json',
  };

  console.log('Fetching all Diagnosis Exam results across all branches...');
  let start = 0;
  const allResults = [];

  while (true) {
    const res = await fetch(
      `${url}/api/resource/Assessment Result?filters=${encodeURIComponent(
        JSON.stringify([['assessment_group', '=', 'Diagnosis Exam']])
      )}&fields=${encodeURIComponent(
        JSON.stringify([
          'name',
          'student',
          'student_name',
          'program',
          'course',
          'student_group',
          'total_score',
          'maximum_score',
          'custom_diagnosed_level',
        ])
      )}&limit_start=${start}&limit_page_length=1000`,
      { headers }
    );
    const data = await res.json();
    const rows = data.data || [];
    allResults.push(...rows);
    if (rows.length < 1000) break;
    start += rows.length;
  }

  console.log(`Fetched ${allResults.length} records.`);

  const toUpdate = [];
  for (const r of allResults) {
    const classLevel = parseClassLevel(r.program, r.course, r.student_group);
    const target = calculateDiagnosedLevel(r.total_score, r.maximum_score, classLevel);
    if (r.custom_diagnosed_level !== target) {
      toUpdate.push({
        name: r.name,
        targetLevel: target,
      });
    }
  }

  console.log(`Found ${toUpdate.length} records needing updates across all branches.`);

  let successCount = 0;
  let failCount = 0;
  const concurrency = 8;

  for (let i = 0; i < toUpdate.length; i += concurrency) {
    const batch = toUpdate.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const res = await fetch(
            `${url}/api/resource/Assessment Result/${encodeURIComponent(item.name)}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({ custom_diagnosed_level: item.targetLevel }),
            }
          );
          if (res.ok) {
            successCount++;
          } else {
            console.error(`Failed ${item.name}: ${res.status}`);
            failCount++;
          }
        } catch (err) {
          console.error(`Error updating ${item.name}:`, err);
          failCount++;
        }
      })
    );

    if ((i + concurrency) % 100 === 0 || i + concurrency >= toUpdate.length) {
      console.log(
        `Progress: ${Math.min(i + concurrency, toUpdate.length)}/${toUpdate.length} (Success: ${successCount}, Failed: ${failCount})`
      );
    }
  }

  console.log(`Finished! Successfully updated ${successCount} records. Failed: ${failCount}`);
}

run().catch(console.error);
