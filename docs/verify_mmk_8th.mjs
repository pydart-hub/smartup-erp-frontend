const base = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };
async function q(ep) { const r = await fetch(base + ep, { headers }); return (await r.json()).data || []; }

async function main() {
  // 1. Verify Student Group
  const sg = await q('/api/resource/Student%20Group/' + encodeURIComponent('Moolamkuzhi-8th State-A'));
  console.log('=== Student Group ===');
  console.log('Name:', sg.name, '| Program:', sg.program, '| Batch:', sg.batch, '| Year:', sg.academic_year, '| Branch:', sg.custom_branch);

  // 2. Verify Fee Structures
  const params = new URLSearchParams({
    filters: JSON.stringify([["company","=","Smart Up Moolamkuzhi"],["program","=","8th State"]]),
    fields: JSON.stringify(["name","docstatus"]),
    limit_page_length: "50",
    order_by: "name asc"
  });
  const fsList = await q('/api/resource/Fee Structure?' + params);
  console.log('\n=== MMK 8th State Fee Structures ===');
  console.log('Total:', fsList.length);

  for (const f of fsList) {
    const fs = await q('/api/resource/Fee%20Structure/' + encodeURIComponent(f.name));
    const comps = fs.components?.map(c => c.fees_category + '=' + c.amount).join(' + ');
    const total = fs.components?.reduce((s, c) => s + c.amount, 0);
    console.log(`  ${fs.name} | plan=${fs.custom_plan} inst=${fs.custom_no_of_instalments} | docstatus=${fs.docstatus} | ${comps} = ${total}`);
  }

  // 3. Total MMK fee structures
  const allParams = new URLSearchParams({
    filters: JSON.stringify([["company","=","Smart Up Moolamkuzhi"]]),
    fields: JSON.stringify(["name","program"]),
    limit_page_length: "200"
  });
  const allMMK = await q('/api/resource/Fee Structure?' + allParams);
  const byProg = {};
  allMMK.forEach(f => { byProg[f.program] = (byProg[f.program] || 0) + 1; });
  console.log('\n=== All MMK Fee Structures by Program ===');
  for (const [p, c] of Object.entries(byProg).sort()) console.log(`  ${p}: ${c}`);
  console.log(`  TOTAL: ${allMMK.length}`);

  // 4. All MMK Student Groups
  const sgParams = new URLSearchParams({
    filters: JSON.stringify([["name","like","%Moolamkuzhi%"]]),
    fields: JSON.stringify(["name","program"]),
    limit_page_length: "50",
    order_by: "name asc"
  });
  const allSG = await q('/api/resource/Student Group?' + sgParams);
  console.log('\n=== All MMK Student Groups ===');
  allSG.forEach(g => console.log(`  ${g.name} | ${g.program}`));
}
main().catch(console.error);
