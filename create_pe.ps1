$headers = @{ 
  "Authorization" = "token 03330270e330d49:9c2261ae11ac2d2"
  "Content-Type" = "application/json"
}
$body = @{
  payment_type = "Receive"
  posting_date = "2026-04-17"
  company = "Smart Up Thopumpadi"
  mode_of_payment = "Razorpay"
  party_type = "Customer"
  party = "Anagha vr"
  paid_amount = 2400
  received_amount = 2400
  target_exchange_rate = 1
  source_exchange_rate = 1
  paid_to = "Razorpay - SU THP"
  paid_from = "Debtors - SU THP"
  reference_no = "pay_Sct7PxKu1XInI1"
  reference_date = "2026-04-17"
  references = @(
    @{
      reference_doctype = "Sales Invoice"
      reference_name = "ACC-SINV-2026-03777"
      allocated_amount = 2400
    }
  )
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Method POST -Uri "https://smartup.m.frappe.cloud/api/resource/Payment%20Entry" -Headers $headers -Body $body
$pe = $res.data.name
$sub = Invoke-RestMethod -Method PUT -Uri "https://smartup.m.frappe.cloud/api/resource/Payment%20Entry/$pe" -Headers $headers -Body '{"docstatus": 1}'
Write-Host "RESULT: $($sub.data.name), status: $($sub.data.docstatus)"
