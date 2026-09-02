const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function updateCustomFieldOptions() {
  // 1. Update Fee Structure-custom_no_of_instalments
  const fsRes = await fetch(`${baseUrl}/api/resource/Custom%20Field/Fee%20Structure-custom_no_of_instalments`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ options: '1\n4\n5\n6\n8' })
  });
  console.log("Updated Fee Structure custom field:", (await fsRes.json()).data?.options);

  // 2. Update Program Enrollment-custom_no_of_instalments
  const peRes = await fetch(`${baseUrl}/api/resource/Custom%20Field/Program%20Enrollment-custom_no_of_instalments`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ options: '\n1\n4\n5\n6\n8' })
  });
  console.log("Updated Program Enrollment custom field:", (await peRes.json()).data?.options);
}

updateCustomFieldOptions();
