const h = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
const base = 'https://smartup.m.frappe.cloud/api';

const kdvUrl = base + '/resource/Fee Structure?filters=' +
  encodeURIComponent(JSON.stringify([['company','=','Smart Up Kadavanthara'],['name','like','%-Advanced-%']])) +
  '&fields=["name","total_amount"]&limit=50';

const edpUrl = base + '/resource/Fee Structure?filters=' +
  encodeURIComponent(JSON.stringify([['company','=','Smart Up Edappally'],['name','like','%-Advanced-%']])) +
  '&fields=["name","total_amount"]&limit=50';

const [rk, re] = await Promise.all([
  fetch(kdvUrl, { headers: h }).then(r => r.json()),
  fetch(edpUrl, { headers: h }).then(r => r.json()),
]);

const kdvDocs = (rk.data || []).sort((a, b) => a.name.localeCompare(b.name));
const edpDocs = (re.data || []).sort((a, b) => a.name.localeCompare(b.name));

console.log(`\nKDV Advanced docs (${kdvDocs.length}):`);
kdvDocs.forEach(d => console.log(`  ${d.name}  total=${d.total_amount}`));

console.log(`\nEDPLY Advanced docs (${edpDocs.length}):`);
edpDocs.forEach(d => console.log(`  ${d.name}  total=${d.total_amount}`));
