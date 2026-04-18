$headers = @{ "Authorization" = "token 03330270e330d49:9c2261ae11ac2d2" }
$uri = "https://smartup.m.frappe.cloud/api/resource/Payment%20Entry/ACC-PAY-2026-04397"
$pe = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers
$pe.data | Select-Object name, docstatus, paid_amount, party, reference_no | ConvertTo-Json
