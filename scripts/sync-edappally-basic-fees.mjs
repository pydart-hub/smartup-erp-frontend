const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = {
  Authorization: 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
};

const COMPANY = 'Smart Up Edappally';
const ACADEMIC_YEAR = '2026-2027';
const ADMISSION_FEE = 1000;

// Workbook-provided Basic pricing for Edappally/Kadavanthara standard programs.
const TARGETS = [
  {
    program: '9th CBSE',
    classKey: '9 Cbse',
    totals: { 1: 28500, 4: 29500, 6: 30200, 8: 31000 },
    feeCategory: '9th CBSE Tuition Fee',
  },
  {
    program: '10th State',
    classKey: '10 State',
    totals: { 1: 23000, 4: 21800, 6: 24400, 8: 25000 },
    feeCategory: '10th State Tuition Fee',
  },
  {
    program: '10th CBSE',
    classKey: '10 Cbse',
    totals: { 1: 28500, 4: 29500, 6: 30200, 8: 31000 },
    feeCategory: '10th CBSE Tuition Fee',
  },
  {
    program: '11th Science State',
    classKey: 'Plus One',
    totals: { 1: 33000, 4: 31300, 6: 36100, 8: 37000 },
    feeCategory: '11th Science State Tuition Fee',
  },
  {
    program: '11th Science CBSE',
    classKey: 'Plus One',
    totals: { 1: 33000, 4: 31300, 6: 36100, 8: 37000 },
    feeCategory: '11th Science CBSE Tuition Fee',
  },
  {
    program: '12th Science State',
    classKey: 'Plus Two',
    totals: { 1: 33000, 4: 31300, 6: 36100, 8: 37000 },
    feeCategory: '12th Science State Tuition Fee',
  },
  {
    program: '12th Science CBSE',
    classKey: 'Plus Two',
    totals: { 1: 33000, 4: 31300, 6: 36100, 8: 37000 },
    feeCategory: '12th Science CBSE Tuition Fee',
  },
];

const APPLY = process.argv.includes('--apply');

async function apiGet(endpoint) {
  const response = await fetch(BASE + endpoint, { headers: HEADERS });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`GET ${endpoint} -> ${response.status}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function apiPut(endpoint, body) {
  const response = await fetch(BASE + endpoint, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`PUT ${endpoint} -> ${response.status}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function apiPost(endpoint, body) {
  const response = await fetch(BASE + endpoint, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`POST ${endpoint} -> ${response.status}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

function buildDesired(doc, targetTotal, feeCategory) {
  const tuitionAmount = targetTotal - ADMISSION_FEE;
  const components = (doc.components || []).map((component) => {
    if (component.fees_category === 'Admission Fee') {
      return {
        ...component,
        amount: ADMISSION_FEE,
        total: ADMISSION_FEE,
      };
    }

    if (component.fees_category === feeCategory || component.item === feeCategory) {
      return {
        ...component,
        fees_category: feeCategory,
        item: feeCategory,
        amount: tuitionAmount,
        total: tuitionAmount,
      };
    }

    return component;
  });

  const hasAdmission = components.some((component) => component.fees_category === 'Admission Fee');
  const hasTuition = components.some((component) => component.fees_category === feeCategory || component.item === feeCategory);

  if (!hasTuition) {
    components.unshift({
      doctype: 'Fee Component',
      fees_category: feeCategory,
      item: feeCategory,
      amount: tuitionAmount,
      total: tuitionAmount,
      discount: 0,
    });
  }

  if (!hasAdmission) {
    components.push({
      doctype: 'Fee Component',
      fees_category: 'Admission Fee',
      item: 'Admission Fee',
      amount: ADMISSION_FEE,
      total: ADMISSION_FEE,
      discount: 0,
    });
  }

  return {
    total_amount: targetTotal,
    components,
  };
}

function printPlanLine(doc, targetTotal) {
  const current = Number(doc.total_amount || 0);
  const delta = targetTotal - current;
  console.log(`${doc.name} | ${doc.program} | ${doc.custom_plan}-${doc.custom_no_of_instalments} | ${current} -> ${targetTotal} | delta ${delta}`);
}

function buildCreatePayload(doc, targetTotal, feeCategory) {
  const desired = buildDesired(doc, targetTotal, feeCategory);
  return {
    doctype: 'Fee Structure',
    program: doc.program,
    academic_year: doc.academic_year,
    academic_term: doc.academic_term,
    company: doc.company,
    receivable_account: doc.receivable_account,
    cost_center: doc.cost_center,
    naming_series: doc.naming_series,
    custom_plan: doc.custom_plan,
    custom_no_of_instalments: doc.custom_no_of_instalments,
    custom_branch_abbr: doc.custom_branch_abbr,
    components: desired.components.map((component) => ({
      doctype: 'Fee Component',
      fees_category: component.fees_category,
      item: component.item,
      amount: component.amount,
      discount: component.discount ?? 0,
      total: component.total,
    })),
  };
}

async function main() {
  console.log('AUDIT RUN — previewing Edappally Basic Fee Structure deltas');

  if (APPLY) {
    console.log('Live update disabled: submitted Fee Structure totals reject API mutation after submit, and this script only audits the gap.');
  }

  let found = 0;
  let skipped = 0;

  for (const target of TARGETS) {
    for (const [instalments, targetTotal] of Object.entries(target.totals)) {
      const params = new URLSearchParams({
        filters: JSON.stringify([
          ['company', '=', COMPANY],
          ['academic_year', '=', ACADEMIC_YEAR],
          ['program', '=', target.program],
          ['custom_plan', '=', 'Basic'],
          ['custom_no_of_instalments', '=', String(instalments)],
        ]),
        fields: JSON.stringify(['name', 'total_amount', 'modified']),
        order_by: 'modified desc',
        limit_page_length: '20',
      });

      const matches = await apiGet(`/api/resource/Fee Structure?${params.toString()}`);
      if (!Array.isArray(matches) || matches.length < 1) {
        throw new Error(`Expected at least one Fee Structure for ${target.program} Basic-${instalments}, found ${Array.isArray(matches) ? matches.length : 0}`);
      }

      const exactMatch = matches.find((match) => Number(match.total_amount || 0) === targetTotal);
      if (exactMatch) {
        console.log(`${exactMatch.name} | ${target.program} | Basic-${instalments} | already at ${targetTotal}`);
        skipped += 1;
        continue;
      }

      const doc = await apiGet(`/api/resource/Fee Structure/${encodeURIComponent(matches[0].name)}`);
      found += 1;
      printPlanLine(doc, targetTotal);

      if (!APPLY) {
        console.log('  target differs from live submitted Fee Structure');
        continue;
      }

      console.log('  apply skipped: live submitted Fee Structure is immutable through this API');
    }
  }

  console.log(`Checked ${found} Fee Structures.`);
  console.log(`Already matching ${skipped} Fee Structures.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});