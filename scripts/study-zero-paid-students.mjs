const url = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const key = process.env.FRAPPE_API_KEY || '03330270e330d49';
const sec = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function check() {
  // Query all invoices with outstanding_amount == grand_total and status != 'Cancelled'
  // Or query sales invoices grouped by customer where outstanding == grand_total
  const invRes = await fetch(`${url}/api/resource/Sales%20Invoice?filters=${encodeURIComponent(JSON.stringify([
    ['docstatus', '=', 1],
    ['outstanding_amount', '>', 0]
  ]))}&fields=["name","customer","customer_name","company","grand_total","outstanding_amount","posting_date","due_date"]&limit_page_length=500&order_by=outstanding_amount desc`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const invoices = (await invRes.json()).data || [];
  console.log(`Fetched ${invoices.length} outstanding invoices.`);

  // Invoices where nothing was paid (outstanding == grand_total)
  const zeroPaidInvoices = invoices.filter(inv => Math.abs(inv.outstanding_amount - inv.grand_total) < 1);
  console.log(`Invoices with 0 paid: ${zeroPaidInvoices.length}`);
  console.log('Top 5 zero-paid invoices:', zeroPaidInvoices.slice(0, 5));
}
check();
