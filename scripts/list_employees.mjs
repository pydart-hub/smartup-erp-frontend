// List all employees
const r = await fetch('https://smartup.m.frappe.cloud/api/resource/Employee?fields=["name","employee_name","company"]&limit_page_length=200', {
  headers: { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' }
});
const d = await r.json();
d.data.forEach(e => console.log(e.name, '|', e.employee_name, '|', e.company));
