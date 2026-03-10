/**
 * One-time script: Upload the custom "SmartUp Invoice" Print Format to Frappe.
 * Run with: node scripts/upload-print-format.mjs
 */

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const TOKEN = "token 03330270e330d49:9c2261ae11ac2d2";

const TEMPLATE = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .su-inv { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #333; padding: 0; }
  .su-inv .hdr { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #1e3a5f; padding-bottom: 14px; }
  .su-inv .hdr h1 { font-size: 20px; font-weight: bold; color: #1e3a5f; margin-bottom: 2px; }
  .su-inv .hdr .sub { font-size: 11px; color: #555; margin-bottom: 2px; }
  .su-inv .hdr .contact { font-size: 9px; color: #888; }
  .su-inv .title { text-align: center; font-size: 15px; font-weight: bold; color: #1e3a5f; margin: 14px 0; text-transform: uppercase; letter-spacing: 1px; }
  .su-inv .meta { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .su-inv .meta td { padding: 4px 6px; font-size: 11px; vertical-align: top; }
  .su-inv .meta .lbl { color: #777; width: 115px; }
  .su-inv .meta .val { font-weight: 600; color: #333; }
  .su-inv .itbl { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .su-inv .itbl thead th { background-color: #1e3a5f; color: #fff; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  .su-inv .itbl thead th.r { text-align: right; }
  .su-inv .itbl tbody td { padding: 7px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
  .su-inv .itbl tbody td.r { text-align: right; }
  .su-inv .itbl tfoot td { padding: 8px; font-weight: bold; border-top: 2px solid #1e3a5f; font-size: 12px; }
  .su-inv .itbl tfoot td.r { text-align: right; }
  .su-inv .sbox { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
  .su-inv .sbox.blue { background: #f0f4ff; border-color: #c5cae9; }
  .su-inv .sbox h4 { font-size: 10px; text-transform: uppercase; color: #1e3a5f; margin-bottom: 8px; letter-spacing: 0.5px; font-weight: 700; }
  .su-inv .sbox table { width: 100%; border-collapse: collapse; }
  .su-inv .sbox td { padding: 3px 0; font-size: 10px; }
  .su-inv .sbox td.r { text-align: right; font-weight: 600; }
  .su-inv .sbox .sep { border-top: 1px dashed #ccc; }
  .su-inv .sbox .green { color: #2e7d32; }
  .su-inv .sbox .orange { color: #e65100; }
  .su-inv .sbox .big { font-size: 11px; font-weight: 700; }
  .su-inv .ft { margin-top: 28px; text-align: center; border-top: 1px solid #ddd; padding-top: 14px; }
  .su-inv .ft p { font-size: 9px; color: #999; margin-bottom: 2px; }
  .su-inv .ft .ty { font-size: 10px; color: #555; margin-bottom: 4px; }
</style>

{#- ── Fetch Sales-Order context ───────────────────────── -#}
{%- set so_name = doc.items[0].sales_order if doc.items else None -%}
{%- set so = frappe.get_doc("Sales Order", so_name) if so_name else None -%}
{%- set plan_name  = (so.custom_plan or "Standard") if so else "Standard" -%}
{%- set total_inst = ((so.custom_no_of_instalments or "1") | int) if so else 1 -%}
{%- set acad_year  = (so.custom_academic_year or "") if so else "" -%}
{%- set student_id = (so.student or doc.student or "") if so else (doc.student or "") -%}

{#- ── Sibling invoices for instalment index & totals ──── -#}
{%- set ns = namespace(idx=1, fee=doc.grand_total or 0, outs=doc.outstanding_amount or 0, cnt=1) -%}
{%- if so_name -%}
  {%- set all_si = frappe.get_all("Sales Invoice",
        filters=[
          ["Sales Invoice Item", "sales_order", "=", so_name],
          ["docstatus", "=", 1]
        ],
        fields=["name","grand_total","outstanding_amount","posting_date"],
        order_by="posting_date asc, name asc",
        limit_page_length=100) -%}
  {%- if all_si -%}
    {%- set ns.fee  = 0 -%}
    {%- set ns.outs = 0 -%}
    {%- set ns.cnt  = all_si | length -%}
    {%- for si in all_si -%}
      {%- set ns.fee  = ns.fee  + (si.grand_total or 0) -%}
      {%- set ns.outs = ns.outs + (si.outstanding_amount or 0) -%}
      {%- if si.name == doc.name -%}{%- set ns.idx = loop.index -%}{%- endif -%}
    {%- endfor -%}
  {%- endif -%}
{%- endif -%}
{%- set ns.paid = ns.fee - ns.outs -%}
{%- set inv_paid = (doc.grand_total or 0) - (doc.outstanding_amount or 0) -%}

{#- helper macro for money formatting -#}
{%- macro money(val) -%}{{ frappe.utils.fmt_money(val, currency=doc.currency) }}{%- endmacro -%}

<div class="su-inv">
  <!-- ═══ Company Header ═══ -->
  <div class="hdr">
    <h1>{{ doc.company or "Smart Up Vennala" }}</h1>
    <div class="sub">SmartUp Learning Ventures Private Limited</div>
    <div class="contact">Kochi, Kerala &nbsp;&bull;&nbsp; academiqedullp@gmail.com &nbsp;&bull;&nbsp; +91 81290 35498</div>
  </div>

  <!-- ═══ Title ═══ -->
  <div class="title">
    Tax Invoice
    {%- if total_inst > 1 %} &mdash; Instalment {{ ns.idx }} of {{ total_inst }}{% endif %}
  </div>

  <!-- ═══ Invoice Details ═══ -->
  <table class="meta">
    <tr>
      <td style="width:50%">
        <table>
          <tr><td class="lbl">Invoice No:</td><td class="val">{{ doc.name }}</td></tr>
          <tr><td class="lbl">Date:</td><td class="val">{{ frappe.utils.formatdate(doc.posting_date) }}</td></tr>
          <tr><td class="lbl">Due Date:</td><td class="val">{{ frappe.utils.formatdate(doc.due_date) if doc.due_date else "&mdash;" }}</td></tr>
          {%- if student_id %}
          <tr><td class="lbl">Student ID:</td><td class="val">{{ student_id }}</td></tr>
          {%- endif %}
        </table>
      </td>
      <td style="width:50%">
        <table>
          <tr><td class="lbl">Customer:</td><td class="val">{{ doc.customer_name }}</td></tr>
          <tr><td class="lbl">Student:</td><td class="val">{{ doc.student_name or doc.customer_name }}</td></tr>
          {%- if acad_year %}
          <tr><td class="lbl">Academic Year:</td><td class="val">{{ acad_year }}</td></tr>
          {%- endif %}
          <tr><td class="lbl">Plan:</td><td class="val">{{ plan_name }}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ═══ Items Table ═══ -->
  <table class="itbl">
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Description</th>
        <th class="r" style="width:50px">Qty</th>
        <th class="r" style="width:100px">Rate</th>
        <th class="r" style="width:100px">Amount</th>
      </tr>
    </thead>
    <tbody>
      {%- for item in doc.items %}
      <tr>
        <td>{{ loop.index }}</td>
        <td>{{ item.item_name or item.description }}</td>
        <td class="r">{{ item.qty }}</td>
        <td class="r">{{ money(item.rate) }}</td>
        <td class="r">{{ money(item.amount) }}</td>
      </tr>
      {%- endfor %}
    </tbody>
    <tfoot>
      {%- if doc.total_taxes_and_charges %}
      <tr>
        <td colspan="4" class="r">Taxes &amp; Charges</td>
        <td class="r">{{ money(doc.total_taxes_and_charges) }}</td>
      </tr>
      {%- endif %}
      <tr>
        <td colspan="4" class="r">Grand Total</td>
        <td class="r">{{ money(doc.grand_total) }}</td>
      </tr>
    </tfoot>
  </table>

  <!-- ═══ Summary Boxes ═══ -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
    <tr>
      {%- if total_inst > 1 %}
      <!-- Overall Fee Summary -->
      <td style="width:50%;vertical-align:top;padding-right:6px;">
        <div class="sbox blue">
          <h4>Overall Fee Summary</h4>
          <table>
            <tr><td>Total Course Fee</td><td class="r">{{ money(ns.fee) }}</td></tr>
            <tr><td>Total Paid So Far</td><td class="r green">{{ money(ns.paid) }}</td></tr>
            <tr class="sep">
              <td style="padding-top:5px;font-weight:600">Total Outstanding</td>
              <td class="r big {{ 'orange' if ns.outs > 0 else 'green' }}" style="padding-top:5px">
                {%- if ns.outs > 0 %}{{ money(ns.outs) }}{% else %}All Clear &#10003;{% endif %}
              </td>
            </tr>
          </table>
        </div>
      </td>
      <!-- This Instalment -->
      <td style="width:50%;vertical-align:top;padding-left:6px;">
        <div class="sbox">
          <h4>This Instalment (#{{ ns.idx }})</h4>
          <table>
            <tr><td>Instalment Amount</td><td class="r">{{ money(doc.grand_total) }}</td></tr>
            <tr><td>Paid on Invoice</td><td class="r green">{{ money(inv_paid) }}</td></tr>
            <tr class="sep">
              <td style="padding-top:5px;font-weight:600">Balance</td>
              <td class="r big {{ 'orange' if (doc.outstanding_amount or 0) > 0 else 'green' }}" style="padding-top:5px">
                {%- if (doc.outstanding_amount or 0) > 0 %}{{ money(doc.outstanding_amount) }}{% else %}Fully Paid &#10003;{% endif %}
              </td>
            </tr>
          </table>
        </div>
      </td>
      {%- else %}
      <!-- Single payment — just show paid / balance -->
      <td style="width:50%;">
        <div class="sbox">
          <h4>Payment Summary</h4>
          <table>
            <tr><td>Invoice Amount</td><td class="r">{{ money(doc.grand_total) }}</td></tr>
            <tr><td>Paid</td><td class="r green">{{ money(inv_paid) }}</td></tr>
            <tr class="sep">
              <td style="padding-top:5px;font-weight:600">Balance</td>
              <td class="r big {{ 'orange' if (doc.outstanding_amount or 0) > 0 else 'green' }}" style="padding-top:5px">
                {%- if (doc.outstanding_amount or 0) > 0 %}{{ money(doc.outstanding_amount) }}{% else %}Fully Paid &#10003;{% endif %}
              </td>
            </tr>
          </table>
        </div>
      </td>
      <td style="width:50%;"></td>
      {%- endif %}
    </tr>
  </table>

  <!-- ═══ Footer ═══ -->
  <div class="ft">
    <p class="ty">Thank you for your timely payment!</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
    <p>SmartUp Learning Ventures Pvt. Ltd. &mdash; {{ doc.company or "Smart Up Vennala" }}</p>
  </div>
</div>
`.trim();

async function main() {
  // Update existing Print Format
  const res = await fetch(`${FRAPPE_URL}/api/resource/Print%20Format/SmartUp%20Invoice`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN,
    },
    body: JSON.stringify({ html: TEMPLATE }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Failed:", res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  console.log("✅ Print Format updated:", data.data?.name);

  // Quick test: try downloading a PDF using the new format
  const testInvoice = "ACC-SINV-2026-01703";
  const pdfRes = await fetch(
    `${FRAPPE_URL}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(testInvoice)}&format=SmartUp+Invoice&no_letterhead=1`,
    { headers: { Authorization: TOKEN } }
  );

  if (pdfRes.ok) {
    const buf = await pdfRes.arrayBuffer();
    console.log(`✅ PDF generated successfully (${buf.byteLength} bytes)`);
  } else {
    const text = await pdfRes.text();
    console.error("❌ PDF generation failed:", pdfRes.status, text.substring(0, 500));
  }
}

main().catch(console.error);
