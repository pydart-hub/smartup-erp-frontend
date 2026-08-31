const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function checkDocTypeFields() {
  try {
    const res = await fetch(`${base}/DocType/Sales Invoice`, { headers });
    const data = await res.json();
    const siblingFields = data.data.fields.filter(f => f.fieldname.includes('sibling') || f.fieldname.includes('discount'));
    console.log('Sales Invoice discount fields:', siblingFields.map(f => ({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype })));
    
    const resStud = await fetch(`${base}/DocType/Student`, { headers });
    const studData = await resStud.json();
    const studSiblingFields = studData.data.fields.filter(f => f.fieldname.includes('sibling') || f.fieldname.includes('discount'));
    console.log('Student discount/sibling fields:', studSiblingFields.map(f => ({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype })));
  } catch (e) {
    console.error(e);
  }
}

checkDocTypeFields();
