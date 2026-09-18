import fs from "fs";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const API_KEY = process.env.FRAPPE_API_KEY || "03330270e330d49";
const API_SECRET = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

// Read logo base64
const logoBuffer = fs.readFileSync("public/smartup-logo-v2.png");
const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

// Define SVG icons for metadata
const docIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
const calendarIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>`;
const userIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
const usersIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`;
const capIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`;
const bookIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>`;
const idCardIcon = `<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:#6c4cb8;display:inline-block;" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.38 0 2.5 1.12 2.5 2.5S13.38 12 12 12s-2.5-1.12-2.5-2.5S10.62 7 12 7zm6 10H6v-.75c0-1.5 3-2.25 6-2.25s6 .75 6 2.25V17z"/></svg>`;

// Modern HTML Template for Frappe Print Format
const templateHtml = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body, .su-receipt {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1f2937;
    background-color: #ffffff;
    font-size: 11px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ═══ Header Banner ═══ */
  .hdr-banner {
    background-color: #58269e !important;
    background: #58269e !important;
    border-radius: 12px 12px 24px 24px;
    padding: 22px 26px;
    color: #ffffff;
    margin-bottom: 20px;
    width: 100%;
  }
  .hdr-top {
    width: 100%;
    border-collapse: collapse;
  }
  .hdr-top td { vertical-align: middle; }
  .logo-img { height: 44px; width: auto; vertical-align: middle; display: inline-block; }
  .brand-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
    display: inline-block;
    vertical-align: middle;
    margin-left: 8px;
    line-height: 1;
  }
  .brand-tagline {
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 2.2px;
    text-transform: uppercase;
    color: #e2d4fa;
    margin-top: 6px;
  }
  .slogan-col {
    text-align: right;
    vertical-align: middle;
  }
  .slogan-text {
    font-family: 'Caveat', cursive, Georgia, serif;
    font-size: 22px;
    color: #ffffff;
    line-height: 1.1;
    display: inline-block;
    text-align: right;
  }

  /* ═══ Top Section (Title + Payment Completed Badge) ═══ */
  .top-section {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  .top-section td { vertical-align: middle; }
  .receipt-heading {
    font-size: 24px;
    font-weight: 800;
    color: #1a1a2e;
    letter-spacing: -0.4px;
  }
  .receipt-heading span.purple-accent {
    color: #58269e;
  }
  .receipt-sub {
    font-size: 11px;
    color: #6b7280;
    margin-top: 3px;
    font-weight: 500;
  }

  /* Completed Badge */
  .badge-card {
    background-color: #f0fdf4 !important;
    border: 1.5px solid #86efac;
    border-radius: 12px;
    padding: 8px 14px;
    display: inline-table;
    float: right;
  }
  .badge-card td { vertical-align: middle; }
  .badge-icon-cell {
    padding-right: 10px;
    width: 32px;
  }
  .badge-icon {
    width: 28px;
    height: 28px;
    line-height: 28px;
    background-color: #16a34a !important;
    border-radius: 50%;
    text-align: center;
    color: #ffffff;
    font-weight: bold;
    font-size: 16px;
  }
  .badge-title {
    font-size: 12px;
    font-weight: 800;
    color: #15803d;
    line-height: 1.2;
  }
  .badge-desc {
    font-size: 9.5px;
    color: #16a34a;
    line-height: 1.2;
  }

  /* ═══ Info Grid Box ═══ */
  .meta-card {
    background-color: #fbfbfe !important;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 16px;
    width: 100%;
    border-collapse: collapse;
  }
  .meta-card td {
    padding: 4px 6px;
    font-size: 10.5px;
    vertical-align: middle;
  }
  .meta-lbl {
    color: #6b7280;
    font-weight: 500;
    width: 110px;
    white-space: nowrap;
  }
  .meta-val {
    font-weight: 700;
    color: #111827;
  }

  /* ═══ Items Table ═══ */
  .tbl-container {
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    margin-bottom: 14px;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
  }
  .items-table th {
    background-color: #58269e !important;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 9px 12px;
    text-align: left;
  }
  .items-table th.r { text-align: right; }
  .items-table td {
    padding: 10px 12px;
    font-size: 11px;
    color: #374151;
    border-bottom: 1px solid #f3f4f6;
  }
  .items-table td.r { text-align: right; font-weight: 600; }
  .items-table tr:last-child td { border-bottom: none; }

  /* Grand Total Bar */
  .grand-total-bar {
    background-color: #f5f1fd !important;
    padding: 10px 14px;
    text-align: right;
    border-radius: 8px;
    margin-bottom: 16px;
    width: 100%;
    border-collapse: collapse;
  }
  .grand-total-label {
    font-size: 13px;
    font-weight: 700;
    color: #4f218e;
    padding-right: 20px;
    text-align: right;
  }
  .grand-total-val {
    font-size: 15px;
    font-weight: 800;
    color: #4f218e;
    text-align: right;
    width: 140px;
  }

  /* ═══ Summary Cards (Two Columns) ═══ */
  .summary-wrap {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  .summary-wrap td {
    vertical-align: top;
  }

  .scard {
    border-radius: 12px;
    padding: 12px 14px;
  }
  .scard.purple {
    background-color: #f8f6fd !important;
    border: 1.5px solid #e7ddfb;
  }
  .scard.green {
    background-color: #f2faf5 !important;
    border: 1.5px solid #bbf7d0;
  }
  .scard-title {
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .scard.purple .scard-title { color: #58269e; }
  .scard.green .scard-title { color: #16a34a; }

  .scard table { width: 100%; border-collapse: collapse; }
  .scard td {
    padding: 3.5px 0;
    font-size: 10.5px;
    color: #4b5563;
  }
  .scard td.r { text-align: right; font-weight: 700; color: #111827; }
  .scard tr.divider td {
    border-top: 1px dashed #cbd5e1;
    padding-top: 6px;
  }
  .scard .paid-color { color: #16a34a; font-weight: 700; }
  .scard .outstanding-color { color: #ea580c; font-weight: 800; font-size: 11.5px; }

  /* ═══ Bottom Greeting & Footer ═══ */
  .bottom-decor {
    margin-top: 14px;
    width: 100%;
    border-collapse: collapse;
  }
  .bottom-decor td { vertical-align: middle; }
  .ty-title {
    font-family: 'Caveat', cursive, Georgia, serif;
    font-size: 28px;
    color: #58269e;
    line-height: 1;
  }
  .ty-subtitle {
    font-family: 'Caveat', cursive, Georgia, serif;
    font-size: 16px;
    color: #7c3aed;
    margin-top: 2px;
  }
  .disclaimer {
    font-size: 8.5px;
    color: #9ca3af;
    margin-top: 6px;
    line-height: 1.35;
  }

  .footer-contact {
    border-top: 1px solid #e5e7eb;
    margin-top: 16px;
    padding-top: 10px;
    width: 100%;
    border-collapse: collapse;
  }
  .footer-contact td {
    font-size: 9px;
    color: #6b7280;
    vertical-align: middle;
  }
  .branch-tag {
    text-align: right;
    font-weight: 700;
    color: #4f218e;
    font-size: 10px;
  }
  .branch-sub {
    font-size: 8.5px;
    color: #9ca3af;
    font-weight: 400;
  }
</style>

{#- ── Sales Order & Instalment Context ───────────────────────── -#}
{%- set so_name = doc.items[0].sales_order if doc.items else None -%}
{%- set so = frappe.get_doc("Sales Order", so_name) if so_name else None -%}
{%- set plan_name = (so.custom_plan or "Standard") if so else "Standard" -%}
{%- set total_inst = ((so.custom_no_of_instalments or "1") | int) if so else 1 -%}
{%- set acad_year = (so.custom_academic_year or "") if so else "" -%}
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
    {%- set ns.fee = 0 -%}
    {%- set ns.outs = 0 -%}
    {%- set ns.cnt = all_si | length -%}
    {%- for si in all_si -%}
      {%- set ns.fee = ns.fee + (si.grand_total or 0) -%}
      {%- set ns.outs = ns.outs + (si.outstanding_amount or 0) -%}
      {%- if si.name == doc.name -%}{%- set ns.idx = loop.index -%}{%- endif -%}
    {%- endfor -%}
  {%- endif -%}
{%- endif -%}
{%- set ns.paid = ns.fee - ns.outs -%}
{%- set inv_paid = (doc.grand_total or 0) - (doc.outstanding_amount or 0) -%}
{%- macro money(val) -%}{{ frappe.utils.fmt_money(val, currency=doc.currency) }}{%- endmacro -%}

<div class="su-receipt">

  <!-- ═══ 1. Purple Header Banner with Watermark & Logo ═══ -->
  <div class="hdr-banner">
    <table class="hdr-top">
      <tr>
        <td style="width: 70%;">
          <table style="border-collapse:collapse;">
            <tr>
              <td>
                <img src="${logoBase64}" class="logo-img" alt="SmartUp" />
              </td>
              <td>
                <span class="brand-title">smartup</span>
              </td>
            </tr>
          </table>
          <div class="brand-tagline">LEARNING FOR A BRIGHTER TOMORROW</div>
        </td>
        <td class="slogan-col" style="width: 30%;">
          <div class="slogan-text">Make<br>Parents<br>Proud</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ═══ 2. Title Section & Completed Badge (NO 'Tax Invoice') ═══ -->
  <table class="top-section">
    <tr>
      <td style="width: 60%;">
        <div class="receipt-heading">
          Installment <span class="purple-accent">{% if total_inst > 1 %}{{ ns.idx }} of {{ total_inst }}{% else %}Receipt{% endif %}</span>
        </div>
        <div class="receipt-sub">SmartUp Learning Ventures Private Limited</div>
      </td>
      <td style="width: 40%;">
        <table class="badge-card">
          <tr>
            <td class="badge-icon-cell">
              <div class="badge-icon">&#10003;</div>
            </td>
            <td>
              <div class="badge-title">Payment Completed</div>
              <div class="badge-desc">Thank you for your timely payment!</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ═══ 3. Meta Details Grid ═══ -->
  <table class="meta-card">
    <tr>
      <td style="width: 50%;">
        <table style="width: 100%;">
          <tr>
            <td class="meta-lbl">${docIcon} Invoice No:</td>
            <td class="meta-val">{{ doc.name }}</td>
          </tr>
          <tr>
            <td class="meta-lbl">${calendarIcon} Invoice Date:</td>
            <td class="meta-val">{{ frappe.utils.formatdate(doc.posting_date) }}</td>
          </tr>
          <tr>
            <td class="meta-lbl">${calendarIcon} Due Date:</td>
            <td class="meta-val">{{ frappe.utils.formatdate(doc.due_date) if doc.due_date else "&mdash;" }}</td>
          </tr>
          {%- if student_id %}
          <tr>
            <td class="meta-lbl">${idCardIcon} Student ID:</td>
            <td class="meta-val">{{ student_id }}</td>
          </tr>
          {%- endif %}
        </table>
      </td>
      <td style="width: 50%;">
        <table style="width: 100%;">
          <tr>
            <td class="meta-lbl">${userIcon} Student Name:</td>
            <td class="meta-val">{{ doc.student_name or doc.customer_name }}</td>
          </tr>
          <tr>
            <td class="meta-lbl">${usersIcon} Customer:</td>
            <td class="meta-val">{{ doc.customer_name }}</td>
          </tr>
          {%- if acad_year %}
          <tr>
            <td class="meta-lbl">${capIcon} Academic Year:</td>
            <td class="meta-val">{{ acad_year }}</td>
          </tr>
          {%- endif %}
          <tr>
            <td class="meta-lbl">${bookIcon} Plan:</td>
            <td class="meta-val">{{ plan_name }}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ═══ 4. Items Table ═══ -->
  <div class="tbl-container">
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35px;">#</th>
          <th>Description</th>
          <th class="r" style="width: 60px;">Qty</th>
          <th class="r" style="width: 95px;">Rate</th>
          <th class="r" style="width: 100px;">Amount</th>
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
    </table>
  </div>

  <!-- Grand Total Bar -->
  <table class="grand-total-bar">
    <tr>
      <td class="grand-total-label">Grand Total</td>
      <td class="grand-total-val">{{ money(doc.grand_total) }}</td>
    </tr>
  </table>

  <!-- ═══ 5. Dual Summary Cards ═══ -->
  <table class="summary-wrap">
    <tr>
      {%- if total_inst > 1 %}
      <!-- Overall Fee Summary -->
      <td style="width: 49%; padding-right: 6px;">
        <div class="scard purple">
          <div class="scard-title">
            ${docIcon} Overall Fee Summary
          </div>
          <table>
            <tr>
              <td>Total Course Fee</td>
              <td class="r">{{ money(ns.fee) }}</td>
            </tr>
            <tr>
              <td>Total Paid So Far</td>
              <td class="r paid-color">{{ money(ns.paid) }}</td>
            </tr>
            <tr class="divider">
              <td style="font-weight: 700;">Total Outstanding</td>
              <td class="r outstanding-color">
                {%- if ns.outs > 0 %}{{ money(ns.outs) }}{% else %}<span class="paid-color">All Clear &#10003;</span>{% endif %}
              </td>
            </tr>
          </table>
        </div>
      </td>
      <!-- This Installment -->
      <td style="width: 49%; padding-left: 6px;">
        <div class="scard green">
          <div class="scard-title">
            ${docIcon} This Installment (#{{ ns.idx }})
          </div>
          <table>
            <tr>
              <td>Installment Amount</td>
              <td class="r">{{ money(doc.grand_total) }}</td>
            </tr>
            <tr>
              <td>Paid on Invoice</td>
              <td class="r paid-color">{{ money(inv_paid) }}</td>
            </tr>
            <tr class="divider">
              <td style="font-weight: 700;">Balance</td>
              <td class="r">
                {%- if (doc.outstanding_amount or 0) > 0 %}
                  <span class="outstanding-color">{{ money(doc.outstanding_amount) }}</span>
                {%- else %}
                  <span class="paid-color">Fully Paid &#10003;</span>
                {%- endif %}
              </td>
            </tr>
          </table>
        </div>
      </td>
      {%- else %}
      <!-- Single Payment Summary -->
      <td style="width: 100%;">
        <div class="scard green">
          <div class="scard-title">${docIcon} Payment Summary</div>
          <table>
            <tr>
              <td>Invoice Amount</td>
              <td class="r">{{ money(doc.grand_total) }}</td>
            </tr>
            <tr>
              <td>Paid</td>
              <td class="r paid-color">{{ money(inv_paid) }}</td>
            </tr>
            <tr class="divider">
              <td style="font-weight: 700;">Balance</td>
              <td class="r">
                {%- if (doc.outstanding_amount or 0) > 0 %}
                  <span class="outstanding-color">{{ money(doc.outstanding_amount) }}</span>
                {%- else %}
                  <span class="paid-color">Fully Paid &#10003;</span>
                {%- endif %}
              </td>
            </tr>
          </table>
        </div>
      </td>
      {%- endif %}
    </tr>
  </table>

  <!-- ═══ 6. Thank You & Cap Graphic ═══ -->
  <table class="bottom-decor">
    <tr>
      <td style="width: 70px; vertical-align: top; padding-right: 12px;">
        <svg style="width: 60px; height: 50px;" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,15 90,32 50,48 10,32" fill="#7539c3"/>
          <polygon points="50,18 86,32 50,46 14,32" fill="#8b5cf6"/>
          <path d="M28 39v18c0 7 10 13 22 13s22-6 22-13V39" fill="#58269e"/>
          <path d="M85 34v25" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="85" cy="61" r="3" fill="#ec4899"/>
        </svg>
      </td>
      <td>
        <div class="ty-title">Thank You!</div>
        <div class="ty-subtitle">for your timely payment!</div>
        <div class="disclaimer">
          This is a computer-generated invoice and does not require a signature.<br>
          SmartUp Learning Ventures Pvt. Ltd. &mdash; {{ doc.company or "Smart Up Kadavanthara" }}
        </div>
      </td>
    </tr>
  </table>

  <!-- ═══ 7. Footer Contact Bar ═══ -->
  <table class="footer-contact">
    <tr>
      <td style="width: 60%;">
        &#x1F4CD; Kochi, Kerala &nbsp;&bull;&nbsp;
        &#x2709; academiqedullp@gmail.com &nbsp;&bull;&nbsp;
        &#x260E; +91 81290 35498
      </td>
      <td class="branch-tag" style="width: 40%;">
        {{ doc.company or "Smart Up Kadavanthara" }}<br>
        <span class="branch-sub">SmartUp Learning Ventures Private Limited</span>
      </td>
    </tr>
  </table>

</div>
`;

// Update Frappe Cloud Print Format
async function updateFrappePrintFormat() {
  console.log("Updating Print Format 'SmartUp Invoice' on Frappe Cloud...");
  const res = await fetch(`${FRAPPE_URL}/api/resource/Print Format/SmartUp Invoice`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${API_KEY}:${API_SECRET}`,
    },
    body: JSON.stringify({
      html: templateHtml,
    }),
  });

  console.log("Update status:", res.status);
  const data = await res.json();
  if (res.ok) {
    console.log("Print Format updated successfully!");
  } else {
    console.error("Failed to update print format:", data);
  }
}

updateFrappePrintFormat();
